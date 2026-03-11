import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getFindingsForAudit, upsertFinding, bulkUpdateFindings } from '@/lib/audit-findings'

const ALL_ROLES = [
    UserRole.AUDITOR,
    UserRole.AGGREGATOR_MANAGER,
    UserRole.SUPER_ADMIN,
    UserRole.MILL_MANAGER,
    UserRole.MILL_STAFF,
]

export const GET = withAuth(ALL_ROLES, async (req: Request, _ctx: any, user: any) => {
    const { searchParams } = new URL(req.url)
    const auditId = searchParams.get('auditId')

    if (!auditId) return NextResponse.json({ error: 'auditId query param required' }, { status: 400 })

    const findings = await getFindingsForAudit(auditId, user.role)
    return NextResponse.json({ data: findings })
})

export const POST = withAuth(
    [UserRole.AUDITOR, UserRole.SUPER_ADMIN],
    async (req: Request, _ctx: any, user: any) => {
        const body = await req.json()

        // If 'findings' is an array, do bulk upsert
        if (Array.isArray(body.findings) && body.auditId) {
            const results = await bulkUpdateFindings(body.auditId, body.findings)
            return NextResponse.json({ data: results })
        }

        // Single upsert
        if (!body.auditId || !body.checklistItemId || !body.findingType || !body.evidenceReviewed) {
            return NextResponse.json({ error: 'auditId, checklistItemId, findingType, evidenceReviewed are required' }, { status: 400 })
        }

        const finding = await upsertFinding(body.auditId, body)
        return NextResponse.json({ data: finding })
    }
)
