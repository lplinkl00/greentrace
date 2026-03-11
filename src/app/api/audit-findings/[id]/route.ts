import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { deleteFinding } from '@/lib/audit-findings'

export const PATCH = withAuth(
    [UserRole.AUDITOR, UserRole.SUPER_ADMIN],
    async (req: Request, context: any) => {
        const { id } = context.params
        const body = await req.json()

        try {
            const finding = await prisma.auditFinding.update({
                where: { id },
                data: {
                    findingType: body.findingType,
                    evidenceReviewed: body.evidenceReviewed,
                    correctiveActionRequired: body.correctiveActionRequired,
                    correctiveActionDeadline: body.correctiveActionDeadline
                        ? new Date(body.correctiveActionDeadline)
                        : undefined,
                    findingStatus: body.findingStatus,
                },
            })
            return NextResponse.json({ data: finding })
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 })
        }
    }
)

export const DELETE = withAuth(
    [UserRole.AUDITOR, UserRole.SUPER_ADMIN],
    async (_req: Request, context: any) => {
        const { id } = context.params
        try {
            await deleteFinding(id)
            return NextResponse.json({ success: true })
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 })
        }
    }
)
