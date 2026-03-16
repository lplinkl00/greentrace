'use client'

import { useState, useEffect } from 'react'

type Requirement = {
    id: string
    code: string
    name: string
    dataType: string
    criticality: string
    unit: string | null
    requiresForm: boolean
}

type Category = {
    id: string
    code: string
    name: string
    requirements: Requirement[]
}

type Pillar = {
    id: string
    code: string
    name: string
    categories: Category[]
}

type Profile = {
    id: string
    name: string
    regulation: string
    version: string
    description: string | null
    pillars: Pillar[]
}

const DATA_TYPE_LABELS: Record<string, string> = {
    ABSOLUTE_QUANTITY: 'Quantity',
    RATE: 'Rate',
    DOCUMENT_ONLY: 'Document',
    TEXT_RESPONSE: 'Text',
}

const CRITICALITY_COLORS: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700',
    NON_CRITICAL: 'bg-yellow-100 text-yellow-700',
}

export default function RegulationProfileDetailPage({
    params,
}: {
    params: { profileId: string }
}) {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [openPillars, setOpenPillars] = useState<Set<string>>(new Set())
    const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())

    useEffect(() => {
        fetch(`/api/regulation-profiles/${params.profileId}`)
            .then(res => res.json())
            .then(data => {
                setProfile(data.data)
                setLoading(false)
                // Open first pillar by default
                if (data.data?.pillars?.length > 0) {
                    setOpenPillars(new Set([data.data.pillars[0].id]))
                }
            })
    }, [params.profileId])

    if (loading) return <div className="text-gray-500 p-8">Loading profile...</div>
    if (!profile) return <div className="text-red-500 p-8">Profile not found.</div>

    const togglePillar = (id: string) => {
        setOpenPillars(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const toggleCategory = (id: string) => {
        setOpenCategories(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const totalRequirements = profile.pillars
        .flatMap(p => p.categories)
        .flatMap(c => c.requirements).length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                    {profile.description && (
                        <p className="mt-1 text-sm text-gray-500">{profile.description}</p>
                    )}
                </div>
                <div className="text-sm text-gray-500">
                    {profile.pillars.length} pillars · {profile.pillars.flatMap(p => p.categories).length} categories · {totalRequirements} requirements
                </div>
            </div>

            <div className="space-y-3">
                {profile.pillars.map(pillar => (
                    <div key={pillar.id} className="bg-white shadow rounded-lg overflow-hidden">
                        <button
                            onClick={() => togglePillar(pillar.id)}
                            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                    {pillar.code}
                                </span>
                                <span className="font-semibold text-gray-900">{pillar.name}</span>
                                <span className="text-xs text-gray-400">
                                    {pillar.categories.length} categories
                                </span>
                            </div>
                            <span className="text-gray-400">{openPillars.has(pillar.id) ? '▲' : '▼'}</span>
                        </button>

                        {openPillars.has(pillar.id) && (
                            <div className="border-t divide-y">
                                {pillar.categories.map(cat => (
                                    <div key={cat.id}>
                                        <button
                                            onClick={() => toggleCategory(cat.id)}
                                            className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-gray-50 bg-gray-50"
                                        >
                                            <div className="flex items-center gap-3 ml-4">
                                                <span className="text-xs font-mono bg-white border text-gray-600 px-2 py-0.5 rounded">
                                                    {cat.code}
                                                </span>
                                                <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                                                <span className="text-xs text-gray-400">
                                                    {cat.requirements.length} requirements
                                                </span>
                                            </div>
                                            <span className="text-gray-400 text-xs">{openCategories.has(cat.id) ? '▲' : '▼'}</span>
                                        </button>

                                        {openCategories.has(cat.id) && (
                                            <div className="divide-y bg-white">
                                                {cat.requirements.map(req => (
                                                    <div key={req.id} className="px-6 py-3 ml-8 flex items-start gap-4">
                                                        <span className="text-xs font-mono text-gray-400 mt-0.5 shrink-0">
                                                            {req.code}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-gray-900">{req.name}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-xs text-gray-500">
                                                                {DATA_TYPE_LABELS[req.dataType] ?? req.dataType}
                                                                {req.unit ? ` (${req.unit})` : ''}
                                                            </span>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CRITICALITY_COLORS[req.criticality] ?? 'bg-gray-100 text-gray-600'}`}>
                                                                {req.criticality === 'CRITICAL' ? 'Major' : 'Minor'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
