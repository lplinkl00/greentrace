import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole, AuditReportStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createReportVersion } from '@/lib/report-generator'

const ALL_ROLES = [
    UserRole.AUDITOR,
    UserRole.AGGREGATOR_MANAGER,
    UserRole.SUPER_ADMIN,
    UserRole.COMPANY_MANAGER,
    UserRole.COMPANY_STAFF,
]

export const GET = withAuth(ALL_ROLES, async (req: Request, context: any) => {
    const { id } = context.params
    const { searchParams } = new URL(req.url)
    const auditId = searchParams.get('auditId')

    // If the `id` is actually an auditId query, fetch all versions for that audit
    const where = auditId ? { auditId } : { id }

    const reports = await prisma.auditReport.findMany({
        where,
        orderBy: { version: 'desc' },
        include: { reviewedBy: { select: { name: true, email: true } } },
    })

    // If single report by id
    if (!auditId) {
        const report = reports[0]
        if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        return NextResponse.json({ data: report })
    }

    return NextResponse.json({ data: reports })
})

export const PATCH = withAuth(
    [UserRole.AUDITOR, UserRole.SUPER_ADMIN],
    async (req: Request, context: any, user: any) => {
        const { id } = context.params
        const body = await req.json()

        if (!body.contentJson) {
            return NextResponse.json({ error: 'contentJson is required' }, { status: 400 })
        }

        const existingReport = await prisma.auditReport.findUnique({ where: { id } })
        if (!existingReport) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (existingReport.status === AuditReportStatus.FINAL) {
            return NextResponse.json({ error: 'Cannot edit a FINAL report. Finalise creates a new version.' }, { status: 400 })
        }

        const newVersion = await createReportVersion(
            existingReport.auditId,
            body.contentJson,
            existingReport,
            user.id
        )
        return NextResponse.json({ data: newVersion })
    }
)
