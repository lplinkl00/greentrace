'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Profile = {
    id: string
    regulation: string
    version: string
    name: string
    isActive: boolean
    _count: { pillars: number }
}

const REGULATION_LABELS: Record<string, string> = {
    ISCC_EU: 'ISCC EU',
    ISCC_PLUS: 'ISCC PLUS',
    RSPO_PC: 'RSPO PC',
    RSPO_SCCS: 'RSPO SCCS',
}

export default function RegulationProfilesPage() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<string | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserRole(data.user?.user_metadata?.role ?? null)
        })
    }, [])

    useEffect(() => {
        fetch('/api/regulation-profiles')
            .then(res => res.json())
            .then(data => {
                setProfiles(data.data ?? [])
                setLoading(false)
            })
            .catch(() => { setError('Failed to load regulation profiles'); setLoading(false) })
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
                <h1 className="text-2xl font-bold text-gray-900">Regulation Profiles</h1>
                {userRole === 'SUPER_ADMIN' && (
                    <a
                        href="/aggregator/regulation-profiles/new"
                        className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition"
                    >
                        + New Profile
                    </a>
                )}
            </div>
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <p className="px-6 py-4 text-sm text-gray-500 border-b">
                    Regulation profiles define the pillars, categories, and requirements that companies must track.
                    Each checklist is pinned to the profile version it was created from.
                </p>
                {profiles.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">No profiles found.</p>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3 text-left">Name</th>
                                <th className="px-6 py-3 text-left">Regulation</th>
                                <th className="px-6 py-3 text-left">Version</th>
                                <th className="px-6 py-3 text-left">Pillars</th>
                                <th className="px-6 py-3 text-left">Active</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                            {profiles.map(profile => (
                                <tr key={profile.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{profile.name}</td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {REGULATION_LABELS[profile.regulation] ?? profile.regulation}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{profile.version}</td>
                                    <td className="px-6 py-4 text-gray-600">{profile._count.pillars}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            profile.isActive
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {profile.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <a
                                            href={`/aggregator/regulation-profiles/${profile.id}`}
                                            className="text-green-600 hover:underline font-medium text-sm"
                                        >
                                            View →
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
