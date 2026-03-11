import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getChecklistById } from '@/lib/checklists'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async (
    _request: Request,
    { params }: { params: { id: string } }
, user) => {

    const checklist = await getChecklistById(params.id)
    if (!checklist) {
        return NextResponse.json(
            { data: null, error: { code: 'NOT_FOUND', message: 'Checklist not found' }, meta: null },
            { status: 404 }
        )
    }

    // Scope check: mill users can only access their own mill's checklists
    if (
        (user.role === UserRole.MILL_MANAGER || user.role === UserRole.MILL_STAFF) &&
        checklist.millId !== user.millId
    ) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    return NextResponse.json({ data: checklist, error: null, meta: null })
})
