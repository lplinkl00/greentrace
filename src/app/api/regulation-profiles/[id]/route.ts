import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getProfileById, updateProfile } from '@/lib/regulation-profiles'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AUDITOR], async (
    _request: Request,
    { params }: { params: { id: string } }
, user) => {

    const profile = await getProfileById(params.id)
    if (!profile) {
        return NextResponse.json(
            { data: null, error: { code: 'NOT_FOUND', message: 'Profile not found' }, meta: null },
            { status: 404 }
        )
    }

    return NextResponse.json({ data: profile, error: null, meta: null })
})

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const user = await getSessionUser()
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const { name, description, isActive } = body

    const profile = await updateProfile(params.id, { name, description, isActive })
    return NextResponse.json({ data: profile, error: null, meta: null })
}
