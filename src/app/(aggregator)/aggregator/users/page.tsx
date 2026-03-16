'use client'

import { useState, useEffect } from 'react'
import { Users, UserCircle2, UserPlus } from 'lucide-react'

type User = {
    id: string
    name: string | null
    email: string
    role: string
    millId: string | null
    createdAt: string
}

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
    SUPER_ADMIN:        { bg: '#fef2f2', color: '#dc2626' },
    AGGREGATOR_MANAGER: { bg: '#fff7ed', color: '#c2410c' },
    MILL_MANAGER:       { bg: '#eff6ff', color: '#2563eb' },
    MILL_STAFF:         { bg: '#f4f4f5', color: '#52525b' },
    AUDITOR:            { bg: '#f0fdf4', color: '#15803d' },
}

const ROLE_LABEL: Record<string, string> = {
    SUPER_ADMIN:        'Super Admin',
    AGGREGATOR_MANAGER: 'Aggregator Manager',
    MILL_MANAGER:       'Mill Manager',
    MILL_STAFF:         'Mill Staff',
    AUDITOR:            'Auditor',
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/users')
            .then(r => r.json())
            .then(d => { setUsers(d.data ?? []); setLoading(false) })
            .catch(() => { setError('Failed to load users'); setLoading(false) })
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
        </div>
    )
    if (error) return <div className="text-red-500 text-sm p-4">{error}</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">Users</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">Manage platform users and their access roles.</p>
                </div>
                <button
                    disabled
                    title="Coming soon"
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white opacity-50 cursor-not-allowed transition"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                >
                    <UserPlus size={14} /> Invite User
                </button>
            </div>

            <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                {users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-300">
                        <Users size={32} className="mb-3" />
                        <p className="text-sm">No users found.</p>
                    </div>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-50 bg-zinc-50/60">
                                {['User', 'Email', 'Role', 'Mill'].map(h => (
                                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {users.map(user => {
                                const roleStyle = ROLE_STYLES[user.role] ?? { bg: '#f4f4f5', color: '#52525b' }
                                const roleLabel = ROLE_LABEL[user.role] ?? user.role
                                const initials = user.name
                                    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                    : user.email[0].toUpperCase()

                                return (
                                    <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}>
                                                    {initials}
                                                </div>
                                                <span className="font-medium text-zinc-800 text-sm">
                                                    {user.name ?? <span className="text-zinc-400 italic">Unnamed</span>}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5 text-zinc-500 text-xs">{user.email}</td>
                                        <td className="px-6 py-3.5">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                                style={{ backgroundColor: roleStyle.bg, color: roleStyle.color }}>
                                                {roleLabel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-zinc-400 text-xs">
                                            {user.millId ? (
                                                <span className="font-mono bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded text-xs">
                                                    {user.millId.slice(0, 8)}…
                                                </span>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
