'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard, Building2, ClipboardList, Users, FileText, Settings,
    ClipboardCheck, Package, Ship, BarChart3, LogOut, Factory,
} from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from './Logo'
import RoleSwitcher from './RoleSwitcher'

type NavItem = {
    href: string
    label: string
    icon: React.ElementType
}

type RoleCta = { href: string; label: string } | null

const NAV_CONFIG: Record<string, { items: NavItem[]; cta: RoleCta; roleLabel: string }> = {
    aggregator: {
        roleLabel: 'Super Admin',
        cta: null,
        items: [
            { href: '/aggregator/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/aggregator/companies', label: 'Company Portfolio', icon: Building2 },
            { href: '/aggregator/checklists', label: 'Checklists', icon: ClipboardList },
            { href: '/aggregator/regulation-profiles', label: 'Regulations', icon: FileText },
            { href: '/aggregator/users', label: 'Users', icon: Users },
            { href: '/aggregator/settings', label: 'Settings', icon: Settings },
        ],
    },
    company: {
        roleLabel: 'Company Staff',
        cta: { href: '/company/checklists', label: 'New Entry' },
        items: [
            { href: '/company/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/company/checklists', label: 'Compliance', icon: ClipboardCheck },
            { href: '/company/production', label: 'Production', icon: Factory },
            { href: '/company/shipments', label: 'Trade Ledger', icon: Ship },
            { href: '/company/imports', label: 'Imports', icon: Package },
            { href: '/company/settings', label: 'Settings', icon: Settings },
        ],
    },
    auditor: {
        roleLabel: 'Compliance Auditor',
        cta: { href: '/auditor/audits', label: 'New Audit' },
        items: [
            { href: '/auditor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/auditor/audits', label: 'Audit Queue', icon: ClipboardList },
            { href: '/auditor/companies', label: 'Company Directory', icon: Building2 },
            { href: '/auditor/reports', label: 'Reports', icon: BarChart3 },
            { href: '/auditor/settings', label: 'Settings', icon: Settings },
        ],
    },
}

type Props = {
    role: 'aggregator' | 'company' | 'auditor'
    user: { name: string; email: string; role: string } | null
}

function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatRole(role: string) {
    return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function AppSidebar({ role, user }: Props) {
    const pathname = usePathname()
    const router = useRouter()
    const [loggingOut, setLoggingOut] = useState(false)

    const config = NAV_CONFIG[role]

    async function handleLogout() {
        setLoggingOut(true)
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
    }

    return (
        <aside className="w-60 flex flex-col min-h-screen shrink-0 border-r border-sidebar-border"
            style={{ backgroundColor: '#1c1c1e' }}>
            {/* Logo + role badge */}
            <div className="px-5 pt-5 pb-4 border-b border-sidebar-border">
                <Logo iconSize={28} showText textColor="#f4f4f5" />
                <span className="mt-2.5 inline-block text-xs font-medium px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 uppercase tracking-wide">
                    {config.roleLabel}
                </span>
                {user?.role === 'SUPER_ADMIN' && <RoleSwitcher />}
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {config.items.map(item => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={[
                                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                                isActive
                                    ? 'text-orange-400 border-l-2 border-orange-500'
                                    : 'text-zinc-400 hover:text-zinc-100 border-l-2 border-transparent',
                            ].join(' ')}
                            style={isActive ? { backgroundColor: '#3a2010' } : undefined}
                        >
                            <Icon size={16} strokeWidth={2} className="shrink-0" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Optional CTA */}
            {config.cta && (
                <div className="px-3 pb-3">
                    <Link
                        href={config.cta.href}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-white text-sm font-semibold shadow hover:opacity-90 transition-opacity"
                        style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 50%, #e11d48 100%)' }}
                    >
                        + {config.cta.label}
                    </Link>
                </div>
            )}

            {/* User profile + logout */}
            {user && (
                <div className="px-3 pb-4 pt-3 border-t border-sidebar-border">
                    <div className="flex items-center gap-2.5 mb-3">
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                        >
                            {initials(user.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-zinc-100 truncate">{user.name}</p>
                            <p className="text-xs text-zinc-500 truncate">{formatRole(user.role)}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="flex items-center gap-2 w-full text-left text-xs text-zinc-500 hover:text-red-400 px-2 py-1.5 rounded transition-colors disabled:opacity-50"
                    >
                        <LogOut size={13} />
                        {loggingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                </div>
            )}
        </aside>
    )
}
