import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getMillStats } from '@/lib/dashboard'

export const GET = withAuth(
    [UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AGGREGATOR_MANAGER, UserRole.SUPER_ADMIN, UserRole.AUDITOR],
    async (_req: Request, context: any, user: any) => {
        try {
            let { millId } = context.params
            if (millId === 'current') {
                if (!user.millId) return NextResponse.json({ error: 'User is not associated with a mill' }, { status: 400 })
                millId = user.millId
            }
            const stats = await getMillStats(millId)
            if (!stats) return NextResponse.json({ error: 'No checklist found for this mill' }, { status: 404 })
            return NextResponse.json({ data: stats })
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 500 })
        }
    }
)
