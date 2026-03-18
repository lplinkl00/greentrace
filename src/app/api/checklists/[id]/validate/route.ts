import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { validateChecklistSubmission } from '@/lib/checklist-workflow'

export const GET = withAuth([UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER], async (request: Request, context: any) => {
    const { id } = context.params

    try {
        const validation = await validateChecklistSubmission(id)
        return NextResponse.json({ data: validation })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 })
    }
})
