'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * Handles Supabase auth redirects that arrive with session tokens in the URL hash.
 * Uses onAuthStateChange to reliably detect when the token exchange completes.
 *
 * Supported flows:
 *  - PASSWORD_RECOVERY → /set-password?type=recovery
 *  - type=invite in hash → /set-password?type=invite
 *  - anything else → / (role-based redirect via middleware)
 */
export default function AuthCallbackPage() {
    const router = useRouter()

    useEffect(() => {
        // Read the type from the hash before the client clears it
        const hash = window.location.hash
        const params = new URLSearchParams(hash.replace('#', ''))
        const hashType = params.get('type')

        // onAuthStateChange fires once the client has exchanged the hash tokens
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!session) return

            if (event === 'PASSWORD_RECOVERY' || hashType === 'recovery') {
                router.replace('/set-password?type=recovery')
            } else if (event === 'SIGNED_IN' && hashType === 'invite') {
                router.replace('/set-password?type=invite')
            } else if (event === 'SIGNED_IN') {
                router.replace('/')
            }
        })

        return () => subscription.unsubscribe()
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
