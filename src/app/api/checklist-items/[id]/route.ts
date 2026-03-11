import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getChecklistItemById, updateChecklistItem } from '@/lib/checklist-items'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async (
    _request: Request,
    { params }: { params: { id: string } }
, user) => {

    const item = await getChecklistItemById(params.id)
    if (!item) {
        return NextResponse.json(
            { data: null, error: { code: 'NOT_FOUND', message: 'Checklist item not found' }, meta: null },
            { status: 404 }
        )
    }

    return NextResponse.json({ data: item, error: null, meta: null })
})

export const PATCH = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async (
    request: Request,
    { params }: { params: { id: string } }
, user) => {

    const body = await request.json()
    const { status, assigneeId, dueDate, aggregatorReviewed } = body

    const updated = await updateChecklistItem(params.id, {
        status,
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : dueDate,
        aggregatorReviewed,
        aggregatorReviewerId: aggregatorReviewed ? user.id : undefined,
    })

    return NextResponse.json({ data: updated, error: null, meta: null })
})
