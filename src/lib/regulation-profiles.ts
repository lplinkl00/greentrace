import { prisma } from './prisma'
import { RegulationCode } from '@prisma/client'

// ─── Regulation Profiles ────────────────────────────────────────────────────

export async function getProfiles(regulation?: RegulationCode) {
    return prisma.regulationProfile.findMany({
        where: { regulation: regulation || undefined },
        orderBy: { createdAt: 'desc' },
        include: {
            _count: { select: { pillars: true } },
        },
    })
}

export async function getProfileById(id: string) {
    return prisma.regulationProfile.findUnique({
        where: { id },
        include: {
            pillars: {
                orderBy: { displayOrder: 'asc' },
                include: {
                    categories: {
                        orderBy: { displayOrder: 'asc' },
                        include: {
                            requirements: {
                                where: { isActive: true },
                                orderBy: { displayOrder: 'asc' },
                            },
                        },
                    },
                },
            },
        },
    })
}

export async function createProfile(data: {
    regulation: RegulationCode
    version: string
    name: string
    description?: string
}) {
    return prisma.regulationProfile.create({ data })
}

export async function updateProfile(
    id: string,
    data: Partial<{ name: string; description: string; isActive: boolean }>
) {
    return prisma.regulationProfile.update({ where: { id }, data })
}

// ─── Pillars ────────────────────────────────────────────────────

export async function createPillar(profileId: string, data: {
    code: string
    name: string
    displayOrder?: number
}) {
    return prisma.requirementPillar.create({ data: { profileId, ...data } })
}

export async function updatePillar(
    pillarId: string,
    data: Partial<{ code: string; name: string; displayOrder: number }>
) {
    return prisma.requirementPillar.update({ where: { id: pillarId }, data })
}

// ─── Categories ────────────────────────────────────────────────────

export async function createCategory(pillarId: string, data: {
    code: string
    name: string
    displayOrder?: number
}) {
    return prisma.requirementCategory.create({ data: { pillarId, ...data } })
}

export async function updateCategory(
    categoryId: string,
    data: Partial<{ code: string; name: string; displayOrder: number }>
) {
    return prisma.requirementCategory.update({ where: { id: categoryId }, data })
}

// ─── Requirements ────────────────────────────────────────────────────

export async function createRequirement(categoryId: string, data: {
    code: string
    name: string
    description: string
    guidanceText?: string
    dataType: string
    requiresForm?: boolean
    criticality?: string
    ghgScope?: string
    displayOrder?: number
    unit?: string
}) {
    return prisma.requirement.create({ data: { categoryId, ...data } as any })
}

export async function updateRequirement(
    requirementId: string,
    data: Partial<{
        name: string
        description: string
        guidanceText: string
        isActive: boolean
        displayOrder: number
        unit: string
    }>
) {
    return prisma.requirement.update({ where: { id: requirementId }, data })
}
