import { prisma } from './prisma'
import { MaterialType } from '@prisma/client'

// ─── Checklist CRUD ────────────────────────────────────────────────────

export async function getChecklists(filters: {
    companyId?: string
    regulation?: string
    status?: string
    year?: string
}) {
    const { companyId, regulation, status, year } = filters
    return prisma.checklist.findMany({
        where: {
            companyId: companyId || undefined,
            regulation: regulation || undefined,
            status: (status as any) || undefined,
            ...(year
                ? {
                    periodStart: { gte: new Date(`${year}-01-01`) },
                    periodEnd: { lte: new Date(`${year}-12-31`) },
                }
                : {}),
        },
        include: {
            _count: { select: { items: true } },
            company: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
    })
}

export async function getChecklistById(id: string) {
    return prisma.checklist.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    requirement: {
                        include: {
                            category: {
                                include: { pillar: true },
                            },
                        },
                    },
                },
            },
            profile: true,
            company: true,
        },
    })
}

/**
 * Auto-generates a Checklist with one ChecklistItem per active Requirement in the profile.
 * Pre-populates MassBalanceEntry rows for each MaterialType.
 */
export async function createChecklist(data: {
    companyId: string
    profileId: string
    periodStart: Date
    periodEnd: Date
}) {
    const { companyId, profileId, periodStart, periodEnd } = data

    // Fetch the profile to get the regulation code
    const profile = await prisma.regulationProfile.findUniqueOrThrow({
        where: { id: profileId },
        include: {
            pillars: {
                include: {
                    categories: {
                        include: {
                            requirements: { where: { isActive: true } },
                        },
                    },
                },
            },
        },
    })

    // Gather all active requirements
    const requirements = profile.pillars.flatMap((p) =>
        p.categories.flatMap((c) => c.requirements)
    )

    // Material types to track mass balance for
    const materialTypes: MaterialType[] = [
        MaterialType.FFB,
        MaterialType.CRUDE_PALM_OIL,
        MaterialType.PALM_KERNEL_EXPELLER,
        MaterialType.PALM_KERNEL_OIL,
        MaterialType.POME_METHANE,
        MaterialType.EFB,
    ]

    // MB-3: Find prior period's closing stock
    const priorEntries = await prisma.massBalanceEntry.findMany({
        where: {
            companyId,
            regulation: profile.regulation,
            periodEnd: periodStart, // Ends right when this one begins
        },
    })

    const openingStockMap = new Map<string, number>()
    for (const entry of priorEntries) {
        openingStockMap.set(entry.materialType, Number(entry.closingStock))
    }

    // Run the entire creation atomically
    const checklist = await prisma.$transaction(async (tx) => {
        const created = await tx.checklist.create({
            data: {
                companyId,
                profileId,
                regulation: profile.regulation,
                periodStart,
                periodEnd,
            },
        })

        if (requirements.length > 0) {
            await tx.checklistItem.createMany({
                data: requirements.map((req) => ({
                    checklistId: created.id,
                    requirementId: req.id,
                })),
            })
        }

        if (materialTypes.length > 0) {
            await tx.massBalanceEntry.createMany({
                data: materialTypes.map((mt) => {
                    const os = openingStockMap.get(mt) || 0
                    return {
                        companyId,
                        checklistId: created.id,
                        regulation: profile.regulation,
                        periodStart,
                        periodEnd,
                        materialType: mt,
                        openingStock: os,
                        closingStock: os, // Since in=0 and out=0, closing = opening
                    }
                })
            })
        }

        return created
    })

    const itemsCreated = requirements.length
    return { checklist, itemsCreated, massBalanceEntriesCreated: materialTypes.length }
}
