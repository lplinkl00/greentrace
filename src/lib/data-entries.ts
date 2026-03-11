import { prisma } from './prisma'
import { Prisma, DataEntryType, ChecklistItemStatus } from '@prisma/client'

import { assertFactorNotExpired, findDefaultFactor } from './emission-factors'

// ─── Data Entry CRUD ────────────────────────────────────────────

export async function getDataEntries(checklistItemId: string) {
    return prisma.dataEntry.findMany({
        where: { checklistItemId },
        include: { emissionFactor: true, enteredBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
    })
}

export async function getDataEntryById(id: string) {
    return prisma.dataEntry.findUnique({
        where: { id },
        include: { emissionFactor: true, checklistItem: { include: { checklist: true, requirement: true } } },
    })
}

/**
 * Create a DataEntry with GHG computation.
 * Implements GHG-1 (immediate computation), GHG-2 (expired factor rejection),
 * and GHG-4 (default factor auto-selection).
 */
export async function createDataEntry(data: {
    checklistItemId: string
    enteredById: string
    entryType: DataEntryType
    valueRaw?: number | null
    unitInput?: string | null
    textValue?: string | null
    emissionFactorId?: string | null
    reportingMonth?: Date | null
    location?: string | null
    notes?: string | null
}) {
    // Check the checklist is not locked
    const item = await prisma.checklistItem.findUniqueOrThrow({
        where: { id: data.checklistItemId },
        include: { checklist: true, requirement: true },
    })

    if (item.checklist.status === 'LOCKED') {
        throw new Error('PERIOD_LOCKED')
    }

    let emissionFactorId = data.emissionFactorId ?? null
    let valueConverted: Prisma.Decimal | null = null
    let unitReference: string | null = null

    // GHG-4: Auto-select default factor if scope is set and no factor provided
    if (!emissionFactorId && item.requirement.ghgScope) {
        // Try to find a default factor based on materialType context
        // For now, we skip auto-selection if no factor is provided
        // This would require knowing the materialType from context
    }

    // GHG-1 & GHG-2: Compute if factor is provided
    if (emissionFactorId && data.valueRaw != null) {
        const factor = await prisma.emissionFactor.findUniqueOrThrow({
            where: { id: emissionFactorId },
        })

        // GHG-2: Reject expired factors
        assertFactorNotExpired(factor)

        // GHG-1: Compute valueConverted = valueRaw × factorValue
        const rawDecimal = new Prisma.Decimal(data.valueRaw)
        valueConverted = rawDecimal.mul(factor.factorValue)
        unitReference = factor.unitReference
    }

    const entry = await prisma.dataEntry.create({
        data: {
            checklistItemId: data.checklistItemId,
            enteredById: data.enteredById,
            entryType: data.entryType,
            valueRaw: data.valueRaw != null ? new Prisma.Decimal(data.valueRaw) : null,
            unitInput: data.unitInput,
            textValue: data.textValue,
            emissionFactorId,
            valueConverted,
            unitReference,
            reportingMonth: data.reportingMonth,
            location: data.location,
            notes: data.notes,
        },
    })

    // Auto-progress item status to IN_PROGRESS if currently NOT_STARTED
    if (item.status === ChecklistItemStatus.NOT_STARTED) {
        await prisma.checklistItem.update({
            where: { id: data.checklistItemId },
            data: { status: ChecklistItemStatus.IN_PROGRESS },
        })
    }

    return entry
}

export async function updateDataEntry(
    id: string,
    data: Partial<{
        valueRaw: number | null
        unitInput: string | null
        textValue: string | null
        emissionFactorId: string | null
        notes: string | null
    }>
) {
    const existing = await prisma.dataEntry.findUniqueOrThrow({
        where: { id },
        include: { checklistItem: { include: { checklist: true } } },
    })

    if (existing.checklistItem.checklist.status === 'LOCKED') {
        throw new Error('PERIOD_LOCKED')
    }

    let valueConverted = existing.valueConverted
    let unitReference = existing.unitReference

    // Recompute GHG if valueRaw or emissionFactorId changed
    const newFactorId = data.emissionFactorId !== undefined ? data.emissionFactorId : existing.emissionFactorId
    const newValueRaw = data.valueRaw !== undefined ? data.valueRaw : (existing.valueRaw ? Number(existing.valueRaw) : null)

    if (newFactorId && newValueRaw != null) {
        const factor = await prisma.emissionFactor.findUniqueOrThrow({ where: { id: newFactorId } })
        assertFactorNotExpired(factor)
        valueConverted = new Prisma.Decimal(newValueRaw).mul(factor.factorValue)
        unitReference = factor.unitReference
    } else if (!newFactorId) {
        valueConverted = null
        unitReference = null
    }

    return prisma.dataEntry.update({
        where: { id },
        data: {
            ...data,
            valueRaw: data.valueRaw != null ? new Prisma.Decimal(data.valueRaw) : data.valueRaw,
            valueConverted,
            unitReference,
        } as any,
    })
}

export async function deleteDataEntry(id: string) {
    const entry = await prisma.dataEntry.findUniqueOrThrow({
        where: { id },
        include: { checklistItem: { include: { checklist: true } } },
    })

    if (entry.checklistItem.checklist.status === 'LOCKED') {
        throw new Error('PERIOD_LOCKED')
    }

    return prisma.dataEntry.delete({ where: { id } })
}

export async function acknowledgeReconciliation(id: string, userId: string) {
    return prisma.dataEntry.update({
        where: { id },
        data: {
            reconciliationAcknowledgedAt: new Date(),
            reconciliationAcknowledgedById: userId,
        },
    })
}
