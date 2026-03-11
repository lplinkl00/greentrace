import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { sendToAudit } from '@/lib/checklist-workflow'

export const POST = withAuth([UserRole.AGGREGATOR_MANAGER], async (request: Request, context: any, user: any) => {
    const { id } = context.params
    const body = await request.json()

    if (!body.auditorId) {
        return NextResponse.json({ error: 'Auditor must be assigned.' }, { status: 400 })
    }

    try {
        const checklist = await sendToAudit(id, user.id, body.auditorId)
        return NextResponse.json({ data: checklist })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 })
    }
})
