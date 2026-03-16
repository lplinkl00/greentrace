import { AuditStatus, ChecklistStatus, UserRole } from '@prisma/client'
import { prisma } from './prisma'
import { logActivity } from './activity-log'

/**
 * Returns audits for the requesting user.
 * - AUDITOR: only their own assigned audits
 * - AGGREGATOR_MANAGER / SUPER_ADMIN: all audits
 */
export async function getAuditsForUser(userId: string, role: UserRole) {
    const where = role === UserRole.AUDITOR ? { auditorId: userId } : {}

    return prisma.audit.findMany({
        where,
        include: {
            company: { select: { id: true, name: true, code: true } },
            checklist: { select: { id: true, status: true } },
            findings: { select: { id: true, findingStatus: true } },
        },
        orderBy: { createdAt: 'desc' },
    })
}

/**
 * Get a single audit by ID with access control.
 * AUDITOR may only see their own; Aggregator+ sees all.
 */
export async function getAuditById(id: string, userId: string, role: UserRole) {
    const audit = await prisma.audit.findUnique({
        where: { id },
        include: {
            company: true,
            checklist: {
                include: {
                    items: {
                        include: {
                            requirement: true,
                            auditFindings: true,
                        },
                    },
                },
            },
            findings: {
                include: {
                    checklistItem: {
                        include: { requirement: true },
                    },
                    documents: true,
                },
            },
        },
    })

    if (!audit) return null

    if (role === UserRole.AUDITOR && audit.auditorId !== userId) {
        throw new Error('Access denied: audit is not assigned to you.')
    }

    return audit
}

/**
 * Progress the audit status.
 * Valid transitions:
 *   SCHEDULED → IN_PROGRESS (auditor sets conductedDate)
 *   IN_PROGRESS → FINDINGS_REVIEW
 */
export async function updateAuditStatus(
    id: string,
    newStatus: AuditStatus,
    userId: string,
    scheduledDate?: Date,
    conductedDate?: Date
) {
    const audit = await prisma.audit.update({
        where: { id },
        data: {
            status: newStatus,
            ...(scheduledDate && { scheduledDate }),
            ...(conductedDate && { conductedDate }),
        },
    })

    await logActivity({
        actorId: userId,
        entityId: id,
        entityType: 'AUDIT',
        action: 'STATUS_CHANGED',
        reason: `Status updated to ${newStatus}`,
        metadata: { newStatus },
    })

    return audit
}

/**
 * Publish an audit. Atomic transaction:
 * 1. Set Audit.status = PUBLISHED, set Audit.publishedAt
 * 2. Set Checklist.status = CERTIFIED
 * 3. Update Mill certification status field for the regulation
 */
export async function publishAudit(id: string, userId: string) {
    const result = await prisma.$transaction(async (tx) => {
        const audit = await tx.audit.findUnique({
            where: { id },
            include: { checklist: true, company: true },
        })

        if (!audit) throw new Error('Audit not found')
        if (audit.status !== AuditStatus.FINDINGS_REVIEW) {
            throw new Error(`Cannot publish: audit must be in FINDINGS_REVIEW, not ${audit.status}`)
        }

        // 1. Publish the audit
        const published = await tx.audit.update({
            where: { id },
            data: {
                status: AuditStatus.PUBLISHED,
                publishedAt: new Date(),
            },
        })

        // 2. Certify the checklist
        await tx.checklist.update({
            where: { id: audit.checklistId },
            data: { status: ChecklistStatus.CERTIFIED },
        })

        // 3. Update Company cert status for this regulation
        const certStatusField = regulationCertField(audit.regulation)
        if (certStatusField) {
            await tx.company.update({
                where: { id: audit.companyId },
                data: {
                    [certStatusField]: 'Certified',
                },
            })
        }

        // 4. Log it
        await tx.activityLog.create({
            data: {
                actorId: userId,
                entityId: id,
                entityType: 'AUDIT',
                action: 'AUDIT_PUBLISHED',
                reason: 'Auditor published the audit report.',
            },
        })

        return published
    })

    return result
}

function regulationCertField(regulation: string): string | null {
    const map: Record<string, string> = {
        ISCC_EU: 'isccEuCertStatus',
        ISCC_PLUS: 'isccPlusCertStatus',
        RSPO_PC: 'rspoPcCertStatus',
        RSPO_SCCS: 'rspoSccsCertStatus',
    }
    return map[regulation] ?? null
}
