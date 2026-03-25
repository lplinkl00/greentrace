import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
    const { email } = await request.json()

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const origin = new URL(request.url).origin

    try {
        // Generate a recovery link via admin API (bypasses Supabase SMTP)
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: {
                redirectTo: `${origin}/auth/confirm`,
            },
        })

        if (error) throw error

        // Build a direct link to /auth/confirm so our handler can call verifyOtp.
        // Using action_link (Supabase-hosted) causes Supabase to redirect back with
        // ?code= (PKCE) which our handler doesn't handle — token_hash is needed.
        const resetLink = `${origin}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery`

        // Send the email via Resend API directly
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Greentrace Admin <general@greentrace.xyz>',
                to: [email],
                subject: 'Reset your GreenTrace password',
                html: `
                    <p>Hi,</p>
                    <p>You requested a password reset for your GreenTrace account.</p>
                    <p>Click the link below to choose a new password:</p>
                    <p><a href="${resetLink}">Reset Password</a></p>
                    <p>This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
                    <p>— The GreenTrace Team</p>
                `,
            }),
        })

        if (!res.ok) {
            const body = await res.json()
            throw new Error(body.message ?? 'Failed to send email')
        }

        return NextResponse.json({ data: 'Password reset email sent', error: null })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
