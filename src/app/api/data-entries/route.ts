import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getDataEntries, createDataEntry } from '@/lib/data-entries'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AUDITOR], async (request: Request, _context: any, user) => {

    const { searchParams } = new URL(request.url)
    const checklistItemId = searchParams.get('checklistItemId')

    if (!checklistItemId) {
        return NextResponse.json(
            { data: null, error: { code: 'VALIDATION_ERROR', message: 'checklistItemId is required' }, meta: null },
            { status: 422 }
        )
    }

    const entries = await getDataEntries(checklistItemId)
    return NextResponse.json({ data: entries, error: null, meta: null })
})

export const POST = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AUDITOR], async (request: Request, _context: any, user) => {

    const body = await request.json()

    try {
        const entry = await createDataEntry({
            ...body,
            enteredById: user.id,
            reportingMonth: body.reportingMonth ? new Date(body.reportingMonth) : null,
        })
        return NextResponse.json({ data: entry, error: null, meta: null }, { status: 201 })
    } catch (err: any) {
        if (err.message === 'PERIOD_LOCKED') {
            return NextResponse.json(
                { data: null, error: { code: 'PERIOD_LOCKED', message: 'This checklist period is locked' }, meta: null },
                { status: 409 }
            )
        }
        if (err.message === 'EMISSION_FACTOR_EXPIRED') {
            return NextResponse.json(
                { data: null, error: { code: 'EMISSION_FACTOR_EXPIRED', message: 'The selected emission factor has expired' }, meta: null },
                { status: 422 }
            )
        }
        throw err
    }
})
