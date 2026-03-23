'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ClipboardList, ArrowRight, Calendar } from 'lucide-react'

type Checklist = {
    id: string
    regulation: string
    status: string
    periodStart: string
    periodEnd: string
    _count: { items: number }
}

const STATUS: Record<string, { bg: string; color: string }> = {
    DRAFT:        { bg: '#f4f4f5', color: '#71717a' },
    SUBMITTED:    { bg: '#eff6ff', color: '#2563eb' },
    UNDER_REVIEW: { bg: '#fef9c3', color: '#92400e' },
    UNDER_AUDIT:  { bg: '#fff7ed', color: '#c2410c' },
    CERTIFIED:    { bg: '#f0fdf4', color: '#15803d' },
    LOCKED:       { bg: '#1c1917', color: '#fafaf9' },
}

export default function CompanyChecklistsPage() {
    const [checklists, setChecklists] = useState<Checklist[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/checklists')
            .then(r => r.json())
            .then(d => { setChecklists(d.data ?? []); setLoading(false) })
            .catch(() => { setError('Failed to load checklists'); setLoading(false) })
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
        </div>
    )
    if (error) return <div className="text-red-500 text-sm p-4">{error}</div>

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-zinc-900">Compliance Checklists</h1>
                <p className="text-sm text-zinc-400 mt-0.5">Manage and track your certification checklists.</p>
            </div>

            <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                {checklists.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-300">
                        <ClipboardList size={32} className="mb-3" />
                        <p className="text-sm">No checklists assigned to your company yet.</p>
                    </div>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-50 bg-zinc-50/60">
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Regulation</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Period</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Items</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Status</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {checklists.map(cl => {
                                const s = STATUS[cl.status] ?? STATUS.DRAFT
                                return (
                                    <tr key={cl.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-3.5 font-medium text-zinc-800">{cl.regulation.replace(/_/g, ' ')}</td>
                                        <td className="px-6 py-3.5 text-zinc-500">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar size={12} className="text-zinc-300" />
                                                {new Date(cl.periodStart).getFullYear()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-zinc-500">{cl._count.items}</td>
                                        <td className="px-6 py-3.5">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                                style={{ backgroundColor: s.bg, color: s.color }}>
                                                {cl.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <Link href={`/company/checklists/${cl.id}`}
                                                className="inline-flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600 transition">
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
