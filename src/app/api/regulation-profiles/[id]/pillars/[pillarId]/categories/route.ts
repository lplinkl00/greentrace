import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { createCategory } from '@/lib/regulation-profiles'

export async function POST(
    request: Request,
    { params }: { params: { id: string; pillarId: string } }
) {
    const user = await getSessionUser()
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const { code, name, displayOrder } = body

    if (!code || !name) {
        return NextResponse.json(
            { data: null, error: { code: 'VALIDATION_ERROR', message: 'code and name are required' }, meta: null },
            { status: 422 }
        )
    }

    const category = await createCategory(params.pillarId, { code, name, displayOrder })
    return NextResponse.json({ data: category, error: null, meta: null }, { status: 201 })
}
