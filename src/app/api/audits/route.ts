import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getAuditsForUser } from '@/lib/audits'

const ALLOWED_ROLES = [
    UserRole.AUDITOR,
    UserRole.AGGREGATOR_MANAGER,
    UserRole.SUPER_ADMIN,
]

export const GET = withAuth(ALLOWED_ROLES, async (_req: Request, _ctx: any, user: any) => {
    const audits = await getAuditsForUser(user.id, user.role)
    return NextResponse.json({ data: audits })
})
