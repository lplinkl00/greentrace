'use client'

import { useState, useEffect } from 'react'

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

    useEffect(() => {
        fetch('/api/regulation-profiles')
            .then(res => res.json())
            .then(data => {
                setProfiles(data.data ?? [])
                setLoading(false)
            })
    }, [])

    if (loading) return <div className="text-gray-500 p-8">Loading profiles...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Regulation Profiles</h1>
            </div>
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <p className="px-6 py-4 text-sm text-gray-500 border-b">
                    Regulation profiles define the pillars, categories, and requirements that mills must track.
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
