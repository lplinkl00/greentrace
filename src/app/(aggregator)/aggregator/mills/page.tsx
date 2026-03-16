'use client'

import { useState, useEffect } from 'react'
import { Factory, MapPin, Plus, CheckCircle2, XCircle } from 'lucide-react'

type Mill = {
    id: string
    name: string
    code: string
    location: string | null
    country: string | null
    isActive: boolean
    createdAt: string
}

export default function MillListPage() {
    const [mills, setMills] = useState<Mill[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/mills')
            .then(r => r.json())
            .then(d => { setMills(d.data ?? []); setLoading(false) })
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">Mills</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">Manage all registered palm oil mills in the network.</p>
                </div>
                <button
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                >
                    <Plus size={14} /> Add Mill
                </button>
            </div>

            <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                {mills.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-300">
                        <Factory size={32} className="mb-3" />
                        <p className="text-sm">No mills registered yet.</p>
                    </div>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-50 bg-zinc-50/60">
                                {['Mill Name', 'Code', 'Location', 'Country', 'Status'].map(h => (
                                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {mills.map(mill => (
                                <tr key={mill.id} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                                                <Factory size={14} className="text-orange-400" />
                                            </div>
                                            <span className="font-medium text-zinc-800 text-sm">{mill.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <span className="font-mono text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                                            {mill.code}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-zinc-500 text-xs">
                                        {mill.location ? (
                                            <span className="flex items-center gap-1">
                                                <MapPin size={11} className="text-zinc-300" />
                                                {mill.location}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-6 py-3.5 text-zinc-500 text-xs">{mill.country ?? '—'}</td>
                                    <td className="px-6 py-3.5">
                                        {mill.isActive ? (
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
        </div>
    )
}
