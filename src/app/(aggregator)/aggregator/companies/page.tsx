'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Factory, MapPin, Plus, CheckCircle2, XCircle } from 'lucide-react'

type Company = {
    id: string
    name: string
    code: string
    location: string | null
    country: string | null
    isActive: boolean
    createdAt: string
}

export default function CompanyListPage() {
    const [companies, setCompanies] = useState<Company[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const [showModal, setShowModal] = useState(false)
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)
    const [form, setForm] = useState({ name: '', code: '', location: '', country: '' })

    useEffect(() => {
        fetch('/api/companies')
            .then(r => r.json())
            .then(d => { setCompanies(d.data ?? []); setLoading(false) })
            .catch(() => { setError('Failed to load companies'); setLoading(false) })
    }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim() || !form.code.trim()) {
            setCreateError('Company name and code are required.')
            return
        }
        setCreating(true)
        setCreateError(null)
        const res = await fetch('/api/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        })
        const data = await res.json()
        setCreating(false)
        if (!res.ok) {
            setCreateError(data.error?.message ?? 'Failed to create company.')
            return
        }
        setCompanies(prev => [data.data, ...prev])
        setShowModal(false)
        setForm({ name: '', code: '', location: '', country: '' })
    }

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
                    <h1 className="text-xl font-bold text-zinc-900">Companies</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">Manage all registered companies in the network.</p>
                </div>
                <button
                    onClick={() => { setShowModal(true); setCreateError(null) }}
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white transition hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                >
                    <Plus size={14} /> Add Company
                </button>
            </div>

            <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                {companies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-300">
                        <Factory size={32} className="mb-3" />
                        <p className="text-sm">No companies registered yet.</p>
                    </div>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-50 bg-zinc-50/60">
                                {['Company Name', 'Code', 'Location', 'Country', 'Status'].map(h => (
                                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {companies.map(company => (
                                <tr
                                    key={company.id}
                                    onClick={() => router.push(`/aggregator/companies/${company.id}`)}
                                    className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                                >
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                                                <Factory size={14} className="text-orange-400" />
                                            </div>
                                            <span className="font-medium text-zinc-800 text-sm">{company.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <span className="font-mono text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                                            {company.code}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-zinc-500 text-xs">
                                        {company.location ? (
                                            <span className="flex items-center gap-1">
                                                <MapPin size={11} className="text-zinc-300" />
                                                {company.location}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-6 py-3.5 text-zinc-500 text-xs">{company.country ?? '—'}</td>
                                    <td className="px-6 py-3.5">
                                        {company.isActive ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                                style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>
                                                <CheckCircle2 size={10} /> Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                                style={{ backgroundColor: '#f4f4f5', color: '#71717a' }}>
                                                <XCircle size={10} /> Inactive
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold text-zinc-900 mb-4">Add Company</h2>
                        {createError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
                                {createError}
                            </div>
                        )}
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Company Name *</label>
                                <input
                                    required
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                                    placeholder="e.g. Sunrise Palm Mill"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Company Code *</label>
                                <input
                                    required
                                    type="text"
                                    value={form.code}
                                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-300"
                                    placeholder="e.g. MY-SR-003"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Location</label>
                                <input
                                    type="text"
                                    value={form.location}
                                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                                    placeholder="e.g. Jalan Sawit 1, Kuala Lumpur"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Country</label>
                                <input
                                    type="text"
                                    value={form.country}
                                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                                    placeholder="e.g. Malaysia"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 text-sm font-medium px-4 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 text-sm font-semibold px-4 py-2 rounded-lg text-white transition disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                                >
                                    {creating ? 'Creating…' : 'Create Company'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
