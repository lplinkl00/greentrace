import { prisma } from './prisma'
import { Prisma, ShipmentDirection, MaterialType, CertificationStatus, ShipmentSource } from '@prisma/client'


export async function getShipments(filters: {
    millId: string
    year?: string
    month?: string
    materialType?: MaterialType
    direction?: ShipmentDirection
}) {
    const where: any = { millId: filters.millId }

    if (filters.materialType) where.materialType = filters.materialType
    if (filters.direction) where.direction = filters.direction

    if (filters.year && filters.month) {
        const start = new Date(`${filters.year}-${filters.month}-01`)
        const end = new Date(start)
        end.setMonth(start.getMonth() + 1)
        where.shipmentDate = { gte: start, lt: end }
    } else if (filters.year) {
        const start = new Date(`${filters.year}-01-01`)
        const end = new Date(`${filters.year}-12-31T23:59:59.999Z`)
        where.shipmentDate = { gte: start, lte: end }
    }

    return prisma.shipmentRecord.findMany({
        where,
        orderBy: { shipmentDate: 'desc' },
    })
}

export async function getShipmentById(id: string) {
    return prisma.shipmentRecord.findUnique({ where: { id } })
}

export async function createShipment(data: {
    millId: string
    direction: ShipmentDirection
    materialType: MaterialType
    volumeMt: number
    certificationStatus: CertificationStatus
    counterpartyName: string
    referenceNumber: string
    shipmentDate: Date
    sustainabilityDeclarationNumber?: string
    ghgValueKgco2e?: number
}) {
    return prisma.shipmentRecord.create({
        data: {
            ...data,
            source: ShipmentSource.MANUAL,
        } as any,
    })
}

export async function updateShipment(
    id: string,
    data: Partial<{
        volumeMt: number
        certificationStatus: CertificationStatus
        counterpartyName: string
        referenceNumber: string
        shipmentDate: Date
        sustainabilityDeclarationNumber: string
        ghgValueKgco2e: number
    }>
) {
    return prisma.shipmentRecord.update({
        where: { id },
        data: data as any,
    })
}

export async function deleteShipment(id: string) {
    return prisma.shipmentRecord.delete({ where: { id } })
}

/**
 * DA-3: Allocation confirmation
 * Validates pct sum = 100, then sets allocationConfirmedAt.
 */
export async function confirmAllocation(
    id: string,
    userId: string,
    pcts: { isccAllocationPct: number; rspoAllocationPct: number }
) {
    const sum = pcts.isccAllocationPct + pcts.rspoAllocationPct
    if (Math.abs(sum - 100) > 0.01) { // Floating point tolerance
        throw new Error('ALLOCATION_TOTAL_NOT_100')
    }

    return prisma.shipmentRecord.update({
        where: { id },
        data: {
            isccAllocationPct: new Prisma.Decimal(pcts.isccAllocationPct),
            rspoAllocationPct: new Prisma.Decimal(pcts.rspoAllocationPct),
            allocationConfirmedAt: new Date(),
            allocationConfirmedById: userId,
        },
    })
}
