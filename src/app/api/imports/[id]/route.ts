import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getImportJobById } from '@/lib/imports'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AUDITOR], async (
    _request: Request,
    { params }: { params: { id: string } }
, user) => {

    const job = await getImportJobById(params.id)
    if (!job) {
        return NextResponse.json(
            { data: null, error: { code: 'NOT_FOUND', message: 'Import job not found' }, meta: null },
            { status: 404 }
        )
    }

    return NextResponse.json({ data: job, error: null, meta: null })
})
