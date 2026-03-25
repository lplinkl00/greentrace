import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { createDraftReport } from '@/lib/report-generator'
import type { LLMProviderEnum, ReportOptions } from '@/lib/llm/types'

export const POST = withAuth(
    [UserRole.AUDITOR, UserRole.SUPER_ADMIN],
    async (req: Request, _ctx: any, user: any) => {
        const body = await req.json()
        if (!body.auditId) {
            return NextResponse.json({ error: 'auditId is required' }, { status: 400 })
        }

        const VALID_SCHEMES = new Set(['green', 'navy', 'slate', 'amber'])
        const VALID_PRESETS = new Set(['corporate', 'minimal', 'sustainability'])
        const rawOpts = body.reportOptions
        const safeOptions: ReportOptions | undefined =
            rawOpts &&
            typeof rawOpts === 'object' &&
            VALID_SCHEMES.has(rawOpts.colourScheme) &&
            VALID_PRESETS.has(rawOpts.stylePreset)
                ? (rawOpts as ReportOptions)
                : undefined

        try {
            const report = await createDraftReport(
                body.auditId,
                (body.provider as LLMProviderEnum) ?? 'anthropic',
                body.model?.slice(0, 200),
                user.id,
                safeOptions
            )
            return NextResponse.json({ data: report })
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 500 })
        }
    }
)
