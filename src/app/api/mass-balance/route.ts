import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getMassBalanceEntries } from '@/lib/mass-balance'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async (request: Request, _context: any, user) => {

    const { searchParams } = new URL(request.url)
    const checklistId = searchParams.get('checklistId')

    if (!checklistId) {
        return NextResponse.json(
            { data: null, error: { code: 'VALIDATION_ERROR', message: 'checklistId is required' }, meta: null },
            { status: 422 }
        )
    }

    const entries = await getMassBalanceEntries(checklistId)
    return NextResponse.json({ data: entries, error: null, meta: null })
})
