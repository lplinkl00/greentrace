import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getImportJobs } from '@/lib/imports'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AUDITOR], async (request: Request, _context: any, user) => {

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
        return NextResponse.json(
            { data: null, error: { code: 'VALIDATION_ERROR', message: 'companyId is required' }, meta: null },
            { status: 422 }
        )
    }

    const jobs = await getImportJobs(companyId)
    return NextResponse.json({ data: jobs, error: null, meta: null })
})
