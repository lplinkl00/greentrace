import { describe, it, expect, mock, beforeEach } from 'bun:test'

const mockGenerateLink = mock(async () => ({
    data: {
        properties: {
            action_link: 'https://sub.supabase.co/auth/v1/verify?token=xxx',
            hashed_token: 'abc123hashedtoken',
            email_otp: '123456',
            redirect_to: 'https://app.greentrace.xyz/auth/confirm',
            verification_type: 'recovery',
        },
    },
    error: null,
}))

mock.module('@supabase/supabase-js', () => ({
    createClient: () => ({
        auth: { admin: { generateLink: mockGenerateLink } },
    }),
}))

let lastFetchBody: any = null
global.fetch = mock(async (_url: any, opts: any) => {
    lastFetchBody = JSON.parse(opts?.body ?? '{}')
    return new Response('{}', { status: 200 })
}) as any

describe('POST /api/auth/reset-password', () => {
    beforeEach(() => {
        mockGenerateLink.mockClear()
        lastFetchBody = null
        process.env.NEXT_PUBLIC_APP_URL = 'https://app.greentrace.xyz'
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xxx.supabase.co'
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
        process.env.RESEND_API_KEY = 'test-resend-key'
    })

    it('sends email with direct /auth/confirm?token_hash link (not Supabase-hosted action_link)', async () => {
        const { POST } = await import('./route')

        await POST(new Request('http://localhost/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'user@example.com' }),
        }))

        const emailHtml: string = lastFetchBody?.html ?? ''
        expect(emailHtml).toContain('https://app.greentrace.xyz/auth/confirm')
        expect(emailHtml).toContain('token_hash=abc123hashedtoken')
        expect(emailHtml).toContain('type=recovery')
        // Must NOT send the Supabase-hosted verification URL
        expect(emailHtml).not.toContain('sub.supabase.co')
    })

    it('returns 400 when email is missing', async () => {
        const { POST } = await import('./route')

        const res = await POST(new Request('http://localhost/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        }))

        expect(res.status).toBe(400)
    })
})
