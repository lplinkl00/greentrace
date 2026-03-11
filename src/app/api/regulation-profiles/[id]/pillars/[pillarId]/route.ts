import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { updatePillar } from '@/lib/regulation-profiles'

export async function PATCH(
    request: Request,
    { params }: { params: { id: string; pillarId: string } }
) {
    const user = await getSessionUser()
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const pillar = await updatePillar(params.pillarId, body)
    return NextResponse.json({ data: pillar, error: null, meta: null })
}
