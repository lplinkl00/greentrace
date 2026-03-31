import { prisma } from './prisma'
import { AuditStatus, ChecklistItemStatus, ChecklistStatus } from '@prisma/client'

// --- Aggregator / Portfolio Stats ---
export async function getPortfolioStats() {
    const [
        totalCompanies,
        certifiedCompanies,
        activeAuditsCount,
        openFindingsCount,
        ghgResult,
        timelineData,
    ] = await Promise.all([
        prisma.company.count(),

        prisma.company.count({
            where: { checklists: { some: { status: ChecklistStatus.CERTIFIED } } }
        }),

        prisma.audit.count({
            where: {
                status: { in: [AuditStatus.SCHEDULED, AuditStatus.IN_PROGRESS, AuditStatus.FINDINGS_REVIEW] }
            }
        }),

        prisma.auditFinding.count({
            where: {
                findingType: { in: ['NON_CONFORMANT_MAJOR', 'NON_CONFORMANT_MINOR'] },
                checklistItem: {
                    checklist: {
                        audits: { some: { status: { not: AuditStatus.WITHDRAWN } } }
                    }
                }
            }
        }),

        // DB-level aggregate instead of loading all items into memory
        prisma.dataEntry.aggregate({
            _sum: { valueConverted: true },
            where: {
                emissionFactorId: { not: null },
                checklistItem: { checklist: { status: ChecklistStatus.CERTIFIED } }
            }
        }),

        prisma.company.findMany({
            include: {
                checklists: {
                    where: { status: ChecklistStatus.CERTIFIED },
                    orderBy: { periodEnd: 'desc' },
                    take: 1
                }
            }
        }),
    ])

    const expiryTimeline = timelineData
        .map(company => {
            const latestCert = company.checklists[0]
            return {
                companyId: company.id,
                companyName: company.name,
                latestCertEnd: latestCert ? latestCert.periodEnd : null,
                regulation: latestCert ? latestCert.regulation : null,
            }
        })
        .filter(m => m.latestCertEnd !== null)
        .sort((a, b) => a.latestCertEnd!.getTime() - b.latestCertEnd!.getTime())

    return {
        totalCompanies,
        certifiedCompanies,
        activeAuditsCount,
        openFindingsCount,
        totalGhgKgCo2e: ghgResult._sum.valueConverted?.toNumber() ?? 0,
        expiryTimeline,
    }
}

// --- Company Stats ---
export async function getCompanyStats(companyId: string) {
    // Get the most recent active/submitted checklist (or certified if none active)
    const latestChecklist = await prisma.checklist.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        include: {
            items: {
                include: {
                    requirement: {
                        include: { category: { include: { pillar: true } } }
                    },
                    dataEntries: {
                        where: { emissionFactorId: { not: null } },
                        select: { valueConverted: true }
                    }
                }
            },
            massBalanceEntries: true
        }
    })

    if (!latestChecklist) return null

    // Item Progress by Pillar
    const progressByPillar: Record<string, { total: number; completed: number }> = {}
    let totalGhg = 0
    let totalItems = 0
    let completedItems = 0

    for (const item of latestChecklist.items) {
        const pillarName = item.requirement.category.pillar.name
        if (!progressByPillar[pillarName]) progressByPillar[pillarName] = { total: 0, completed: 0 }

        progressByPillar[pillarName].total++
        totalItems++

        if (item.status === ChecklistItemStatus.COMPLETE) {
            progressByPillar[pillarName].completed++
            completedItems++
        }

        for (const entry of item.dataEntries) {
            totalGhg += entry.valueConverted?.toNumber() ?? 0
        }
    }

    // Mass balance and reconciliation
    const mbEntries = latestChecklist.massBalanceEntries.length
    const mbDiscrepancies = latestChecklist.massBalanceEntries.filter(m => m.discrepancyFlag).length

    // Reconciliation alerts from DataEntries
    const unacknowledgedAlerts = await prisma.dataEntry.count({
        where: {
            checklistItem: { checklistId: latestChecklist.id },
            reconciliationFlag: true,
            reconciliationAcknowledgedAt: null,
        }
    })

    return {
        checklistId: latestChecklist.id,
        periodStart: latestChecklist.periodStart,
        periodEnd: latestChecklist.periodEnd,
        regulation: latestChecklist.regulation,
        status: latestChecklist.status,
        progress: {
            totalItems,
            completedItems,
            byPillar: Object.entries(progressByPillar).map(([name, stats]) => ({
                pillar: name,
                ...stats,
                percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
            }))
        },
        ghgTotalKgCo2e: totalGhg,
        massBalance: {
            totalEntries: mbEntries,
            discrepancies: mbDiscrepancies
        },
        reconciliationAlerts: unacknowledgedAlerts
    }
}

// --- Auditor Stats ---
export async function getAuditorStats(auditorId: string) {
    const [activeAudits, reportsToFinalise, totalFindings] = await Promise.all([
        prisma.audit.findMany({
            where: {
                auditorId,
                status: { in: [AuditStatus.SCHEDULED, AuditStatus.IN_PROGRESS, AuditStatus.FINDINGS_REVIEW] }
            },
            include: { company: { select: { name: true } } },
            orderBy: { conductedDate: 'asc' }
        }),

        prisma.auditReport.findMany({
            where: { status: 'DRAFT', audit: { auditorId } },
            orderBy: { version: 'desc' },
            distinct: ['auditId'],
            include: { audit: { include: { company: true } } }
        }),

        prisma.auditFinding.count({
            where: {
                checklistItem: {
                    checklist: {
                        audits: { some: { auditorId, status: { not: AuditStatus.WITHDRAWN } } }
                    }
                }
            }
        }),
    ])

    const auditsDueSoon = activeAudits.filter(a => {
        if (!a.conductedDate) return true  // no scheduled date → always show in queue
        const diffDays = (a.conductedDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)
        return diffDays <= 14  // include past-due AND upcoming within 14 days
    })

    return {
        activeAuditsCount: activeAudits.length,
        auditsDueSoon: auditsDueSoon.map(a => ({
            id: a.id,
            companyName: a.company.name,
            regulation: a.regulation,
            conductedDate: a.conductedDate,
            status: a.status
        })),
        reportsToFinalise: reportsToFinalise.map(r => ({
            id: r.id,
            auditId: r.auditId,
            companyName: r.audit.company.name,
            version: r.version,
            generatedAt: r.generatedAt
        })),
        totalFindings
    }
}
