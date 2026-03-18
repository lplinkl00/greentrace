'use client'

import { useState, useEffect } from 'react'

type Profile = {
    id: string
    name: string
    regulation: string
    isActive: boolean
}

type Company = {
    id: string
    name: string
    code: string
}

export default function NewChecklistPage() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [companies, setCompanies] = useState<Company[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [companyId, setCompanyId] = useState('')
    const [profileId, setProfileId] = useState('')
    const [periodStart, setPeriodStart] = useState('')
    const [periodEnd, setPeriodEnd] = useState('')

    useEffect(() => {
        Promise.all([
            fetch('/api/regulation-profiles').then(r => r.json()),
            fetch('/api/companies').then(r => r.json()),
        ]).then(([profilesData, companiesData]) => {
            setProfiles((profilesData.data ?? []).filter((p: Profile) => p.isActive))
            setCompanies(companiesData.data ?? [])
            setLoading(false)
        })
    }, [])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        const res = await fetch('/api/checklists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId, profileId, periodStart, periodEnd }),
        })

        const data = await res.json()

        if (!res.ok) {
            setError(data.error?.message ?? 'Failed to create checklist')
            setSubmitting(false)
            return
        }

        // Redirect to the new checklist
        window.location.href = `/aggregator/companies/${companyId}/checklists/${data.data.id}/review`
    }

    if (loading) return <div className="text-gray-500 p-8">Loading...</div>

    return (
        <div className="space-y-6 max-w-xl">
            <h1 className="text-2xl font-bold text-gray-900">Assign Regulation to Company</h1>
            <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">
                        {error}
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Company</label>
                    <select
                        required
                        value={companyId}
                        onChange={e => setCompanyId(e.target.value)}
                        className="mt-1 block w-full border rounded-md p-2 text-sm"
                    >
                        <option value="">Select a company…</option>
                        {companies.map(company => (
                            <option key={company.id} value={company.id}>
                                {company.name} ({company.code})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Regulation Profile</label>
                    <select
                        required
                        value={profileId}
                        onChange={e => setProfileId(e.target.value)}
                        className="mt-1 block w-full border rounded-md p-2 text-sm"
                    >
                        <option value="">Select a profile…</option>
                        {profiles.map(profile => (
                            <option key={profile.id} value={profile.id}>
                                {profile.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Period Start</label>
                        <input
                            type="date"
                            required
                            value={periodStart}
                            onChange={e => setPeriodStart(e.target.value)}
                            className="mt-1 block w-full border rounded-md p-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Period End</label>
                        <input
                            type="date"
                            required
                            value={periodEnd}
                            onChange={e => setPeriodEnd(e.target.value)}
                            className="mt-1 block w-full border rounded-md p-2 text-sm"
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                    {submitting ? 'Creating…' : 'Create Checklist'}
                </button>
            </form>
        </div>
    )
}
