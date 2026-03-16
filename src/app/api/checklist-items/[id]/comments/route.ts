import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { addComment } from '@/lib/checklist-items'

export const POST = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AUDITOR], async (
    request: Request,
    { params }: { params: { id: string } }
, user) => {

    const { body } = await request.json()

    if (!body?.trim()) {
        return NextResponse.json(
            { data: null, error: { code: 'VALIDATION_ERROR', message: 'Comment body is required' }, meta: null },
            { status: 422 }
        )
    }

    const comment = await addComment(params.id, user.id, user.role, body)
    return NextResponse.json({ data: comment, error: null, meta: null }, { status: 201 })
})
