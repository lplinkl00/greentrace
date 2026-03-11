import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getImportJobs } from '@/lib/imports'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async (request: Request, user) => {

    const { searchParams } = new URL(request.url)
    const millId = searchParams.get('millId')

    if (!millId) {
        return NextResponse.json(
            { data: null, error: { code: 'VALIDATION_ERROR', message: 'millId is required' }, meta: null },
            { status: 422 }
        )
    }

    const jobs = await getImportJobs(millId)
    return NextResponse.json({ data: jobs, error: null, meta: null })
})
