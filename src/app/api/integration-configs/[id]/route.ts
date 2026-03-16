import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { deleteConfig } from '@/lib/integration-configs'

export const DELETE = withAuth(
    [UserRole.COMPANY_MANAGER, UserRole.AGGREGATOR_MANAGER, UserRole.SUPER_ADMIN],
    async (_req: Request, context: any) => {
        try {
            const { id } = context.params
            await deleteConfig(id)
            return NextResponse.json({ success: true })
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 500 })
        }
    }
)
