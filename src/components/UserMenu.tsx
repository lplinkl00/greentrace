'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
    name: string
    email: string
    role: string
}

function formatRole(role: string) {
    return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function UserMenu({ name, email, role }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    async function handleLogout() {
        setLoading(true)
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
    }

    return (
        <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                    {initials(name)}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                    <p className="text-xs text-gray-400 truncate">{formatRole(role)}</p>
                </div>
            </div>
            <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full text-left text-sm text-red-600 hover:bg-red-50 px-2 py-1.5 rounded transition-colors disabled:opacity-50"
            >
                {loading ? 'Signing out...' : 'Sign out'}
            </button>
        </div>
    )
}
