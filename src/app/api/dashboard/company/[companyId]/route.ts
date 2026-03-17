import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getCompanyStats } from '@/lib/dashboard'

export const GET = withAuth(
    [UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AGGREGATOR_MANAGER, UserRole.SUPER_ADMIN, UserRole.AUDITOR],
    async (_req: Request, context: any, user: any) => {
        try {
            let { companyId } = context.params
            if (companyId === 'current') {
                if (!user.companyId) return NextResponse.json({ error: 'User is not associated with a company' }, { status: 400 })
                companyId = user.companyId
            }
            const stats = await getCompanyStats(companyId)
            if (!stats) return NextResponse.json({ error: 'No checklist found for this company' }, { status: 404 })
            return NextResponse.json({ data: stats })
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 500 })
        }
    }
)
