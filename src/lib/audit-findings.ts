import { FindingType, FindingStatus, UserRole } from '@prisma/client'
import { prisma } from './prisma'

export interface FindingInput {
    checklistItemId: string
    findingType: FindingType
    evidenceReviewed: string
    correctiveActionRequired?: string
    correctiveActionDeadline?: Date
    findingStatus?: FindingStatus
}

/**
 * Create or update a finding for one (auditId, checklistItemId) pair.
 * The schema has @@unique([auditId, checklistItemId]) so this is an idempotent upsert.
 */
export async function upsertFinding(
    auditId: string,
    input: FindingInput
) {
    return prisma.auditFinding.upsert({
        where: {
            auditId_checklistItemId: {
                auditId,
                checklistItemId: input.checklistItemId,
            },
        },
        create: {
            auditId,
            checklistItemId: input.checklistItemId,
            findingType: input.findingType,
            evidenceReviewed: input.evidenceReviewed,
            correctiveActionRequired: input.correctiveActionRequired,
            correctiveActionDeadline: input.correctiveActionDeadline,
            findingStatus: input.findingStatus ?? FindingStatus.OPEN,
        },
        update: {
            findingType: input.findingType,
            evidenceReviewed: input.evidenceReviewed,
            correctiveActionRequired: input.correctiveActionRequired,
            correctiveActionDeadline: input.correctiveActionDeadline,
            findingStatus: input.findingStatus ?? FindingStatus.OPEN,
        },
    })
}

/**
 * Batch upsert multiple findings in a single transaction.
 */
export async function bulkUpdateFindings(
    auditId: string,
    findings: FindingInput[]
) {
    return prisma.$transaction(
        findings.map((f) =>
            prisma.auditFinding.upsert({
                where: {
                    auditId_checklistItemId: {
                        auditId,
                        checklistItemId: f.checklistItemId,
                    },
                },
                create: {
                    auditId,
                    checklistItemId: f.checklistItemId,
                    findingType: f.findingType,
                    evidenceReviewed: f.evidenceReviewed,
                    correctiveActionRequired: f.correctiveActionRequired,
                    correctiveActionDeadline: f.correctiveActionDeadline,
                    findingStatus: f.findingStatus ?? FindingStatus.OPEN,
                },
                update: {
                    findingType: f.findingType,
                    evidenceReviewed: f.evidenceReviewed,
                    correctiveActionRequired: f.correctiveActionRequired,
                    correctiveActionDeadline: f.correctiveActionDeadline,
                    findingStatus: f.findingStatus ?? FindingStatus.OPEN,
                },
            })
        )
    )
}

/**
 * Get findings for an audit, with access gating:
 * - COMPANY_STAFF and COMPANY_MANAGER: only if audit is PUBLISHED.
 * - Auditor, Aggregator, Super Admin: always.
 */
export async function getFindingsForAudit(
    auditId: string,
    role: UserRole
) {
    const companyRoles: UserRole[] = [UserRole.COMPANY_STAFF, UserRole.COMPANY_MANAGER]

    if (companyRoles.includes(role)) {
        const audit = await prisma.audit.findUnique({ where: { id: auditId }, select: { status: true } })
        if (!audit || audit.status !== 'PUBLISHED') {
            return [] // Gate: hide until published
        }
    }

    return prisma.auditFinding.findMany({
        where: { auditId },
        include: {
            checklistItem: { include: { requirement: true } },
            documents: true,
        },
        orderBy: { createdAt: 'asc' },
    })
}

/**
 * Delete a single finding — effectively "un-assesses" that item.
 */
export async function deleteFinding(id: string) {
    return prisma.auditFinding.delete({ where: { id } })
}
