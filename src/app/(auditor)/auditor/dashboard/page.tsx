'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ClipboardList, FileText, AlertTriangle, ArrowRight, Calendar, CheckCircle2 } from 'lucide-react'

type AuditorStats = {
    activeAuditsCount: number
    auditsDueSoon: Array<{
        id: string
        millName: string
        regulation: string
        conductedDate: string
        status: string
    }>
    reportsToFinalise: Array<{
        id: string
        auditId: string
        millName: string
        version: number
        generatedAt: string
    }>
    totalFindings: number
}

const AUDIT_STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    SCHEDULED: { bg: '#eff6ff', color: '#2563eb', label: 'Scheduled' },
    IN_PROGRESS: { bg: '#fff7ed', color: '#c2410c', label: 'In Progress' },
    COMPLETED: { bg: '#f0fdf4', color: '#15803d', label: 'Completed' },
    PUBLISHED: { bg: '#f0fdf4', color: '#15803d', label: 'Published' },
    PENDING: { bg: '#f4f4f5', color: '#71717a', label: 'Pending' },
}

export default function AuditorDashboardPage() {
    const [stats, setStats] = useState<AuditorStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/dashboard/auditor')
            .then(r => r.json())
            .then(d => { setStats(d.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
        </div>
    )
    if (!stats) return <div className="text-red-500 text-sm p-4">Error loading dashboard</div>

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-zinc-900">Auditor Dashboard</h1>
                <p className="text-sm text-zinc-400 mt-0.5">Your assigned audits and pending actions.</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-5">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Audits Completed</p>
                        <CheckCircle2 size={15} className="text-green-500 mt-0.5" />
                    </div>
                    <p className="text-2xl font-bold text-zinc-900">{stats.activeAuditsCount}</p>
                    <Link href="/auditor/audits" className="text-xs text-orange-500 hover:text-orange-600 mt-1.5 flex items-center gap-1 transition">
                        View All Active <ArrowRight size={11} />
                    </Link>
                </div>

                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-5">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Pending Reviews</p>
                        <FileText size={15} className="text-amber-400 mt-0.5" />
                    </div>
                    <p className="text-2xl font-bold text-zinc-900">{stats.reportsToFinalise.length}</p>
                    <p className="text-xs text-amber-500 mt-1">High-priority status</p>
                </div>

                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-5">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Avg. Completion Time</p>
                        <ClipboardList size={15} className="text-blue-400 mt-0.5" />
                    </div>
                    <p className="text-2xl font-bold text-zinc-900">{stats.totalFindings}</p>
                    <p className="text-xs text-zinc-400 mt-1">Total findings across audits</p>
                </div>
            </div>

            {/* Two-column */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Audit queue */}
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-50">
                        <h2 className="font-semibold text-zinc-800 text-sm">My Audit Queue</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                                {stats.auditsDueSoon.length} assigned
                            </span>
                            <Link href="/auditor/audits" className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 transition">
                                View All <ArrowRight size={11} />
                            </Link>
                        </div>
                    </div>
                    {stats.auditsDueSoon.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-zinc-300">
                            <Calendar size={24} className="mb-2" />
                            <p className="text-xs">No upcoming audits</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-zinc-50">
                            {stats.auditsDueSoon.map(audit => {
                                const s = AUDIT_STATUS_STYLE[audit.status] ?? AUDIT_STATUS_STYLE.PENDING
                                return (
                                    <li key={audit.id} className="px-6 py-3.5 hover:bg-zinc-50/60 transition-colors">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <Link href={`/auditor/audits/${audit.id}`} className="text-sm font-medium text-zinc-800 hover:text-orange-600 truncate block transition">
                                                    {audit.millName}
                                                </Link>
                                                <p className="text-xs text-zinc-400 mt-0.5">
                                                    {audit.regulation.replace(/_/g, ' ')}
                                                    <span className="mx-1.5 text-zinc-200">·</span>
                                                    {new Date(audit.conductedDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span
                                                className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                                                style={{ backgroundColor: s.bg, color: s.color }}
                                            >
                                                {s.label}
                                            </span>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                {/* Reports to finalise */}
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-50">
                        <h2 className="font-semibold text-zinc-800 text-sm">Draft Reports Requiring Action</h2>
                        {stats.reportsToFinalise.length > 0 && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                                {stats.reportsToFinalise.length}
                            </span>
                        )}
                    </div>
                    {stats.reportsToFinalise.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-zinc-300">
                            <CheckCircle2 size={24} className="mb-2" />
                            <p className="text-xs">No draft reports require action</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-zinc-50">
                            {stats.reportsToFinalise.map(report => (
                                <li key={report.id} className="px-6 py-3.5 hover:bg-zinc-50/60 transition-colors">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-zinc-800 truncate">{report.millName}</p>
                                            <p className="text-xs text-zinc-400 mt-0.5">
                                                Draft v{report.version} · {new Date(report.generatedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Link
                                            href={`/auditor/audits/${report.auditId}/report`}
                                            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-orange-200 hover:text-orange-600 transition shrink-0"
                                        >
                                            Review
                                        </Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
