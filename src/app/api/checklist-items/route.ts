import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getChecklistItems } from '@/lib/checklist-items'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async (request: Request, user) => {

    const { searchParams } = new URL(request.url)
    const checklistId = searchParams.get('checklistId')

    if (!checklistId) {
        return NextResponse.json(
            { data: null, error: { code: 'VALIDATION_ERROR', message: 'checklistId is required' }, meta: null },
            { status: 422 }
        )
    }

    const items = await getChecklistItems(checklistId)
    return NextResponse.json({ data: items, error: null, meta: null })
})
