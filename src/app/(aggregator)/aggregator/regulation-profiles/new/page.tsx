'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const REGULATION_OPTIONS = [
    { value: 'ISCC_EU', label: 'ISCC EU' },
    { value: 'ISCC_PLUS', label: 'ISCC PLUS' },
    { value: 'RSPO_PC', label: 'RSPO PC' },
    { value: 'RSPO_SCCS', label: 'RSPO SCCS' },
]

export default function NewRegulationProfilePage() {
    const router = useRouter()
    const [regulation, setRegulation] = useState('ISCC_EU')
    const [version, setVersion] = useState('')
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        const res = await fetch('/api/regulation-profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ regulation, version, name, description }),
        })

        let json: Record<string, any> = {}
        try {
            json = await res.json()
        } catch {
            // response body was not JSON (e.g. plain-text 403)
        }

        if (!res.ok || json.error) {
            setError(json.error?.message ?? `Request failed (${res.status})`)
            setSubmitting(false)
            return
        }

        router.push('/aggregator/regulation-profiles')
    }

    return (
        <div className="max-w-lg space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">New Regulation Profile</h1>
                <a href="/aggregator/regulation-profiles" className="text-sm text-gray-500 hover:underline">
                    ← Back
                </a>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Regulation</label>
                        <select
                            value={regulation}
                            onChange={e => setRegulation(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        >
                            {REGULATION_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. 3.0"
                            value={version}
                            onChange={e => setVersion(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. ISCC EU 3.0"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition"
                        >
                            {submitting ? 'Creating…' : 'Create Profile'}
                        </button>
                        <a
                            href="/aggregator/regulation-profiles"
                            className="flex-1 text-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                            Cancel
                        </a>
                    </div>
                </form>
            </div>
        </div>
    )
}
