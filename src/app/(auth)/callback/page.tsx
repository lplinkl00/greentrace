'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
    const router = useRouter()

    useEffect(() => {
        const hash = window.location.hash
        const params = new URLSearchParams(hash.replace('#', ''))

        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')

        if (!accessToken || !refreshToken) {
            router.replace('/login?error=invalid_token')
            return
        }

        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
            .then(({ error }) => {
                if (error) {
                    router.replace('/login?error=invalid_token')
                    return
                }
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
