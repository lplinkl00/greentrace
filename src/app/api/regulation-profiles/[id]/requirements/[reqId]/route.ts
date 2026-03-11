import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { updateRequirement } from '@/lib/regulation-profiles'

export async function PATCH(
    request: Request,
    { params }: { params: { id: string; reqId: string } }
) {
    const user = await getSessionUser()
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const requirement = await updateRequirement(params.reqId, body)
    return NextResponse.json({ data: requirement, error: null, meta: null })
}
