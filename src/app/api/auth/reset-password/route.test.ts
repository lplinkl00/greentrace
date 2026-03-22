import { describe, it, expect, mock, beforeEach } from 'bun:test'

const mockGenerateLink = mock(async () => ({
    data: { properties: { action_link: 'https://sub.supabase.co/verify?token=xxx' } },
    error: null,
}))

mock.module('@supabase/supabase-js', () => ({
    createClient: () => ({
        auth: { admin: { generateLink: mockGenerateLink } },
    }),
}))

global.fetch = mock(async () => new Response('{}', { status: 200 })) as any

describe('POST /api/auth/reset-password', () => {
    beforeEach(() => {
        mockGenerateLink.mockClear()
        process.env.NEXT_PUBLIC_APP_URL = 'https://app.greentrace.xyz'
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xxx.supabase.co'
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
        process.env.RESEND_API_KEY = 'test-resend-key'
    })

    it('calls generateLink with redirectTo pointing to /auth/confirm', async () => {
        const { POST } = await import('./route')

        await POST(new Request('http://localhost/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'user@example.com' }),
        }))

        expect(mockGenerateLink).toHaveBeenCalledWith(
            expect.objectContaining({
                options: expect.objectContaining({
                    redirectTo: 'https://app.greentrace.xyz/auth/confirm',
                }),
            })
        )
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
