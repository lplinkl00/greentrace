import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { forceChecklistStatus } from '@/lib/checklist-workflow'

export const POST = withAuth([UserRole.SUPER_ADMIN], async (request: Request, context: any, user: any) => {
    const { id } = context.params
    const body = await request.json()

    if (!body.status || !body.reason) {
        return NextResponse.json({ error: 'Status and reason are required.' }, { status: 400 })
    }

    try {
        const checklist = await forceChecklistStatus(id, body.status, body.reason, user.id)
        return NextResponse.json({ data: checklist })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 })
    }
})
