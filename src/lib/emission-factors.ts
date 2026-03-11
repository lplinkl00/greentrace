import { prisma } from './prisma'
import { MaterialType, GHGScope } from '@prisma/client'

// ─── Emission Factor CRUD ────────────────────────────────────────────

export async function getEmissionFactors(filters?: {
    materialType?: MaterialType
    scope?: GHGScope
    includeExpired?: boolean
}) {
    const where: any = {}
    if (filters?.materialType) where.materialType = filters.materialType
    if (filters?.scope) where.scope = filters.scope
    if (!filters?.includeExpired) {
        where.OR = [
            { validTo: null },
            { validTo: { gte: new Date() } },
        ]
    }

    return prisma.emissionFactor.findMany({
        where,
        orderBy: [{ materialType: 'asc' }, { scope: 'asc' }, { createdAt: 'desc' }],
    })
}

export async function getEmissionFactorById(id: string) {
    return prisma.emissionFactor.findUnique({ where: { id } })
}

export async function createEmissionFactor(data: {
    name: string
    materialType: MaterialType
    scope: GHGScope
    unitInput: string
    unitReference: string
    factorValue: number
    source: string
    validFrom: Date
    validTo?: Date | null
    isDefault?: boolean
}) {
    return prisma.emissionFactor.create({ data: data as any })
}

export async function updateEmissionFactor(
    id: string,
    data: Partial<{
        name: string
        factorValue: number
        source: string
        validTo: Date | null
        isDefault: boolean
    }>
) {
    return prisma.emissionFactor.update({ where: { id }, data: data as any })
}

// ─── Expiry Guard ────────────────────────────────────────────

export function assertFactorNotExpired(factor: { validTo: Date | null }) {
    if (factor.validTo !== null && new Date(factor.validTo) < new Date()) {
        throw new Error('EMISSION_FACTOR_EXPIRED')
    }
}

// ─── Default Factor Lookup ────────────────────────────────────────────

export async function findDefaultFactor(materialType: MaterialType) {
    return prisma.emissionFactor.findFirst({
        where: {
            materialType,
            isDefault: true,
            OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
        },
    })
}
