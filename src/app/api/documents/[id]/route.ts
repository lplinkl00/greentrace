import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getDocumentById, softDeleteDocument } from '@/lib/documents'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AUDITOR], async (
    _request: Request,
    { params }: { params: { id: string } }
, user) => {

    const doc = await getDocumentById(params.id)
    if (!doc || doc.isDeleted) {
        return NextResponse.json(
            { data: null, error: { code: 'NOT_FOUND', message: 'Document not found' }, meta: null },
            { status: 404 }
        )
    }

    return NextResponse.json({ data: doc, error: null, meta: null })
})

export const DELETE = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AUDITOR], async (
    _request: Request,
    { params }: { params: { id: string } }
, user) => {

    const updated = await softDeleteDocument(params.id, user.id)
    return NextResponse.json({ data: updated, error: null, meta: null })
})
