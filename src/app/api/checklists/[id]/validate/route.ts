import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { validateChecklistSubmission } from '@/lib/checklist-workflow'

export const GET = withAuth([UserRole.MILL_MANAGER, UserRole.MILL_STAFF], async (request: Request, context: any) => {
    const { id } = context.params

    try {
        const validation = await validateChecklistSubmission(id)
        return NextResponse.json({ data: validation })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 })
    }
})
