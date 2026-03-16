import { UserRole } from '@prisma/client'
import { prisma } from './prisma'
import { createClient } from './supabase-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export type SessionUser = {
    id: string
    email: string
    name: string
    role: UserRole
    millId: string | null
    organisationId: string | null
}

export async function getSessionUser(): Promise<SessionUser | null> {
    const supabase = createClient(cookies())
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

    if (error || !supabaseUser) return null

    const user = await prisma.user.findUnique({
        where: { supabaseUserId: supabaseUser.id }
    })

    if (!user || !user.isActive) return null

    let resolvedMillId = user.millId

    if (user.role === 'SUPER_ADMIN') {
        const cookieStore = cookies()
        const activeMillId = cookieStore.get('activeMillId')?.value
        if (activeMillId) resolvedMillId = activeMillId
    }

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        millId: resolvedMillId,
        organisationId: user.organisationId,
    }
}

/**
 * Higher-order function to protect API routes with role-based access control.
 */
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
