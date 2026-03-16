'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building2, MapPin, ArrowLeft, CheckCircle2, XCircle, Globe } from 'lucide-react'

type Mill = {
    id: string
    name: string
    code: string
    location: string | null
    country: string | null
    latitude: string | null
    longitude: string | null
    isActive: boolean
    isccEuCertStatus: string | null
    isccEuCertExpiry: string | null
    createdAt: string
}

export default function MillDetailPage({ params }: { params: { companyId: string } }) {
    const [mill, setMill] = useState<Mill | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/companies')
            .then(r => r.json())
            .then(d => {
                const found = (d.data ?? []).find((m: Mill) => m.id === params.companyId)
                setMill(found ?? null)
                setLoading(false)
            })
            .catch(() => { setError('Failed to load mill details'); setLoading(false) })
    }, [params.companyId])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
        </div>
    )
    if (error || !mill) return (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
            <Building2 size={28} className="mb-2" />
            <p className="text-sm">{error ?? 'Mill not found.'}</p>
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/aggregator/companies" className="text-zinc-400 hover:text-zinc-600 transition p-1 rounded-lg hover:bg-zinc-100">
                    <ArrowLeft size={16} />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">{mill.name}</h1>
                    <p className="text-sm text-zinc-400 mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-xs bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">{mill.code}</span>
                        {mill.location && (
                            <span className="flex items-center gap-1">
                                <MapPin size={11} className="text-zinc-300" />
                                {mill.location}
                            </span>
                        )}
                    </p>
                </div>
                <div className="ml-auto">
                    {mill.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>
                            <CheckCircle2 size={10} /> Active
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: '#f4f4f5', color: '#71717a' }}>
                            <XCircle size={10} /> Inactive
                        </span>
                    )}
                </div>
            </div>

            {/* Mill Info */}
            <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-6">
                <h2 className="text-sm font-semibold text-zinc-700 mb-4">Mill Information</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    <div>
                        <p className="text-xs text-zinc-400 mb-0.5">Country</p>
                        <p className="text-sm font-medium text-zinc-800 flex items-center gap-1">
                            <Globe size={12} className="text-zinc-300" />
                            {mill.country ?? '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-400 mb-0.5">ISCC EU Status</p>
                        <p className="text-sm font-medium text-zinc-800">{mill.isccEuCertStatus ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-400 mb-0.5">ISCC EU Expiry</p>
                        <p className="text-sm font-medium text-zinc-800">
                            {mill.isccEuCertExpiry ? new Date(mill.isccEuCertExpiry).toLocaleDateString() : '—'}
                        </p>
                    </div>
                    {mill.latitude && mill.longitude && (
                        <div>
                            <p className="text-xs text-zinc-400 mb-0.5">Coordinates</p>
                            <p className="text-sm font-mono text-zinc-600">{mill.latitude}, {mill.longitude}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-xs text-zinc-400 mb-0.5">Registered</p>
                        <p className="text-sm font-medium text-zinc-800">{new Date(mill.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-6">
                <h2 className="text-sm font-semibold text-zinc-700 mb-4">Quick Actions</h2>
                <div className="flex gap-3 flex-wrap">
                    <Link
                        href={`/aggregator/companies/${params.companyId}/integrations`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition"
                    >
                        Manage Integrations
                    </Link>
                </div>
            </div>
        </div>
    )
}
