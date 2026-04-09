'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { BarChart3, ArrowRight, FileText } from 'lucide-react'

type ReportRow = {
    id: string
    auditId: string
    version: number
    status: 'DRAFT' | 'FINAL'
    generatedBy: string
    llmModel: string
    generatedAt: string
    updatedAt?: string
    audit: {
        id: string
        periodStart: string
        periodEnd: string
        company: {
            id: string
            name: string
            code: string
        }
    }
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
    DRAFT: { bg: '#fff7ed', color: '#c2410c' },
    FINAL: { bg: '#f0fdf4', color: '#15803d' },
}

function providerLabel(generatedBy: string) {
    if (generatedBy === 'ANTHROPIC') return 'Claude'
    if (generatedBy === 'GOOGLE') return 'Gemini'
    return generatedBy
}

function relativeDate(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 2) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return new Date(iso).toLocaleDateString()
}

export default function AuditorReportsPage() {
    const [reports, setReports] = useState<ReportRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'FINAL'>('ALL')
    const [companyFilter, setCompanyFilter] = useState('ALL')

    useEffect(() => {
        fetch('/api/audit-reports')
            .then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to load')))
            .then(data => { setReports(data.data ?? []); setLoading(false) })
            .catch((err: Error) => { setError(err.message); setLoading(false) })
    }, [])

    const companies = useMemo(() => {
        const map = new Map<string, string>()
        reports.forEach(r => map.set(r.audit.company.id, r.audit.company.name))
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
    }, [reports])

    const filtered = useMemo(() => {
        return reports.filter(r => {
            if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
            if (companyFilter !== 'ALL' && r.audit.company.id !== companyFilter) return false
            if (search.trim()) {
                const q = search.trim().toLowerCase()
                if (!r.audit.company.name.toLowerCase().includes(q)) return false
            }
            return true
        })
    }, [reports, statusFilter, companyFilter, search])

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center gap-3">
                <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                >
                    <BarChart3 size={18} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">Reports</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">All audit reports across your companies.</p>
                </div>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap gap-3">
                <input
                    type="text"
                    placeholder="Search company…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="text-sm border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400 w-52"
                />
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as 'ALL' | 'DRAFT' | 'FINAL')}
                    className="text-sm border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                    <option value="ALL">All statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="FINAL">Final</option>
                </select>
                {companies.length > 0 && (
                    <select
                        value={companyFilter}
                        onChange={e => setCompanyFilter(e.target.value)}
                        className="text-sm border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                        <option value="ALL">All companies</option>
                        {companies.map(([id, name]) => (
                            <option key={id} value={id}>{name}</option>
                        ))}
                    </select>
                )}
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error} — please refresh and try again.
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-300">
                        <FileText size={32} className="mb-3" />
                        {reports.length === 0 ? (
                            <>
                                <p className="text-sm text-zinc-500 font-medium">No reports yet.</p>
                                <p className="text-xs text-zinc-400 mt-1">
                                    Open an audit and use{' '}
                                    <Link href="/auditor/audits" className="text-orange-500 hover:underline">
                                        Generate with AI
                                    </Link>{' '}
                                    to create the first one.
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-zinc-500">No reports match your filters.</p>
                        )}
                    </div>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-50 bg-zinc-50/60">
                                {['Company', 'Audit Year', 'Status', 'Version', 'Generated By', 'Last Modified', ''].map((h, i) => (
                                    <th key={i} className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {filtered.map(r => {
                                const s = STATUS_STYLES[r.status] ?? { bg: '#f4f4f5', color: '#71717a' }
                                const year = new Date(r.audit.periodStart).getFullYear()
                                return (
                                    <tr key={r.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <div className="font-medium text-zinc-800">{r.audit.company.name}</div>
                                            <div className="text-xs text-zinc-400 font-mono mt-0.5">{r.audit.company.code}</div>
                                        </td>
                                        <td className="px-6 py-3.5 text-zinc-500 text-xs">
                                            {year}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span
                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                                style={{ backgroundColor: s.bg, color: s.color }}
                                            >
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-zinc-500 text-xs">
                                            v{r.version}
                                        </td>
                                        <td className="px-6 py-3.5 text-zinc-500 text-xs">
                                            {providerLabel(r.generatedBy)}
                                        </td>
                                        <td className="px-6 py-3.5 text-zinc-400 text-xs whitespace-nowrap">
                                            {relativeDate(r.updatedAt ?? r.generatedAt)}
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <Link
                                                href={`/auditor/audits/${r.auditId}/report`}
                                                className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium"
                                            >
                                                Open <ArrowRight size={13} />
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
