import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json()
        const supabase = createClient(cookies())

        const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            return NextResponse.json({ data: null, error: { code: 'AUTH_ERROR', message: error.message }, meta: null }, { status: 401 })
        }

        return NextResponse.json({ data: { user, session }, error: null, meta: null })
    } catch (err) {
        return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid payload' }, meta: null }, { status: 400 })
    }
}
