import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { createDocument } from '@/lib/documents'
import { LinkedEntityType } from '@prisma/client'

export const POST = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async (request: Request, _context: any, user) => {

    const body = await request.json()
    const { displayName, filePath, fileType, fileSize, linkedEntityType, checklistItemId, massBalanceEntryId, auditFindingId, shipmentId } = body

    try {
        const doc = await createDocument({
            displayName,
            filePath,
            fileType,
            fileSize,
            uploadedById: user.id,
            linkedEntityType: linkedEntityType as LinkedEntityType,
            checklistItemId,
            massBalanceEntryId,
            auditFindingId,
            shipmentId,
        })
        return NextResponse.json({ data: doc, error: null, meta: null }, { status: 201 })
    } catch (err: any) {
        if (err.message === 'UNSUPPORTED_FILE_TYPE' || err.message === 'FILE_TOO_LARGE') {
            return NextResponse.json(
                { data: null, error: { code: err.message, message: err.message === 'FILE_TOO_LARGE' ? 'File exceeds 25 MB limit' : 'Unsupported file type' }, meta: null },
                { status: 422 }
            )
        }
        throw err
    }
})
