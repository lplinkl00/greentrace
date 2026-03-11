import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getAuditorStats } from '@/lib/dashboard'

export const GET = withAuth(
    [UserRole.AUDITOR, UserRole.SUPER_ADMIN],
    async (_req: Request, _context: any, user: any) => {
        try {
            const stats = await getAuditorStats(user.id)
            return NextResponse.json({ data: stats })
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 500 })
        }
    }
)
