import Link from 'next/link'
import Logo from '@/components/Logo'

export default function TermsOfUsePage() {
    return (
        <div className="min-h-screen bg-[#0f0f0c] text-white font-sans flex flex-col">
            <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#0f0f0c]/90 backdrop-blur-sm">
                <Link href="/">
                    <Logo iconSize={30} showText textColor="#f4f4f5" />
                </Link>
                <div className="flex items-center gap-3">
                    <Link href="/login" className="text-sm text-zinc-300 hover:text-white transition px-4 py-2">
                        Login
                    </Link>
                </div>
            </header>
            <main className="flex-1 max-w-4xl mx-auto px-8 py-16 w-full">
                <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
                <div className="prose prose-invert max-w-none text-zinc-300 space-y-8">
                    <p className="text-sm text-zinc-500">Last updated: March 2026</p>
                    
                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">1. Agreement to Terms</h2>
                        <p className="leading-relaxed">
                            These Terms of Use constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") 
                            and GreenTrace Compliance Platform ("Company", "we", "us", or "our"), concerning your access to and use of the GreenTrace platform.
                        </p>
                    </section>
                    
                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">2. Intellectual Property Rights</h2>
                        <p className="leading-relaxed">
                            Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, 
                            website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, 
                            service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">3. User Representations</h2>
                        <p className="leading-relaxed">
                            By using the Site, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; 
                            (2) you will maintain the accuracy of such information and promptly update such registration information as necessary; 
                            (3) you have the legal capacity and you agree to comply with these Terms of Use; 
                            (4) you will not use the Site for any illegal or unauthorized purpose.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">4. Prohibited Activities</h2>
                        <p className="leading-relaxed">
                            You may not access or use the Site for any purpose other than that for which we make the Site available. 
                            The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-4 text-zinc-400">
                            <li>Systematically retrieve data or other content from the Site to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.</li>
                            <li>Circumvent, disable, or otherwise interfere with security-related features of the Site.</li>
                            <li>Engage in unauthorized framing of or linking to the Site.</li>
                            <li>Use the Site in a manner inconsistent with any applicable laws or regulations.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">5. Disclaimer</h2>
                        <p className="leading-relaxed">
                            The site is provided on an as-is and as-available basis. You agree that your use of the site services will be at your sole risk. 
                            To the fullest extent permitted by law, we disclaim all warranties, express or implied, in connection with the site and your use thereof.
                        </p>
                    </section>
                </div>
            </main>
            
            <footer className="border-t border-white/5 px-8 py-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <Logo iconSize={24} showText textColor="#71717a" />
                        <p className="text-xs text-zinc-600 mt-1.5 max-w-xs">
                            Building full supply-chain traceability in the global palm oil supply chain through innovative data solutions.
                        </p>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-white/5 text-center text-xs text-zinc-700">
                    © 2026 GreenTrace Compliance Platform. All rights reserved.
                </div>
            </footer>
        </div>
    )
}
