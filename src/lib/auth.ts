import { UserRole } from '@prisma/client'
import { prisma } from './prisma'
import { createClient } from './supabase-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { cache } from 'react'

export type SessionUser = {
    id: string
    email: string
    name: string
    role: UserRole
    companyId: string | null
    organisationId: string | null
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
    const supabase = createClient(cookies())
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

    if (error || !supabaseUser) return null

    const user = await prisma.user.findUnique({
        where: { supabaseUserId: supabaseUser.id }
    })

    if (!user || !user.isActive) return null

    let resolvedCompanyId = user.companyId

    if (user.role === 'SUPER_ADMIN') {
        const cookieStore = cookies()
        const activeCompanyId = cookieStore.get('activeCompanyId')?.value
        if (activeCompanyId) resolvedCompanyId = activeCompanyId
    }

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: resolvedCompanyId,
        organisationId: user.organisationId,
    }
})

export function withAuth(
    roles: UserRole[],
    handler: (request: Request, context: any, user: SessionUser) => Promise<NextResponse> | NextResponse
) {
    return async (request: Request, context: any) => {
        const user = await getSessionUser()
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        if (!roles.includes(user.role)) {
            return new NextResponse('Forbidden', { status: 403 })
        }

        return handler(request, context, user)
    }
}
