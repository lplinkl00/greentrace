import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
    const { email } = await request.json()

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = createClient(cookies())

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: 'Password reset email sent', error: null })
}
