import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const POST = withAuth([UserRole.SUPER_ADMIN], async (request: Request, context: any, sessionUser) => {
    const { email, name, role, millId, organisationId } = await request.json()

    if (!email || !name || !role) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    try {
        // 1. Invite user via Supabase Admin API
        const { data: authData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: { role, name } // Storing in user_metadata for middleware
        })

        if (inviteError) throw inviteError

        // 2. Create the user record in Prisma
        const user = await prisma.user.create({
            data: {
                supabaseUserId: authData.user.id,
                email,
                name,
                role: role as UserRole,
                millId,
                organisationId,
            }
        })

        return NextResponse.json({ data: user, error: null })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
})
