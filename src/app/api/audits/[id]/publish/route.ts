import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { publishAudit } from '@/lib/audits'

export const POST = withAuth([UserRole.AUDITOR, UserRole.SUPER_ADMIN], async (_req: Request, context: any, user: any) => {
    const { id } = context.params

    try {
        const audit = await publishAudit(id, user.id)
        return NextResponse.json({ data: audit })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 })
    }
})
