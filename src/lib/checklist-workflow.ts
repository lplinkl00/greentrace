import { ChecklistStatus, UserRole } from '@prisma/client'
import { prisma } from './prisma'
import { logActivity } from './activity-log'
import { createNotification } from './notifications'

/**
 * Validates if a checklist is ready for submission (DRAFT -> UNDER_REVIEW).
 * MB-4: All opening stocks must be confirmed.
 * DA-2: No unallocated shipments with >0 volume.
 * REC-2: No unacknowledged data entries.
 */
export async function validateChecklistSubmission(id: string) {
    const checklist = await prisma.checklist.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    dataEntries: true
                }
            },
            massBalanceEntries: true,
            company: true
        }
    })

    if (!checklist) throw new Error('Checklist not found')

    const errors: string[] = []

    // MB-4 rule
    const unconfirmedStocks = checklist.massBalanceEntries.filter(mb => mb.openingStockConfirmedAt === null)
    if (unconfirmedStocks.length > 0) {
        errors.push(`MB-4 Flag: ${unconfirmedStocks.length} mass balance Opening Stocks remain unconfirmed.`)
    }

    // REC-2 rule
    const unacknowledgedFlags = checklist.items.flatMap(item =>
        item.dataEntries.filter(entry =>
            entry.reconciliationFlag === true && entry.reconciliationAcknowledgedAt === null
        )
    )
    if (unacknowledgedFlags.length > 0) {
        errors.push(`REC-2 Flag: ${unacknowledgedFlags.length} data entries have unacknowledged >2% discrepancies.`)
    }

    // DA-2: fetch unallocated shipments scoped to this period at DB level
    const unallocatedShipments = await prisma.shipment.findMany({
        where: {
            companyId: checklist.companyId,
            isccAllocationPct: null,
            shipmentDate: {
                gte: checklist.periodStart,
                lte: checklist.periodEnd,
            },
        },
        select: { id: true },
    })
    if (unallocatedShipments.length > 0) {
        errors.push(`DA-2 Flag: ${unallocatedShipments.length} shipments strictly during this period require double-accounting allocation confirmation.`)
    }

    // Optional rule: all ChecklistItems must be Complete or N/A (Standard rule)
    const incompleteItems = checklist.items.filter(item =>
        item.status === 'NOT_STARTED' || item.status === 'IN_PROGRESS'
    )
    if (incompleteItems.length > 0) {
        errors.push(`${incompleteItems.length} Checklist Items are not yet COMPLETE or NOT_APPLICABLE.`)
    }

    return {
        isValid: errors.length === 0,
        errors
    }
}

export async function submitChecklist(id: string, userId: string) {
    const validation = await validateChecklistSubmission(id)
    if (!validation.isValid) {
        throw new Error('Checklist failed submission validation: ' + validation.errors.join(' | '))
    }

    const checklist = await prisma.checklist.update({
        where: { id, status: 'DRAFT' },
        data: { status: 'UNDER_REVIEW' },
        include: { company: true }
    })

    await logActivity({
        actorId: userId,
        entityId: id,
        entityType: 'CHECKLIST',
        action: 'STATUS_CHANGED',
        reason: 'User submitted checklist',
        metadata: { from: 'DRAFT', to: 'UNDER_REVIEW' }
    })

    // Find Aggregator Managers for this company's org to notify
    const managers = await prisma.user.findMany({
        where: { role: 'AGGREGATOR_MANAGER', organisationId: checklist.company.organisationId }
    })

    for (const mgr of managers) {
        await createNotification({
            userId: mgr.id,
            message: `Company ${checklist.company.name} has submitted a checklist for review.`
        })
    }

    return checklist
}

export async function returnChecklistToCompany(id: string, userId: string, reason: string) {
    if (!reason || reason.trim() === '') throw new Error('A reason is required to return to company.')

    const checklist = await prisma.checklist.update({
        where: { id, status: 'UNDER_REVIEW' },
        data: { status: 'DRAFT' },
        include: { company: true }
    })

    await logActivity({
        actorId: userId,
        entityId: id,
        entityType: 'CHECKLIST',
        action: 'RETURNED_TO_COMPANY',
        reason: reason,
        metadata: { reason }
    })

    // Notify Company Managers
    const managers = await prisma.user.findMany({
        where: { role: 'COMPANY_MANAGER', companyId: checklist.companyId }
    })

    for (const mgr of managers) {
        await createNotification({
            userId: mgr.id,
            message: `A checklist for your company was returned by the aggregator. Reason: ${reason}`
        })
    }

    return checklist
}

export async function sendToAudit(id: string, userId: string, auditorId: string) {
    // Note: Creating the actual Audit record belongs in an `audits.ts` service, 
    // but we stub the status transition here atomically for Phase 6.

    const checklist = await prisma.$transaction(async (tx) => {
        const updated = await tx.checklist.update({
            where: { id, status: 'UNDER_REVIEW' },
            data: { status: 'UNDER_AUDIT' },
            include: { company: true }
        })

        await tx.audit.create({
            data: {
                checklistId: updated.id,
                companyId: updated.companyId,
                auditorId: auditorId,
                auditType: 'INITIAL',
                status: 'SCHEDULED',
                regulation: updated.regulation,
                periodStart: updated.periodStart,
                periodEnd: updated.periodEnd
            }
        })

        // Log it
        await tx.activityLog.create({
            data: {
                actorId: userId,
                entityId: id,
                entityType: 'CHECKLIST',
                action: 'SENT_TO_AUDIT',
                reason: 'Aggregator sent to external audit',
            }
        })

        return updated
    })

    // Notify the auditor
    await createNotification({
        userId: auditorId,
        message: `You have been assigned an audit for ${checklist.company.name}.`
    })

    // Notify the Company Managers
    const managers = await prisma.user.findMany({
        where: { role: 'COMPANY_MANAGER', companyId: checklist.companyId }
    })
    for (const mgr of managers) {
        await createNotification({
            userId: mgr.id,
            message: `Your checklist has been sent to the external auditor.`
        })
    }

    return checklist
}

export async function forceChecklistStatus(id: string, status: ChecklistStatus, reason: string, userId: string) {
    const checklist = await prisma.checklist.update({
        where: { id },
        data: { status },
    })

    await logActivity({
        actorId: userId,
        entityId: id,
        entityType: 'CHECKLIST',
        action: 'STATUS_FORCED',
        reason: reason,
        metadata: { newStatus: status, reason }
    })

    return checklist
}
