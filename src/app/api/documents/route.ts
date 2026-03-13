import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getDocuments, createDocument } from '@/lib/documents'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async (request: Request, _context: any, user) => {

    const { searchParams } = new URL(request.url)
    const checklistItemId = searchParams.get('checklistItemId') || undefined
    const massBalanceEntryId = searchParams.get('massBalanceEntryId') || undefined
    const auditFindingId = searchParams.get('auditFindingId') || undefined
    const shipmentId = searchParams.get('shipmentId') || undefined

    const docs = await getDocuments({ checklistItemId, massBalanceEntryId, auditFindingId, shipmentId })
    return NextResponse.json({ data: docs, error: null, meta: null })
})
