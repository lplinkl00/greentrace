import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as 'invite' | 'recovery' | null

    if (!token_hash || !type) {
        return NextResponse.redirect(`${origin}/login?error=invalid_token`)
    }

    // Create the redirect response first so we can attach cookies to it
    const redirectSuccess = NextResponse.redirect(`${origin}/set-password?type=${type}`)
    const redirectError = NextResponse.redirect(`${origin}/login?error=invalid_token`)

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        redirectSuccess.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const { error } = await supabase.auth.verifyOtp({ token_hash, type })

    if (error) {
        return redirectError
    }

    return redirectSuccess
}
