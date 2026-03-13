import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function POST(request: Request) {
    const body = await request.json()
    const { name, email, password, companyName, country, inviteCode } = body

    if (!name || !email || !password || !companyName || !country || !inviteCode) {
        return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // 1. Validate invite token
    const tokenHash = createHash('sha256').update((inviteCode as string).trim()).digest('hex')
    const token = await prisma.inviteToken.findUnique({ where: { tokenHash } })

    if (!token) return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 })
    if (token.usedAt) return NextResponse.json({ error: 'Invite code has already been used' }, { status: 400 })
    if (token.expiresAt < new Date()) return NextResponse.json({ error: 'Invite code has expired' }, { status: 400 })

    // 2. Create Supabase user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: { role: 'SUPER_ADMIN', name },
        email_confirm: true,
    })

    if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    try {
        const slug = `${slugify(companyName)}-${Date.now().toString(36)}`

        await prisma.$transaction(async (tx) => {
            const org = await tx.organisation.create({
                data: { name: companyName, slug, country }
            })
            await tx.user.create({
                data: {
                    supabaseUserId: authData.user.id,
                    email,
                    name,
                    role: 'SUPER_ADMIN',
                    organisationId: org.id,
                }
            })
            await tx.inviteToken.update({
                where: { tokenHash },
                data: { usedAt: new Date() }
            })
        })
    } catch (err: any) {
        // Rollback: delete Supabase user to avoid orphaned auth account
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json({ error: 'Account creation failed. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
