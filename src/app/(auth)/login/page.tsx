'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'

const testimonials = [
    'Traceability across the entire palm oil supply chain.',
    'Real-time RSPO & MSPO compliance tracking.',
    'Trusted by 500+ industry leaders worldwide.',
]

function LoginForm() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const searchParams = useSearchParams()
    const registered = searchParams.get('registered') === 'true'

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
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

    return (
        <div className="flex min-h-screen bg-[#141414]">
            {/* ── Left panel: form ── */}
            <div className="flex flex-col justify-between w-full max-w-md px-10 py-10 shrink-0">
                {/* Logo */}
                <Logo iconSize={30} showText textColor="#f4f4f5" />

                {/* Form */}
                <div className="w-full space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
                        <p className="text-sm text-zinc-400 mt-1">
                            Please enter your details to access your dashboard.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                            {error}
                        </div>
                    )}

                    {registered && (
                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3">
                            Account created! Sign in below.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
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

                        {/* Password */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                    Password
                                </label>
                                <Link
                                    href="/reset-password"
                                    className="text-xs text-sunset-400 hover:text-sunset-300 transition"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-white/5 border border-white/10 text-white placeholder:text-zinc-600 rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-500/60 focus:border-sunset-500/60 transition"
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-lg bg-sunset-gradient text-white text-sm font-semibold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
                        >
                            {loading ? 'Signing in…' : 'Login to Platform'}
                        </button>
                    </form>

                    <p className="text-center text-xs text-zinc-500">
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="text-sunset-400 hover:text-sunset-300 transition">Sign up</Link>
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-zinc-600">
                    <span>© 2024 GreenTrace Compliance</span>
                    <div className="flex gap-4">
                        <a href="#" className="hover:text-zinc-400 transition">Privacy Policy</a>
                        <a href="#" className="hover:text-zinc-400 transition">Terms of Service</a>
                    </div>
                </div>
            </div>

            {/* ── Right panel: sunset gradient ── */}
            <div className="flex-1 relative overflow-hidden bg-sunset-gradient hidden lg:flex flex-col items-center justify-center p-12">
                {/* Glassy card */}
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

                {/* Bottom tag */}
                <p className="absolute bottom-8 left-12 text-xs text-white/40 uppercase tracking-widest font-medium">
                    Current Focus — RSPO NEXT Integration
                </p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    )
}
