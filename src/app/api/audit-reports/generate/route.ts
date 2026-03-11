import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { createDraftReport } from '@/lib/report-generator'
import type { LLMProviderEnum } from '@/lib/llm/types'

export const POST = withAuth(
    [UserRole.AUDITOR, UserRole.SUPER_ADMIN],
    async (req: Request, _ctx: any, user: any) => {
        const body = await req.json()
        if (!body.auditId) {
            return NextResponse.json({ error: 'auditId is required' }, { status: 400 })
        }

        try {
            const report = await createDraftReport(
                body.auditId,
                (body.provider as LLMProviderEnum) ?? 'gemini',
                body.model,
                user.id
            )
            return NextResponse.json({ data: report })
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 500 })
        }
    }
)
