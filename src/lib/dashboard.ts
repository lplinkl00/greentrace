import { prisma } from './prisma'
import { AuditStatus, ChecklistItemStatus, ChecklistStatus } from '@prisma/client'

// --- Aggregator / Portfolio Stats ---
export async function getPortfolioStats() {
    const totalMills = await prisma.mill.count()

    // Certified mills (have at least one CERTIFIED checklist)
    const certifiedMills = await prisma.mill.count({
        where: {
            checklists: { some: { status: ChecklistStatus.CERTIFIED } }
        }
    })

    const activeAuditsCount = await prisma.audit.count({
        where: {
            status: { in: [AuditStatus.SCHEDULED, AuditStatus.IN_PROGRESS, AuditStatus.FINDINGS_REVIEW] }
        }
    })

    const openFindingsCount = await prisma.auditFinding.count({
        where: {
            findingType: { in: ['NON_CONFORMANT_MAJOR', 'NON_CONFORMANT_MINOR'] },
            // Only count findings from audits that aren't withdrawn
            checklistItem: {
                checklist: {
                    audits: { some: { status: { not: AuditStatus.WITHDRAWN } } }
                }
            }
        }
    })

    // Calculate total GHG across all CERTIFIED checklists
    const allCertifiedChecklists = await prisma.checklist.findMany({
        where: { status: ChecklistStatus.CERTIFIED },
        include: {
            items: {
                include: {
                    dataEntries: {
                        where: { emissionFactorId: { not: null } },
                        select: { valueConverted: true }
                    }
                }
            }
        }
    })

    let totalGhg = 0
    for (const c of allCertifiedChecklists) {
        for (const i of c.items) {
            for (const e of i.dataEntries) {
                totalGhg += e.valueConverted?.toNumber() ?? 0
            }
        }
    }

    // Timeline data (mills with their cert expiry dates based on their latest CERTIFIED checklist)
    const timelineData = await prisma.mill.findMany({
        include: {
            checklists: {
                where: { status: ChecklistStatus.CERTIFIED },
                orderBy: { periodEnd: 'desc' },
                take: 1
            }
        }
    })

    const expiryTimeline = timelineData.map(mill => {
        const latestCert = mill.checklists[0]
        return {
            millId: mill.id,
            millName: mill.name,
            latestCertEnd: latestCert ? latestCert.periodEnd : null,
            regulation: latestCert ? latestCert.regulation : null
        }
    }).filter(m => m.latestCertEnd !== null)
        .sort((a, b) => a.latestCertEnd!.getTime() - b.latestCertEnd!.getTime())

    return {
        totalMills,
        certifiedMills,
        activeAuditsCount,
        openFindingsCount,
        totalGhgKgCo2e: totalGhg,
        expiryTimeline
    }
}

// --- Mill Stats ---
export async function getMillStats(millId: string) {
    // Get the most recent active/submitted checklist (or certified if none active)
    const latestChecklist = await prisma.checklist.findFirst({
        where: { millId },
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
            reconciliationAcknowledgedAt: null
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
    const activeAudits = await prisma.audit.findMany({
        where: {
            auditorId,
            status: { in: [AuditStatus.SCHEDULED, AuditStatus.IN_PROGRESS, AuditStatus.FINDINGS_REVIEW] }
        },
        include: { mill: { select: { name: true } } },
        orderBy: { conductedDate: 'asc' }
    })

    const auditsDueSoon = activeAudits.filter(a => {
        if (!a.conductedDate) return false
        const diffDays = (a.conductedDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)
        return diffDays >= 0 && diffDays <= 14
    })

    // Reports that need review/finalisation (DRAFT state)
    const reportsToFinalise = await prisma.auditReport.findMany({
        where: {
            status: 'DRAFT',
            audit: { auditorId }
        },
        // Only get the latest version per audit
        orderBy: { version: 'desc' },
        distinct: ['auditId'],
        include: {
            audit: { include: { mill: true } }
        }
    })

    const totalFindings = await prisma.auditFinding.count({
        where: {
            checklistItem: {
                checklist: {
                    audits: { some: { auditorId, status: { not: AuditStatus.WITHDRAWN } } }
                }
            }
        }
    })

    return {
        activeAuditsCount: activeAudits.length,
        auditsDueSoon: auditsDueSoon.map(a => ({
            id: a.id,
            millName: a.mill.name,
            regulation: a.regulation,
            conductedDate: a.conductedDate,
            status: a.status
        })),
        reportsToFinalise: reportsToFinalise.map(r => ({
            id: r.id,
            auditId: r.auditId,
            millName: r.audit.mill.name,
            version: r.version,
            generatedAt: r.generatedAt
        })),
        totalFindings
    }
}
