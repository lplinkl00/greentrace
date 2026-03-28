import { describe, it, expect, mock } from 'bun:test'

const mockVerifyOtp = mock(async () => ({ error: null }))

mock.module('@supabase/ssr', () => ({
    createServerClient: () => ({
        auth: { verifyOtp: mockVerifyOtp },
    }),
}))

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xxx.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

const { GET } = await import('./route')

describe('GET /auth/confirm', () => {
    it('redirects to /login with error when token_hash is missing', async () => {
        const req = new Request('https://app.greentrace.xyz/auth/confirm?type=recovery')
        const res = await GET(req)
        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toContain('/login?error=invalid_token')
    })

    it('redirects to /login with error when type is missing', async () => {
        const req = new Request('https://app.greentrace.xyz/auth/confirm?token_hash=abc123')
        const res = await GET(req)
        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toContain('/login?error=invalid_token')
    })

    it('redirects to /set-password with type on successful recovery OTP', async () => {
        mockVerifyOtp.mockResolvedValueOnce({ error: null })
        const req = new Request('https://app.greentrace.xyz/auth/confirm?token_hash=abc123&type=recovery')
        const res = await GET(req)
        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toContain('/set-password?type=recovery')
    })

    it('redirects to /login with error when OTP verification fails', async () => {
        mockVerifyOtp.mockResolvedValueOnce({ error: new Error('expired token') })
        const req = new Request('https://app.greentrace.xyz/auth/confirm?token_hash=bad&type=recovery')
        const res = await GET(req)
        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toContain('/login?error=invalid_token')
    })
})
