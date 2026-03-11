import { prisma } from './prisma'
import { Prisma, MaterialType, UserRole } from '@prisma/client'


export async function getMassBalanceEntries(checklistId: string) {
    return prisma.massBalanceEntry.findMany({
        where: { checklistId },
        orderBy: { materialType: 'asc' },
    })
}

export async function getMassBalanceEntryById(id: string) {
    return prisma.massBalanceEntry.findUnique({
        where: { id },
        include: { checklist: true },
    })
}

export async function updateMassBalanceEntry(
    id: string,
    userId: string,
    userRole: UserRole,
    data: Partial<{
        certifiedIn: number
        nonCertifiedIn: number
        certifiedOut: number
        nonCertifiedOut: number
        discrepancyNotes: string
    }>
) {
    const existing = await prisma.massBalanceEntry.findUniqueOrThrow({
        where: { id },
        include: { checklist: true },
    })

    if (existing.checklist.status === 'LOCKED') {
        throw new Error('PERIOD_LOCKED')
    }

    const certifiedIn = data.certifiedIn !== undefined ? new Prisma.Decimal(data.certifiedIn) : existing.certifiedIn
    const certifiedOut = data.certifiedOut !== undefined ? new Prisma.Decimal(data.certifiedOut) : existing.certifiedOut
    const openingStock = existing.openingStock

    // MB-1: Certified output cap
    const maxOut = openingStock.add(certifiedIn)
    let discrepancyFlag = existing.discrepancyFlag
    let discrepancyOverriddenById = existing.discrepancyOverriddenById
    let discrepancyOverriddenAt = existing.discrepancyOverriddenAt
    let discrepancyNotes = data.discrepancyNotes !== undefined ? data.discrepancyNotes : existing.discrepancyNotes

    if (certifiedOut.greaterThan(maxOut)) {
        discrepancyFlag = true

        // Only allow save if Aggregator+ AND provide notes
        const isAggregator = userRole === UserRole.AGGREGATOR_MANAGER || userRole === UserRole.SUPER_ADMIN
        if (!isAggregator || !discrepancyNotes) {
            throw new Error('MASS_BALANCE_OVERSCHEDULE')
        }

        // Since aggregator provided notes, mark as overridden
        discrepancyOverriddenById = userId
        discrepancyOverriddenAt = new Date()
    } else {
        // Flag cleared
        discrepancyFlag = false
        discrepancyOverriddenById = null
        discrepancyOverriddenAt = null
        discrepancyNotes = null
    }

    // MB-2: Closing stock
    const closingStock = openingStock.add(certifiedIn).sub(certifiedOut)

    const updateData: any = {
        certifiedIn,
        certifiedOut,
        closingStock,
        discrepancyFlag,
        discrepancyNotes,
        discrepancyOverriddenById,
        discrepancyOverriddenAt,
    }

    if (data.nonCertifiedIn !== undefined) updateData.nonCertifiedIn = new Prisma.Decimal(data.nonCertifiedIn)
    if (data.nonCertifiedOut !== undefined) updateData.nonCertifiedOut = new Prisma.Decimal(data.nonCertifiedOut)

    return prisma.massBalanceEntry.update({
        where: { id },
        data: updateData,
    })
}

export async function confirmOpeningStock(id: string, userId: string) {
    const existing = await prisma.massBalanceEntry.findUniqueOrThrow({
        where: { id },
        include: { checklist: true },
    })

    // MB-4 validation is at checklist submission, but openingStock must be confirmed here
    if (existing.checklist.status === 'LOCKED') {
        throw new Error('PERIOD_LOCKED')
    }

    return prisma.massBalanceEntry.update({
        where: { id },
        data: {
            openingStockConfirmed: true,
            openingStockConfirmedAt: new Date(),
            openingStockConfirmedById: userId,
        },
    })
}

export async function overrideDiscrepancy(id: string, userId: string, notes: string) {
    const existing = await prisma.massBalanceEntry.findUniqueOrThrow({
        where: { id },
        include: { checklist: true },
    })

    if (existing.checklist.status === 'LOCKED') {
        throw new Error('PERIOD_LOCKED')
    }

    return prisma.massBalanceEntry.update({
        where: { id },
        data: {
            discrepancyFlag: true, // Remains true, but is now overridden
            discrepancyNotes: notes,
            discrepancyOverriddenById: userId,
            discrepancyOverriddenAt: new Date(),
        },
    })
}
