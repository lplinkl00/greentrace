import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getProfileById } from '@/lib/regulation-profiles'

export const GET = withAuth(
    [UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR],
    async (_request: Request, context: { params: { profileId: string } }) => {
        const profile = await getProfileById(context.params.profileId)
        if (!profile) {
            return NextResponse.json(
                { data: null, error: { code: 'NOT_FOUND', message: 'Profile not found' }, meta: null },
                { status: 404 }
            )
        }
        return NextResponse.json({ data: profile, error: null, meta: null })
    }
)
