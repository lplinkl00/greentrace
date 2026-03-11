import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { confirmAllocation } from '@/lib/shipments'

export const PATCH = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async (
    request: Request,
    { params }: { params: { id: string } }
, user) => {

    const { isccAllocationPct, rspoAllocationPct } = await request.json()

    try {
        const updated = await confirmAllocation(params.id, user.id, { isccAllocationPct, rspoAllocationPct })
        return NextResponse.json({ data: updated, error: null, meta: null })
    } catch (err: any) {
        if (err.message === 'ALLOCATION_TOTAL_NOT_100') {
            return NextResponse.json(
                { data: null, error: { code: 'ALLOCATION_TOTAL_NOT_100', message: 'Allocation percentages must sum to 100' }, meta: null },
                { status: 422 }
            )
        }
        throw err
    }
})
