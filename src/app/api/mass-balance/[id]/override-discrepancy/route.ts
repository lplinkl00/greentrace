import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { overrideDiscrepancy } from '@/lib/mass-balance'

export const PATCH = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async (
    request: Request,
    { params }: { params: { id: string } }
, user) => {

    // Only Aggregator Manager or Super Admin can override
    if (user.role !== UserRole.AGGREGATOR_MANAGER && user.role !== UserRole.SUPER_ADMIN) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const { notes } = await request.json()
    if (!notes?.trim()) {
        return NextResponse.json(
            { data: null, error: { code: 'VALIDATION_ERROR', message: 'Discrepancy override requires notes' }, meta: null },
            { status: 422 }
        )
    }

    try {
        const updated = await overrideDiscrepancy(params.id, user.id, notes)
        return NextResponse.json({ data: updated, error: null, meta: null })
    } catch (err: any) {
        if (err.message === 'PERIOD_LOCKED') {
            return NextResponse.json(
                { data: null, error: { code: 'PERIOD_LOCKED', message: 'This checklist period is locked' }, meta: null },
                { status: 409 }
            )
        }
        throw err
    }
})
