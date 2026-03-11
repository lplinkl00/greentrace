import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getAuditById, updateAuditStatus } from '@/lib/audits'

const ALLOWED_ROLES = [
    UserRole.AUDITOR,
    UserRole.AGGREGATOR_MANAGER,
    UserRole.SUPER_ADMIN,
    UserRole.MILL_MANAGER,
    UserRole.MILL_STAFF,
]

export const GET = withAuth(ALLOWED_ROLES, async (_req: Request, context: any, user: any) => {
    const { id } = context.params
    try {
        const audit = await getAuditById(id, user.id, user.role)
        if (!audit) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        return NextResponse.json({ data: audit })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 403 })
    }
})

export const PATCH = withAuth(
    [UserRole.AUDITOR, UserRole.SUPER_ADMIN],
    async (req: Request, context: any, user: any) => {
        const { id } = context.params
        const body = await req.json()

        if (!body.status) {
            return NextResponse.json({ error: 'status is required' }, { status: 400 })
        }

        try {
            const audit = await updateAuditStatus(
                id,
                body.status,
                user.id,
                body.scheduledDate ? new Date(body.scheduledDate) : undefined,
                body.conductedDate ? new Date(body.conductedDate) : undefined
            )
            return NextResponse.json({ data: audit })
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 })
        }
    }
)
