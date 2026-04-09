import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const ALLOWED_ROLES = [
    UserRole.AUDITOR,
    UserRole.SUPER_ADMIN,
    UserRole.AGGREGATOR_MANAGER,
]

export const GET = withAuth(ALLOWED_ROLES, async (_req: Request, _ctx: any, user: any) => {
    const where = user.role === UserRole.AUDITOR
        ? { audit: { auditorId: user.id } }
        : {}

    try {
        const reports = await prisma.auditReport.findMany({
            where,
            orderBy: { generatedAt: 'desc' },
            include: {
                audit: {
                    select: {
                        id: true,
                        periodStart: true,
                        periodEnd: true,
                        company: {
                            select: { id: true, name: true, code: true },
                        },
                    },
                },
            },
        })

        return NextResponse.json({ data: reports })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
})
