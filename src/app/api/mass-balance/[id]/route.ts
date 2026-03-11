import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getMassBalanceEntryById, updateMassBalanceEntry } from '@/lib/mass-balance'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async (
    _request: Request,
    { params }: { params: { id: string } }
, user) => {

    const entry = await getMassBalanceEntryById(params.id)
    if (!entry) {
        return NextResponse.json(
            { data: null, error: { code: 'NOT_FOUND', message: 'Mass balance entry not found' }, meta: null },
            { status: 404 }
        )
    }

    return NextResponse.json({ data: entry, error: null, meta: null })
})

export const PATCH = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async (
    request: Request,
    { params }: { params: { id: string } }
, user) => {

    const body = await request.json()

    try {
        const updated = await updateMassBalanceEntry(params.id, user.id, user.role, body)
        return NextResponse.json({ data: updated, error: null, meta: null })
    } catch (err: any) {
        if (err.message === 'PERIOD_LOCKED') {
            return NextResponse.json(
                { data: null, error: { code: 'PERIOD_LOCKED', message: 'This checklist period is locked' }, meta: null },
                { status: 409 }
            )
        }
        if (err.message === 'MASS_BALANCE_OVERSCHEDULE') {
            return NextResponse.json(
                { data: null, error: { code: 'MASS_BALANCE_OVERSCHEDULE', message: 'Certified output exceeds available stock' }, meta: null },
                { status: 422 }
            )
        }
        throw err
    }
})
