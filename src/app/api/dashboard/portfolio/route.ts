import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getPortfolioStats } from '@/lib/dashboard'

export const GET = withAuth(
    [UserRole.AGGREGATOR_MANAGER, UserRole.SUPER_ADMIN],
    async () => {
        try {
            const stats = await getPortfolioStats()
            return NextResponse.json({ data: stats }, {
                headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
            })
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 500 })
        }
    }
)
