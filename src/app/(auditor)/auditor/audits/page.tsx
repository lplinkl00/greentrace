'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ClipboardCheck, ArrowRight } from 'lucide-react'

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
    SCHEDULED:       { bg: '#eff6ff', color: '#2563eb' },
    IN_PROGRESS:     { bg: '#fef9c3', color: '#92400e' },
    FINDINGS_REVIEW: { bg: '#faf5ff', color: '#7e22ce' },
    PUBLISHED:       { bg: '#f0fdf4', color: '#15803d' },
}

export default function AuditorAuditsPage() {
    const [audits, setAudits] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/audits')
            .then(res => res.ok ? res.json() : { data: [] })
            .then(data => { setAudits(data.data ?? []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
        </div>
    )

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-zinc-900">My Audits</h1>
                <p className="text-sm text-zinc-400 mt-0.5">Compliance audits assigned to you for review.</p>
            </div>

            <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                {audits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-300">
                        <ClipboardCheck size={32} className="mb-3" />
                        <p className="text-sm">No audits have been assigned to you yet.</p>
                    </div>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-50 bg-zinc-50/60">
                                {['Company', 'Regulation', 'Period', 'Status', 'Findings', ''].map((h, i) => (
                                    <th key={i} className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {audits.map((audit: any) => {
                                const s = STATUS_STYLES[audit.status] ?? { bg: '#f4f4f5', color: '#71717a' }
                                return (
                                    <tr key={audit.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <div className="font-medium text-zinc-800 text-sm">{audit.company?.name ?? '—'}</div>
                                            <div className="text-xs text-zinc-400 font-mono mt-0.5">{audit.company?.code}</div>
                                        </td>
                                        <td className="px-6 py-3.5 text-zinc-600 text-xs">
                                            {audit.regulation?.replace(/_/g, ' ')}
                                        </td>
                                        <td className="px-6 py-3.5 text-zinc-500 text-xs whitespace-nowrap">
                                            {audit.periodStart?.substring(0, 10)} → {audit.periodEnd?.substring(0, 10)}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                                style={{ backgroundColor: s.bg, color: s.color }}>
                                                {audit.status?.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-zinc-500 text-xs">
                                            {audit.findings?.length ?? 0} recorded
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <Link
                                                href={`/auditor/audits/${audit.id}`}
                                                className="inline-flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600 transition"
                                            >
                                                Open <ArrowRight size={12} />
                                            </Link>
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
