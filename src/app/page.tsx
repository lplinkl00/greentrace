import Link from 'next/link'
import Logo from '@/components/Logo'
import { CheckCircle2, ArrowRight, BarChart3, Globe2, Zap } from 'lucide-react'

const features = [
    {
        icon: CheckCircle2,
        title: 'Compliance Tracking',
        description:
            "Monitor your company's real-time compliance posture across RSPO, MSPO, and ISPO frameworks with detailed audit trails.",
        link: 'Learn more',
    },
    {
        icon: Globe2,
        title: 'Supply Chain Visibility',
        description:
            'Full traceability from plantation to port. Verify and certify data across every tier of your palm oil supply chain.',
        link: 'Learn more',
    },
    {
        icon: Zap,
        title: 'Automated Reporting',
        description:
            'Generate regulator-ready ESG reports that satisfy RSPO NEXT requirements and reduce reporting time by 80%.',
        link: 'Learn more',
    },
]

const navLinks = ['Solutions', 'Traceability', 'Compliance', 'Pricing']

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#0f0f0c] text-white font-sans">
            {/* ── Nav ── */}
            <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 sticky top-0 z-50 bg-[#0f0f0c]/90 backdrop-blur-sm">
                <Logo iconSize={30} showText textColor="#f4f4f5" />
                <nav className="hidden md:flex items-center gap-7">
                    {navLinks.map(l => (
                        <a key={l} href="#" className="text-sm text-zinc-400 hover:text-white transition">
                            {l}
                        </a>
                    ))}
                </nav>
                <div className="flex items-center gap-3">
                    <Link href="/login" className="text-sm text-zinc-300 hover:text-white transition px-4 py-2">
                        Login
                    </Link>
                    <Link
                        href="/login"
                        className="text-sm font-semibold bg-sunset-gradient px-4 py-2 rounded-lg text-white hover:opacity-90 transition"
                    >
                        Get Started
                    </Link>
                </div>
            </header>

            {/* ── Hero ── */}
            <section className="px-8 pt-20 pb-16 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                <div>
                    <span className="inline-block text-xs font-semibold uppercase tracking-widest text-sunset-400 mb-4">
                        ESG Compliance
                    </span>
                    <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
                        Palm Oil<br />
                        <span className="bg-sunset-gradient bg-clip-text text-transparent">Compliance</span>{' '}
                        Simplified.
                    </h1>
                    <p className="text-zinc-400 text-lg mb-8 leading-relaxed max-w-md">
                        Track, verify, and report your sustainable palm oil operations with our
                        integrated compliance platform. Built for the modern ESG era.
                    </p>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 bg-sunset-gradient px-6 py-3 rounded-lg text-white font-semibold text-sm hover:opacity-90 transition shadow-lg"
                        >
                            Start Your Journey <ArrowRight size={15} />
                        </Link>
                        <a href="#" className="text-sm text-zinc-400 hover:text-white transition border border-white/10 px-6 py-3 rounded-lg">
                            View Live Demo
                        </a>
                    </div>
                    <p className="mt-6 text-xs text-zinc-600">
                        Trusted by 500+ palm oil producers and retailers worldwide.
                    </p>
                </div>

                {/* Hero visual placeholder */}
                <div className="relative hidden lg:block">
                    <div className="w-full aspect-[4/3] rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-end">
                        {/* Mock dashboard preview card */}
                        <div className="w-full bg-[#1a1a1a]/90 backdrop-blur p-4 rounded-b-2xl border-t border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full bg-sunset-500" />
                                <span className="text-xs text-zinc-400">LIVE — Monitoring West Kalimantan Sector 4</span>
                            </div>
                            <div className="flex gap-4">
                                {['Compliance 94%', 'Pending 12', 'Volume 1,240 MT'].map(s => (
                                    <div key={s} className="flex-1 bg-white/5 rounded-lg px-3 py-2">
                                        <p className="text-xs text-zinc-500">{s.split(' ')[0]}</p>
                                        <p className="text-sm font-semibold text-white">{s.split(' ').slice(1).join(' ')}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Feature strip ── */}
            <section className="bg-[#141410] py-20 px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl font-bold mb-3">Streamline Your ESG Compliance Lifecycle</h2>
                        <p className="text-zinc-400 text-sm max-w-xl mx-auto">
                            GreenTrace provides an end-to-end ecosystem to drive all stages of the highest environmental standards.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {features.map(f => {
                            const Icon = f.icon
                            return (
                                <div
                                    key={f.title}
                                    className="bg-white/3 border border-white/8 rounded-xl p-6 hover:border-sunset-500/30 transition group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-sunset-500/15 flex items-center justify-center mb-4">
                                        <Icon size={18} className="text-sunset-400" />
                                    </div>
                                    <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                                    <p className="text-sm text-zinc-400 leading-relaxed mb-4">{f.description}</p>
                                    <a href="#" className="text-xs text-sunset-400 flex items-center gap-1 hover:gap-2 transition-all">
                                        {f.link} <ArrowRight size={12} />
                                    </a>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* ── CTA banner ── */}
            <section className="px-8 py-20">
                <div className="max-w-4xl mx-auto bg-sunset-gradient rounded-2xl p-12 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/10 rounded-2xl" />
                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold text-white mb-3">
                            Ready to secure your supply chain?
                        </h2>
                        <p className="text-white/80 text-sm mb-8">
                            Join the world&apos;s most sustainable palm oil producers and retailers. Start your 30-day free trial.
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            <Link
                                href="/login"
                                className="bg-white text-sunset-600 font-semibold text-sm px-6 py-3 rounded-lg hover:bg-white/90 transition"
                            >
                                Get Started Free
                            </Link>
                            <a href="#" className="text-white/90 text-sm border border-white/30 px-6 py-3 rounded-lg hover:bg-white/10 transition">
                                Talk to an Expert
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="border-t border-white/5 px-8 py-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <Logo iconSize={24} showText textColor="#71717a" />
                        <p className="text-xs text-zinc-600 mt-1.5 max-w-xs">
                            Building full supply-chain traceability in the global palm oil supply chain through innovative data solutions.
                        </p>
                    </div>
                    <div className="flex gap-8 text-xs text-zinc-500">
                        {['Privacy Policy', 'About', 'Press', 'Cookie Policy', 'Contact Us', 'Terms'].map(l => (
                            <Link key={l} href={l === 'Privacy Policy' ? '/privacy' : l === 'Terms' ? '/terms' : '#'} className="hover:text-zinc-300 transition">{l}</Link>
                        ))}
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-white/5 text-center text-xs text-zinc-700">
                    © 2024 GreenTrace Compliance Platform. All rights reserved.
                </div>
            </footer>
        </div>
    )
}
