import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole, RegulationCode } from '@prisma/client'
import { getChecklists, createChecklist } from '@/lib/checklists'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async (request: Request, _context: any, user) => {

    const { searchParams } = new URL(request.url)
    const millId = searchParams.get('millId') || undefined
    const regulation = (searchParams.get('regulation') as RegulationCode) || undefined
    const status = searchParams.get('status') || undefined
    const year = searchParams.get('year') || undefined

    // Mill users can only see their own mill's checklists
    const effectiveMillId =
        user.role === UserRole.MILL_MANAGER || user.role === UserRole.MILL_STAFF
            ? user.millId!
            : millId

    const checklists = await getChecklists({ millId: effectiveMillId, regulation, status, year })
    return NextResponse.json({ data: checklists, error: null, meta: null })
})

export async function POST(request: Request) {
    const user = await getSessionUser()
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const { millId, profileId, periodStart, periodEnd } = body

    if (!millId || !profileId || !periodStart || !periodEnd) {
        return NextResponse.json(
            { data: null, error: { code: 'VALIDATION_ERROR', message: 'millId, profileId, periodStart, and periodEnd are required' }, meta: null },
            { status: 422 }
        )
    }

    const result = await createChecklist({
        millId,
        profileId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
    })

    return NextResponse.json({ data: result, error: null, meta: null }, { status: 201 })
}
