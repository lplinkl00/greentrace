import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { submitChecklist } from '@/lib/checklist-workflow'

export const POST = withAuth([UserRole.MILL_MANAGER], async (request: Request, context: any, user: any) => {
    const { id } = context.params

    try {
        const checklist = await submitChecklist(id, user.id)
        return NextResponse.json({ data: checklist })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 })
    }
})
