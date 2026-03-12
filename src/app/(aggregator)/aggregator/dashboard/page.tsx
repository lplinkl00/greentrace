'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building2, BarChart3, ClipboardList, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react'

type PortfolioStats = {
    totalMills: number
    certifiedMills: number
    activeAuditsCount: number
    openFindingsCount: number
    totalGhgKgCo2e: number
    expiryTimeline: Array<{
        millId: string
        millName: string
        latestCertEnd: string
        regulation: string
    }>
}

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    accent,
}: {
    icon: React.ElementType
    label: string
    value: React.ReactNode
    sub?: string
    accent: string
}) {
    return (
        <div className="bg-white rounded-xl border border-zinc-100 p-5 shadow-card hover:shadow-card-hover transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: accent + '18' }}>
                    <Icon size={15} style={{ color: accent }} />
                </div>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{value}</p>
            {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
        </div>
    )
}

export default function AggregatorDashboard() {
    const [stats, setStats] = useState<PortfolioStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/dashboard/portfolio')
            .then(r => r.json())
            .then(d => { setStats(d.data); setLoading(false) })
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
        </div>
    )
    if (!stats) return <div className="text-red-500 p-4 text-sm">Error loading dashboard</div>

    const complianceRate = stats.totalMills > 0
        ? Math.round((stats.certifiedMills / stats.totalMills) * 100)
        : 0

    return (
        <div className="space-y-7">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">Portfolio Health Dashboard</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">Global overview across all mills and certifications.</p>
                </div>
                <Link
                    href="/aggregator/mills"
                    className="flex items-center gap-1.5 text-xs font-medium text-orange-500 hover:text-orange-600 transition"
                >
                    Full Report <ArrowRight size={13} />
                </Link>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Building2}
                    label="Total Compliance"
                    value={<>{complianceRate}%</>}
                    sub={`${stats.certifiedMills} of ${stats.totalMills} mills certified`}
                    accent="#f97316"
                />
                <StatCard
                    icon={ClipboardList}
                    label="Pending Audits"
                    value={stats.activeAuditsCount}
                    sub="In queue"
                    accent="#a855f7"
                />
                <StatCard
                    icon={AlertTriangle}
                    label="High-Risk Suppliers"
                    value={stats.openFindingsCount}
                    sub="Open findings"
                    accent="#ef4444"
                />
                <StatCard
                    icon={BarChart3}
                    label="Total GHG Emissions"
                    value={<>{(stats.totalGhgKgCo2e / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-base font-normal text-zinc-400">tCO₂e</span></>}
                    sub="From certified periods"
                    accent="#3b82f6"
                />
            </div>

            {/* Certification expiry table */}
            <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                    <h2 className="font-semibold text-zinc-800 text-sm">Certification Expiry Timeline</h2>
                    <Link href="/aggregator/mills" className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 transition">
                        View All <ArrowRight size={12} />
                    </Link>
                </div>

                {stats.expiryTimeline.length === 0 ? (
                    <p className="p-6 text-zinc-400 text-sm">No certified mills to display.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-50 bg-zinc-50/60">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Mill Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Regulation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Expiry Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {stats.expiryTimeline.map(item => {
                                    const expiryDate = new Date(item.latestCertEnd)
                                    const diffDays = (expiryDate.getTime() - Date.now()) / (1000 * 3600 * 24)
                                    const accentColor = diffDays <= 0 ? '#ef4444' : diffDays <= 60 ? '#f97316' : '#22c55e'
                                    const badge = diffDays <= 0
                                        ? { text: 'Expired', bg: '#fef2f2', color: '#dc2626' }
                                        : diffDays <= 60
                                            ? { text: 'Expiring Soon', bg: '#fff7ed', color: '#c2410c' }
                                            : { text: 'Valid', bg: '#f0fdf4', color: '#15803d' }

                                    return (
                                        <tr key={item.millId} className="hover:bg-zinc-50/50 transition-colors">
                                            <td className="px-6 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-0.5 h-8 rounded-full" style={{ backgroundColor: accentColor }} />
                                                    <Link href={`/aggregator/mills/${item.millId}`} className="font-medium text-zinc-800 hover:text-orange-600 transition">
                                                        {item.millName}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600">
                                                    {item.regulation.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap">
                                                <span
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                                    style={{ backgroundColor: badge.bg, color: badge.color }}
                                                >
                                                    {badge.text}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap text-zinc-500 text-xs">
                                                {expiryDate.toLocaleDateString()}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Recent audits placeholder row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-zinc-800 text-sm">Recent Audits</h2>
                        <Link href="/aggregator/checklists" className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 transition">
                            View All <ArrowRight size={12} />
                        </Link>
                    </div>
                    <div className="flex flex-col items-center justify-center py-8 text-zinc-300">
                        <ClipboardList size={28} className="mb-2" />
                        <p className="text-xs">Audit feed coming soon</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-zinc-800 text-sm">GHG Trend</h2>
                        <span className="text-xs text-zinc-400">Last 12 months</span>
                    </div>
                    <div className="flex flex-col items-center justify-center py-8 text-zinc-300">
                        <TrendingUp size={28} className="mb-2" />
                        <p className="text-xs">Chart coming soon</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
