import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { saveColumnMapping, processImportJob } from '@/lib/imports'

export const POST = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AUDITOR], async (
    request: Request,
    { params }: { params: { id: string } }
, user) => {

    const body = await request.json()
    const { companyId, mappingJson, templateName, mockRows } = body

    // If the user checked "save as template"
    if (templateName) {
        await saveColumnMapping(companyId, templateName, mappingJson)
    }

    // Trigger processing asynchronously in a real app, but we await for the prototype
    try {
        const job = await processImportJob(params.id, mappingJson, mockRows || [])
        return NextResponse.json({ data: job, error: null, meta: null })
    } catch (err: any) {
        return NextResponse.json(
            { data: null, error: { code: 'PROCESSING_ERROR', message: err.message }, meta: null },
            { status: 500 }
        )
    }
})
