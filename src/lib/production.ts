import { prisma } from './prisma'
import { Prisma, ProductionSource } from '@prisma/client'

export async function getProductionRecords(millId: string) {
    return prisma.productionRecord.findMany({
        where: { millId },
        orderBy: { productionDate: 'desc' },
    })
}

export async function getProductionRecord(id: string) {
    return prisma.productionRecord.findUnique({ where: { id } })
}

export async function createProductionRecord(data: {
    millId: string
    recordedById: string
    productionDate: Date
    ffbReceivedMt: Prisma.Decimal | number
    cpoProducedMt: Prisma.Decimal | number
    pkoProducedMt: Prisma.Decimal | number
    notes?: string
}) {
    return prisma.productionRecord.create({
        data: {
            ...data,
            ffbReceivedMt: new Prisma.Decimal(data.ffbReceivedMt),
            cpoProducedMt: new Prisma.Decimal(data.cpoProducedMt),
            pkoProducedMt: new Prisma.Decimal(data.pkoProducedMt),
            source: ProductionSource.MANUAL,
        },
    })
}

// Derived metrics helpers (computed, not stored)
export function calcOer(ffb: Prisma.Decimal, cpo: Prisma.Decimal): number {
    if (ffb.isZero()) return 0
    return cpo.div(ffb).mul(100).toDecimalPlaces(2).toNumber()
}

export function calcKer(ffb: Prisma.Decimal, pko: Prisma.Decimal): number {
    if (ffb.isZero()) return 0
    return pko.div(ffb).mul(100).toDecimalPlaces(2).toNumber()
}
