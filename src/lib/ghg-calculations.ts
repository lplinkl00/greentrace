import { prisma } from './prisma'
import { Prisma, GHGScope } from '@prisma/client'

/**
 * GHG-3: Compute total GHG emissions for a checklist, grouped by scope.
 * Joins ChecklistItem → DataEntry → Requirement where ghgScope IS NOT NULL.
 * Returns { scope1, scope2, scope3, total } as Decimal strings.
 */
export async function computeChecklistGHGTotal(checklistId: string) {
    const entries = await prisma.dataEntry.findMany({
        where: {
            checklistItem: {
                checklistId,
                requirement: { ghgScope: { not: null } },
            },
            valueConverted: { not: null },
        },
        include: {
            checklistItem: {
                include: { requirement: true },
            },
        },
    })

    let scope1 = new Prisma.Decimal(0)
    let scope2 = new Prisma.Decimal(0)
    let scope3 = new Prisma.Decimal(0)

    for (const entry of entries) {
        const scope = entry.checklistItem.requirement.ghgScope
        const value = entry.valueConverted ?? new Prisma.Decimal(0)
        switch (scope) {
            case GHGScope.SCOPE1:
                scope1 = scope1.add(value)
                break
            case GHGScope.SCOPE2:
                scope2 = scope2.add(value)
                break
            case GHGScope.SCOPE3:
                scope3 = scope3.add(value)
                break
        }
    }

    const total = scope1.add(scope2).add(scope3)

    return {
        scope1: scope1.toString(),
        scope2: scope2.toString(),
        scope3: scope3.toString(),
        total: total.toString(),
    }
}
