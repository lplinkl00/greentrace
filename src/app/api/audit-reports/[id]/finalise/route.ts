import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole, AuditReportStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const POST = withAuth(
    [UserRole.AUDITOR, UserRole.SUPER_ADMIN],
    async (_req: Request, context: any, user: any) => {
        const { id } = context.params

        const report = await prisma.auditReport.findUnique({ where: { id } })
        if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (report.status === AuditReportStatus.FINAL) {
            return NextResponse.json({ error: 'Report is already FINAL' }, { status: 400 })
        }

        const finalised = await prisma.auditReport.update({
            where: { id },
            data: {
                status: AuditReportStatus.FINAL,
                reviewedById: user.id,
                reviewedAt: new Date(),
            },
        })

        return NextResponse.json({ data: finalised })
    }
)
