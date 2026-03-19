# Auth Password Flows Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a working forgot-password flow and invite accept flow, both converging on a styled set-password page.

**Architecture:** A server-side `/auth/confirm` route handler exchanges Supabase OTP tokens (type=recovery or type=invite) for a session, then redirects to `/set-password`. The reset-password page handles the "enter email" step. All pages share the existing dark two-panel layout.

**Tech Stack:** Next.js 14 App Router, `@supabase/ssr`, `@supabase/supabase-js`, Tailwind CSS, lucide-react

---

### Task 1: Add `/auth/confirm` route handler

**Files:**
- Create: `src/app/auth/confirm/route.ts`

**Step 1: Create the route handler**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as 'invite' | 'recovery' | null

    if (!token_hash || !type) {
        return NextResponse.redirect(`${origin}/login?error=invalid_token`)
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    )

    const { error } = await supabase.auth.verifyOtp({ token_hash, type })

    if (error) {
        return NextResponse.redirect(`${origin}/login?error=invalid_token`)
    }

    return NextResponse.redirect(`${origin}/set-password?type=${type}`)
}
```

**Step 2: Update middleware to allow `/auth/confirm` and `/set-password`**

In `src/middleware.ts`, find the `isAuthRoute` block and add the two new paths:

```ts
const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
    || request.nextUrl.pathname.startsWith('/reset-password')
    || request.nextUrl.pathname.startsWith('/signup')
    || request.nextUrl.pathname.startsWith('/auth/confirm')
    || request.nextUrl.pathname.startsWith('/set-password')
```

**Step 3: Verify manually**

Start dev server (`bun dev`), visit `/auth/confirm` without params — should redirect to `/login?error=invalid_token`.

**Step 4: Commit**

```bash
git add src/app/auth/confirm/route.ts src/middleware.ts
git commit -m "feat: add /auth/confirm token exchange route handler"
```

---

### Task 2: Replace `/reset-password` page (enter email step)

**Files:**
- Modify: `src/app/(auth)/reset-password/page.tsx`

**Step 1: Replace the stub with the working page**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'

const testimonials = [
    'Traceability across the entire palm oil supply chain.',
    'Real-time RSPO & MSPO compliance tracking.',
    'Trusted by 500+ industry leaders worldwide.',
]

export default function ResetPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/confirm?next=/set-password`,
            })
            if (error) {
                setError(error.message)
            } else {
                setSent(true)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen bg-[#141414]">
            {/* Left panel */}
            <div className="flex flex-col justify-between w-full max-w-md px-10 py-10 shrink-0">
                <Logo iconSize={30} showText textColor="#f4f4f5" />

                <div className="w-full space-y-6">
                    {sent ? (
                        <div className="space-y-4">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                <CheckCircle2 size={20} className="text-green-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Check your inbox</h1>
                                <p className="text-sm text-zinc-400 mt-1">
                                    We&apos;ve sent a password reset link to <span className="text-zinc-200">{email}</span>.
                                </p>
                            </div>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-sm text-sunset-400 hover:text-sunset-300 transition"
                            >
                                <ArrowLeft size={14} />
                                Back to login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Reset your password</h1>
                                <p className="text-sm text-zinc-400 mt-1">
                                    Enter your email and we&apos;ll send you a reset link.
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                        <input
                                            type="email"
                                            placeholder="name@company.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                            className="w-full bg-white/5 border border-white/10 text-white placeholder:text-zinc-600 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-500/60 focus:border-sunset-500/60 transition"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2.5 rounded-lg bg-sunset-gradient text-white text-sm font-semibold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
                                >
                                    {loading ? 'Sending…' : 'Send Reset Link'}
                                </button>
                            </form>

                            <p className="text-center text-xs text-zinc-500">
                                Remember your password?{' '}
                                <Link href="/login" className="text-sunset-400 hover:text-sunset-300 transition">
                                    Sign in
                                </Link>
                            </p>
                        </>
                    )}
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-600">
                    <span>© 2024 GreenTrace Compliance</span>
                    <div className="flex gap-4">
                        <Link href="/privacy" className="hover:text-zinc-400 transition">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-zinc-400 transition">Terms of Service</Link>
                    </div>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 relative overflow-hidden bg-sunset-gradient hidden lg:flex flex-col items-center justify-center p-12">
                <div className="relative z-10 max-w-sm w-full bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
                    <CheckCircle2 className="text-white mb-5" size={28} />
                    <h2 className="text-2xl font-bold text-white leading-snug mb-3">
                        Pioneering Sustainable Palm Oil Compliance.
                    </h2>
                    <p className="text-sm text-white/80 leading-relaxed mb-6">
                        GreenTrace empowers organisations with real-time data insights to ensure
                        ethical sourcing and environmental responsibility across the entire supply chain.
                    </p>
                    <ul className="space-y-2.5">
                        {testimonials.map(t => (
                            <li key={t} className="flex items-start gap-2.5 text-xs text-white/80">
                                <span className="mt-0.5 w-3.5 h-3.5 shrink-0 rounded-full bg-white/30 flex items-center justify-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                </span>
                                {t}
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="absolute bottom-8 left-12 text-xs text-white/40 uppercase tracking-widest font-medium">
                    Current Focus — RSPO NEXT Integration
                </p>
            </div>
        </div>
    )
}
```

**Step 2: Verify manually**

Visit `/reset-password` — should show the email form. Submit with a real email — should transition to "Check your inbox" success state. Submit with a bad email format — browser validation should block.

**Step 3: Commit**

```bash
git add src/app/(auth)/reset-password/page.tsx
git commit -m "feat: implement reset-password email form with success state"
```

---

### Task 3: Create `/set-password` page

**Files:**
- Create: `src/app/(auth)/set-password/page.tsx`

**Step 1: Create the page**

```tsx
'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'

const testimonials = [
    'Traceability across the entire palm oil supply chain.',
    'Real-time RSPO & MSPO compliance tracking.',
    'Trusted by 500+ industry leaders worldwide.',
]

function SetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const type = searchParams.get('type') ?? 'recovery'

    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isInvite = type === 'invite'

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        if (password !== confirm) {
            setError('Passwords do not match.')
            return
        }
        setLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) {
                setError(error.message)
            } else {
                router.push('/')
                router.refresh()
            }
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "w-full bg-white/5 border border-white/10 text-white placeholder:text-zinc-600 rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-500/60 focus:border-sunset-500/60 transition"

    return (
        <div className="flex min-h-screen bg-[#141414]">
            {/* Left panel */}
            <div className="flex flex-col justify-between w-full max-w-md px-10 py-10 shrink-0">
                <Logo iconSize={30} showText textColor="#f4f4f5" />

                <div className="w-full space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            {isInvite ? 'Welcome to GreenTrace' : 'Choose a new password'}
                        </h1>
                        <p className="text-sm text-zinc-400 mt-1">
                            {isInvite
                                ? 'Set your password to get started.'
                                : 'Enter a new password for your account.'}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                Password
                            </label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className={inputClass}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    required
                                    minLength={8}
                                    className={inputClass}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(v => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                                >
                                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-lg bg-sunset-gradient text-white text-sm font-semibold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
                        >
                            {loading ? 'Saving…' : isInvite ? 'Set Password & Continue' : 'Update Password'}
                        </button>
                    </form>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-600">
                    <span>© 2024 GreenTrace Compliance</span>
                    <div className="flex gap-4">
                        <Link href="/privacy" className="hover:text-zinc-400 transition">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-zinc-400 transition">Terms of Service</Link>
                    </div>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 relative overflow-hidden bg-sunset-gradient hidden lg:flex flex-col items-center justify-center p-12">
                <div className="relative z-10 max-w-sm w-full bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
                    <CheckCircle2 className="text-white mb-5" size={28} />
                    <h2 className="text-2xl font-bold text-white leading-snug mb-3">
                        Pioneering Sustainable Palm Oil Compliance.
                    </h2>
                    <p className="text-sm text-white/80 leading-relaxed mb-6">
                        GreenTrace empowers organisations with real-time data insights to ensure
                        ethical sourcing and environmental responsibility across the entire supply chain.
                    </p>
                    <ul className="space-y-2.5">
                        {testimonials.map(t => (
                            <li key={t} className="flex items-start gap-2.5 text-xs text-white/80">
                                <span className="mt-0.5 w-3.5 h-3.5 shrink-0 rounded-full bg-white/30 flex items-center justify-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                </span>
                                {t}
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="absolute bottom-8 left-12 text-xs text-white/40 uppercase tracking-widest font-medium">
                    Current Focus — RSPO NEXT Integration
                </p>
            </div>
        </div>
    )
}

export default function SetPasswordPage() {
    return (
        <Suspense>
            <SetPasswordForm />
        </Suspense>
    )
}
```

**Step 2: Verify manually**

Visit `/set-password?type=invite` — heading should read "Welcome to GreenTrace". Visit `/set-password?type=recovery` — heading should read "Choose a new password". Submit mismatched passwords — should show "Passwords do not match." error inline.

**Step 3: Commit**

```bash
git add src/app/(auth)/set-password/page.tsx
git commit -m "feat: add set-password page for invite and recovery flows"
```

---

### Task 4: Configure Supabase redirect URL

**Context:** Supabase restricts which URLs it will redirect to after token verification. The `/auth/confirm` route must be added to the allowed redirect list in the Supabase dashboard, otherwise invite/reset emails will be blocked.

**Step 1: Add the redirect URL in Supabase dashboard**

1. Go to your Supabase project → Authentication → URL Configuration
2. Under "Redirect URLs", add: `http://localhost:3000/auth/confirm`
3. Also add the production URL when deploying: `https://<your-domain>/auth/confirm`

**Step 2: Verify the full invite flow end-to-end**

1. Send a test invite: run the invite script from earlier with a test email
2. Click the link in the email
3. Should land on `/set-password?type=invite` with "Welcome to GreenTrace" heading
4. Set a password → should redirect to the correct dashboard

**Step 3: Verify the full reset flow end-to-end**

1. Go to `/login`, click "Forgot password?"
2. Enter a real user's email → "Check your inbox" success state appears
3. Click the link in the email → lands on `/set-password?type=recovery`
4. Set a new password → should redirect to dashboard and be able to log in with new password

**Step 4: Final commit (if any config file changes were needed)**

```bash
git add .
git commit -m "chore: verify auth flows end-to-end"
```
