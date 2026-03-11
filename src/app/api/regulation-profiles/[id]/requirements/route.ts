import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { createRequirement } from '@/lib/regulation-profiles'

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const user = await getSessionUser()
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const {
        categoryId,
        code,
        name,
        description,
        guidanceText,
        dataType,
        requiresForm,
        criticality,
        ghgScope,
        displayOrder,
        unit,
    } = body

    if (!categoryId || !code || !name || !description || !dataType) {
        return NextResponse.json(
            { data: null, error: { code: 'VALIDATION_ERROR', message: 'categoryId, code, name, description, dataType are required' }, meta: null },
            { status: 422 }
        )
    }

    const requirement = await createRequirement(categoryId, {
        code, name, description, guidanceText, dataType,
        requiresForm, criticality, ghgScope, displayOrder, unit,
    })
    return NextResponse.json({ data: requirement, error: null, meta: null }, { status: 201 })
}
