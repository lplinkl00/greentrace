'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * Handles Supabase auth redirects that arrive with session tokens in the URL hash.
 * This happens when using the default Supabase email templates (ConfirmationURL),
 * which redirect through Supabase's verify endpoint and pass the session as a hash fragment.
 *
 * Supported flows:
 *  - type=recovery → /set-password
 *  - type=invite   → /set-password?type=invite
 *  - anything else → / (role-based redirect via middleware)
 */
export default function AuthCallbackPage() {
    const router = useRouter()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                router.replace('/login?error=invalid_token')
                return
            }

            const hash = window.location.hash
            const params = new URLSearchParams(hash.replace('#', ''))
            const type = params.get('type')

            if (type === 'recovery' || type === 'invite') {
                router.replace(`/set-password?type=${type}`)
            } else {
                router.replace('/')
            }
        })
    }, [router])

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#141414]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-sunset-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-zinc-500">Verifying your link…</p>
            </div>
        </div>
    )
}

