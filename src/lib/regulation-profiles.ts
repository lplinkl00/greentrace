import { prisma } from './prisma'
import { GHGScope, RegulationCode, RequirementDataType, RequirementCriticality } from '@prisma/client'

// ─── Fixture import types ────────────────────────────────────────────────────

export type FixtureRequirement = {
    code: string
    name: string
    description: string
    guidanceText?: string | null
    dataType: RequirementDataType
    criticality: RequirementCriticality
    ghgScope?: GHGScope | null
    unit?: string | null
    requiresForm?: boolean
    displayOrder?: number
}

export type FixtureCategory = {
    code: string
    name: string
    displayOrder?: number
    requirements: FixtureRequirement[]
}

export type FixturePillar = {
    code: string
    name: string
    displayOrder?: number
    categories: FixtureCategory[]
}

export type RegulationProfileFixture = {
    regulation: RegulationCode
    version: string
    name: string
    description?: string | null
    pillars: FixturePillar[]
}

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

export async function importProfile(fixture: RegulationProfileFixture) {
    return prisma.regulationProfile.create({
        data: {
            regulation: fixture.regulation,
            version: fixture.version,
            name: fixture.name,
            description: fixture.description ?? null,
            pillars: {
                create: fixture.pillars.map((pillar, pi) => ({
                    code: pillar.code,
                    name: pillar.name,
                    displayOrder: pillar.displayOrder ?? pi,
                    categories: {
                        create: pillar.categories.map((cat, ci) => ({
                            code: cat.code,
                            name: cat.name,
                            displayOrder: cat.displayOrder ?? ci,
                            requirements: {
                                create: cat.requirements.map((req, ri) => ({
                                    code: req.code,
                                    name: req.name,
                                    description: req.description,
                                    guidanceText: req.guidanceText ?? null,
                                    dataType: req.dataType,
                                    criticality: req.criticality,
                                    ghgScope: req.ghgScope ?? null,
                                    unit: req.unit ?? null,
                                    requiresForm: req.requiresForm ?? false,
                                    displayOrder: req.displayOrder ?? ri,
                                })),
                            },
                        })),
                    },
                })),
            },
        },
        include: { _count: { select: { pillars: true } } },
    })
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
