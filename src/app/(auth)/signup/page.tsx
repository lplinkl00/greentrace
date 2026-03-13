'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, User, Building2, Globe, KeyRound, CheckCircle2 } from 'lucide-react'
import Logo from '@/components/Logo'

const testimonials = [
    'Traceability across the entire palm oil supply chain.',
    'Real-time RSPO & MSPO compliance tracking.',
    'Trusted by 500+ industry leaders worldwide.',
]

export default function SignupPage() {
    const router = useRouter()
    const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '', country: '', inviteCode: '' })
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    function set(field: string) {
        return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error ?? 'Something went wrong')
            } else {
                router.push('/login?registered=true')
            }
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "w-full bg-white/5 border border-white/10 text-white placeholder:text-zinc-600 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-500/60 focus:border-sunset-500/60 transition"
    const labelClass = "text-xs font-medium text-zinc-400 uppercase tracking-wide"

    return (
        <div className="flex min-h-screen bg-[#141414]">
            {/* Left panel */}
            <div className="flex flex-col justify-between w-full max-w-md px-10 py-10 shrink-0">
                <Logo iconSize={30} showText textColor="#f4f4f5" />

                <div className="w-full space-y-5">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Create your account</h1>
                        <p className="text-sm text-zinc-400 mt-1">
                            You&apos;ll need an invite code to register as a Super Admin.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3.5">
                        <div className="space-y-1.5">
                            <label className={labelClass}>Full Name</label>
                            <div className="relative">
                                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input type="text" placeholder="Jane Smith" value={form.name} onChange={set('name')} required className={inputClass} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className={labelClass}>Email Address</label>
                            <div className="relative">
                                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input type="email" placeholder="jane@company.com" value={form.email} onChange={set('email')} required className={inputClass} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className={labelClass}>Password</label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={set('password')}
                                    required
                                    minLength={8}
                                    className="w-full bg-white/5 border border-white/10 text-white placeholder:text-zinc-600 rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-500/60 focus:border-sunset-500/60 transition"
                                />
                                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition">
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className={labelClass}>Company Name</label>
                            <div className="relative">
                                <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input type="text" placeholder="Acme Palm Oil Sdn Bhd" value={form.companyName} onChange={set('companyName')} required className={inputClass} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className={labelClass}>Country</label>
                            <div className="relative">
                                <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input type="text" placeholder="Malaysia" value={form.country} onChange={set('country')} required className={inputClass} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className={labelClass}>Invite Code</label>
                            <div className="relative">
                                <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input type="text" placeholder="Paste your invite code" value={form.inviteCode} onChange={set('inviteCode')} required className={inputClass} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-lg bg-sunset-gradient text-white text-sm font-semibold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 mt-1"
                        >
                            {loading ? 'Creating account…' : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-center text-xs text-zinc-500">
                        Already have an account?{' '}
                        <Link href="/login" className="text-sunset-400 hover:text-sunset-300 transition">Sign in</Link>
                    </p>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-600">
                    <span>© 2024 GreenTrace Compliance</span>
                    <div className="flex gap-4">
                        <a href="#" className="hover:text-zinc-400 transition">Privacy Policy</a>
                        <a href="#" className="hover:text-zinc-400 transition">Terms of Service</a>
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
