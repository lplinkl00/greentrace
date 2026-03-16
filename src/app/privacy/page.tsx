import Link from 'next/link'
import Logo from '@/components/Logo'

export default function PrivacyPolicyPage() {
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
                <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
                <div className="prose prose-invert max-w-none text-zinc-300 space-y-8">
                    <p className="text-sm text-zinc-500">Last updated: March 2026</p>
                    
                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
                        <p className="leading-relaxed">
                            Welcome to GreenTrace Compliance Platform. We respect your privacy and are committed to protecting your personal data. 
                            This privacy policy will inform you as to how we look after your personal data when you visit our website 
                            and tell you about your privacy rights and how the law protects you.
                        </p>
                    </section>
                    
                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">2. Data We Collect</h2>
                        <p className="leading-relaxed">
                            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-4 text-zinc-400">
                            <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                            <li><strong>Contact Data:</strong> includes billing address, email address and telephone numbers.</li>
                            <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location.</li>
                            <li><strong>Profile Data:</strong> includes your username and password, purchases or orders made by you, your interests, preferences, feedback and survey responses.</li>
                            <li><strong>Usage Data:</strong> includes information about how you use our website, products and services.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Data</h2>
                        <p className="leading-relaxed">
                            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-4 text-zinc-400">
                            <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                            <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                            <li>Where we need to comply with a legal obligation.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">4. Data Security</h2>
                        <p className="leading-relaxed">
                            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. 
                            In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">5. Contact Us</h2>
                        <p className="leading-relaxed">
                            If you have any questions about this privacy policy or our privacy practices, please contact us at privacy@greentrace.example.com.
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
