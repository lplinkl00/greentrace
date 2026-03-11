import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { confirmOpeningStock } from '@/lib/mass-balance'

export const PATCH = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async (
    _request: Request,
    { params }: { params: { id: string } }
, user) => {

    try {
        const updated = await confirmOpeningStock(params.id, user.id)
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
