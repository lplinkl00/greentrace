'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, Leaf, AlertTriangle, ArrowRight, FileText, Clock } from 'lucide-react'

type CompanyStats = {
    checklistId: string
    periodStart: string
    periodEnd: string
    regulation: string
    status: string
    progress: {
        totalItems: number
        completedItems: number
        byPillar: Array<{
            pillar: string
            total: number
            completed: number
            percentage: number
        }>
    }
    ghgTotalKgCo2e: number
    massBalance: {
        totalEntries: number
        discrepancies: number
    }
    reconciliationAlerts: number
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    DRAFT: { bg: '#f4f4f5', color: '#71717a' },
    SUBMITTED: { bg: '#eff6ff', color: '#2563eb' },
    UNDER_REVIEW: { bg: '#fef9c3', color: '#92400e' },
    CERTIFIED: { bg: '#f0fdf4', color: '#15803d' },
    REJECTED: { bg: '#fef2f2', color: '#dc2626' },
}

export default function CompanyDashboardPage() {
    const [stats, setStats] = useState<CompanyStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/dashboard/company/current')
            .then(r => r.json())
            .then(d => {
                if (d.error) throw new Error(d.error)
                setStats(d.data)
            })
            .catch((e: Error) => setError(e.message))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
        </div>
    )
    if (error) return <div className="text-red-500 text-sm p-4">Error: {error}</div>
    if (!stats) return <div className="text-zinc-400 text-sm p-4">No active checklists found.</div>

    const progressPct = stats.progress.totalItems > 0
        ? Math.round((stats.progress.completedItems / stats.progress.totalItems) * 100)
        : 0
    const statusStyle = STATUS_STYLE[stats.status] ?? STATUS_STYLE.DRAFT

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">Company Dashboard</h1>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        {new Date(stats.periodStart).toLocaleDateString()} – {new Date(stats.periodEnd).toLocaleDateString()}
                        <span className="mx-2 text-zinc-200">|</span>
                        {stats.regulation.replace(/_/g, ' ')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={statusStyle}
                    >
                        {stats.status}
                    </span>
                    <Link
                        href={`/company/checklists/${stats.checklistId}`}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition"
                        style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                    >
                        Continue Entry <ArrowRight size={12} />
                    </Link>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-5">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Traceability Score</p>
                        <CheckCircle2 size={15} className="text-orange-400 mt-0.5" />
                    </div>
                    <p className="text-2xl font-bold text-zinc-900">{progressPct}%</p>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full mt-3">
                        <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #f97316, #ef4444)' }}
                        />
                    </div>
                    <p className="text-xs text-zinc-400 mt-1.5">{stats.progress.completedItems} / {stats.progress.totalItems} items</p>
                </div>

                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-5">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Pending Data Points</p>
                        <Clock size={15} className="text-purple-400 mt-0.5" />
                    </div>
                    <p className="text-2xl font-bold text-zinc-900">{stats.progress.totalItems - stats.progress.completedItems}</p>
                    <p className="text-xs text-zinc-400 mt-1">Action required by ESD</p>
                </div>

                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-5">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">GHG Intensity</p>
                        <Leaf size={15} className="text-green-500 mt-0.5" />
                    </div>
                    <p className="text-2xl font-bold text-zinc-900">
                        {(stats.ghgTotalKgCo2e / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        <span className="text-sm font-normal text-zinc-400 ml-1">tCO₂e</span>
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">Scope 1+2+3 total</p>
                </div>

                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-5">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Action Items</p>
                        <AlertTriangle size={15} className="text-amber-400 mt-0.5" />
                    </div>
                    <div className="flex items-end gap-4">
                        <div>
                            <p className={`text-2xl font-bold ${stats.reconciliationAlerts > 0 ? 'text-red-500' : 'text-zinc-900'}`}>
                                {stats.reconciliationAlerts}
                            </p>
                            <p className="text-xs text-zinc-400">Alerts</p>
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${stats.massBalance.discrepancies > 0 ? 'text-amber-500' : 'text-zinc-900'}`}>
                                {stats.massBalance.discrepancies}
                            </p>
                            <p className="text-xs text-zinc-400">Discrepancies</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Pillar progress */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-100 shadow-card p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-semibold text-zinc-800 text-sm">Checklist Completion by Pillar</h2>
                        <Link href={`/company/checklists/${stats.checklistId}`} className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 transition">
                            View All <ArrowRight size={12} />
                        </Link>
                    </div>
                    <div className="space-y-3.5">
                        {stats.progress.byPillar.map(pillar => (
                            <div key={pillar.pillar}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs font-medium text-zinc-700 truncate max-w-[60%]" title={pillar.pillar}>
                                        {pillar.pillar}
                                    </span>
                                    <span className="text-xs text-zinc-400 tabular-nums">
                                        {pillar.completed}/{pillar.total} · {pillar.percentage}%
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-zinc-100 rounded-full">
                                    <div
                                        className="h-1.5 rounded-full"
                                        style={{
                                            width: `${pillar.percentage}%`,
                                            background: pillar.percentage === 100 ? '#22c55e' : 'linear-gradient(90deg, #f97316, #ef4444)',
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick tools */}
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-6">
                    <h2 className="font-semibold text-zinc-800 text-sm mb-4">Quick Tools</h2>
                    <div className="grid grid-cols-2 gap-2">
                        {([
                            { label: 'Scan/Edit', icon: CheckCircle2, href: `/company/checklists/${stats.checklistId}` },
                            { label: 'Report', icon: FileText, href: '/company/checklists' },
                            { label: 'Help Desk', icon: AlertTriangle, href: '#' },
                            { label: 'Setup', icon: Clock, href: '/company/settings' },
                        ] as const).map(t => {
                            const Icon = t.icon
                            return (
                                <Link
                                    key={t.label}
                                    href={t.href}
                                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg bg-zinc-50 hover:bg-orange-50 border border-zinc-100 hover:border-orange-100 transition text-center"
                                >
                                    <Icon size={16} className="text-zinc-400" />
                                    <span className="text-xs font-medium text-zinc-600">{t.label}</span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
