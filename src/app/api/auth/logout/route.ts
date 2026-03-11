import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function POST() {
    const supabase = createClient(cookies())
    await supabase.auth.signOut()
    return NextResponse.json({ data: { success: true }, error: null, meta: null })
}
