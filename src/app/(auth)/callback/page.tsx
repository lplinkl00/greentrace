'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Suspense } from 'react'

function CallbackHandler() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const type = searchParams.get('type')

    useEffect(() => {
        const hash = window.location.hash
        const params = new URLSearchParams(hash.replace('#', ''))

        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        // Fall back to hash type if query param not set
        const resolvedType = type ?? params.get('type')

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
                if (resolvedType === 'recovery' || resolvedType === 'invite') {
                    router.replace(`/set-password?type=${resolvedType}`)
                } else {
                    router.replace('/')
                }
            })
    }, [router, type])

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#141414]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-sunset-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-zinc-500">Verifying your link…</p>
            </div>
        </div>
    )
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-[#141414]">
                <div className="w-6 h-6 border-2 border-sunset-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <CallbackHandler />
        </Suspense>
    )
}
