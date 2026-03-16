import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { createImportJob } from '@/lib/imports'
import { ImportFileType } from '@prisma/client'

export const POST = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AUDITOR], async (request: Request, _context: any, user) => {

    const body = await request.json()
    const { companyId, fileName, fileType, filePath } = body

    // Validation
    if (!['CSV', 'EXCEL'].includes(fileType)) {
        return NextResponse.json(
            { data: null, error: { code: 'INVALID_FILE_TYPE', message: 'Only CSV and EXCEL are supported' }, meta: null },
            { status: 400 }
        )
    }

    const job = await createImportJob({
        companyId,
        uploadedById: user.id,
        fileName,
        fileType: fileType as ImportFileType,
        filePath,
    })

    return NextResponse.json({ data: job, error: null, meta: null }, { status: 201 })
})
