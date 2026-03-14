import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getProfiles } from '@/lib/regulation-profiles'

export const GET = withAuth(
    [UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR],
    async () => {
        const profiles = await getProfiles()
        return NextResponse.json({ data: profiles, error: null, meta: null })
    }
)
