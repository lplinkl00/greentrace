'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const FINDING_TYPES = [
    { value: 'CONFORMANT', label: '✅ Conformant' },
    { value: 'MINOR_NON_CONFORMANT', label: '⚠️ Minor Non-Conformant' },
    { value: 'MAJOR_NON_CONFORMANT', label: '🔴 Major Non-Conformant' },
    { value: 'OBSERVATION', label: '📋 Observation' },
    { value: 'NOT_ASSESSED', label: '— Not Assessed' },
]

const STATUS_STYLES: Record<string, { backgroundColor: string; color: string }> = {
    SCHEDULED:       { backgroundColor: '#eff6ff', color: '#2563eb' },
    IN_PROGRESS:     { backgroundColor: '#fef9c3', color: '#92400e' },
    FINDINGS_REVIEW: { backgroundColor: '#faf5ff', color: '#7e22ce' },
    PUBLISHED:       { backgroundColor: '#f0fdf4', color: '#15803d' },
}

export default function AuditDetailPage({
    params,
}: {
    params: { auditId: string }
}) {
    const router = useRouter()
    const [audit, setAudit] = useState<any>(null)
    const [findingsMap, setFindingsMap] = useState<Record<string, any>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [statusUpdating, setStatusUpdating] = useState(false)

    const refreshAudit = useCallback(() => {
        return fetch(`/api/audits/${params.auditId}`)
            .then(res => res.json())
            .then(data => {
                const a = data.data
                setAudit(a)
                // Build a map of checklistItemId -> finding for quick lookup
                const map: Record<string, any> = {}
                a?.findings?.forEach((f: any) => { map[f.checklistItemId] = f })
                setFindingsMap(map)
                setLoading(false)
            })
    }, [params.auditId])

    useEffect(() => { refreshAudit() }, [refreshAudit])

    const handleFindingChange = (itemId: string, field: string, value: string) => {
        setFindingsMap(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                checklistItemId: itemId,
                [field]: value,
            }
        }))
    }

    const handleSaveAll = async () => {
        setSaving(true)
        try {
            const findingsArray = Object.values(findingsMap).filter(f => f.findingType && f.findingType !== 'NOT_ASSESSED')
            const res = await fetch('/api/audit-findings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auditId: params.auditId, findings: findingsArray }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                alert(`Save failed: ${data.error ?? res.status}`)
                return
            }
            await refreshAudit()
        } finally {
            setSaving(false)
        }
    }

    const handleAdvanceStatus = async () => {
        setStatusUpdating(true)
        const nextStatus = audit.status === 'SCHEDULED' ? 'IN_PROGRESS'
            : audit.status === 'IN_PROGRESS' ? 'FINDINGS_REVIEW'
                : null

        if (!nextStatus) { setStatusUpdating(false); return }

        try {
            const res = await fetch(`/api/audits/${params.auditId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                alert(`Status update failed: ${data.error ?? res.status}`)
                return
            }
            await refreshAudit()
        } finally {
            setStatusUpdating(false)
        }
    }

    const handlePublish = async () => {
        if (!confirm('Publishing this audit will mark the checklist as CERTIFIED and update the company\'s certification status. This cannot be undone. Continue?')) return
        setPublishing(true)
        try {
            const res = await fetch(`/api/audits/${params.auditId}/publish`, { method: 'POST' })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                alert(`Publish failed: ${data.error ?? res.status}`)
                return
            }
            const data = await res.json()
            if (data.error) {
                alert(`Publish failed: ${data.error}`)
            } else {
                await refreshAudit()
            }
        } finally {
            setPublishing(false)
        }
    }

    if (loading) return <div className="text-zinc-500">Loading audit...</div>
    if (!audit) return <div className="text-red-500">Audit not found.</div>

    const items = audit?.checklist?.items ?? []
    const canPublish = audit.status === 'FINDINGS_REVIEW'
    const canAdvance = ['SCHEDULED', 'IN_PROGRESS'].includes(audit.status)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">
                        Audit: {audit.company?.name}
                    </h1>
                    <p className="text-sm text-zinc-500">
                        {audit.regulation?.replace(/_/g, ' ')} &bull; {audit.periodStart?.substring(0, 10)} → {audit.periodEnd?.substring(0, 10)}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={STATUS_STYLES[audit.status] ?? { backgroundColor: '#f4f4f5', color: '#71717a' }}
                    >
                        {audit.status?.replace(/_/g, ' ')}
                    </span>
                    {canAdvance && (
                        <button
                            onClick={handleAdvanceStatus}
                            disabled={statusUpdating}
                            className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                        >
                            {statusUpdating ? 'Updating...' : audit.status === 'SCHEDULED' ? 'Start Audit' : 'Move to Review'}
                        </button>
                    )}
                    {canPublish && (
                        <button
                            onClick={handlePublish}
                            disabled={publishing}
                            className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition disabled:opacity-50"
                            style={{ background: '#16a34a' }}
                        >
                            {publishing ? 'Publishing...' : 'Publish Audit'}
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-4">
                <div className="flex justify-between text-sm text-zinc-600 mb-1">
                    <span>Findings recorded</span>
                    <span>{Object.keys(findingsMap).length} / {items.length}</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: '#e4e4e7' }}>
                    <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${items.length > 0 ? (Object.keys(findingsMap).length / items.length) * 100 : 0}%`, backgroundColor: '#22c55e' }}
                    />
                </div>
            </div>

            {/* Finding Entry Table */}
            <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 bg-zinc-50/60">
                    <h2 className="font-semibold text-zinc-800">Checklist Items — Finding Entry</h2>
                    {audit.status !== 'PUBLISHED' && (
                        <button
                            onClick={handleSaveAll}
                            disabled={saving}
                            className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition disabled:opacity-50"
                            style={{ background: '#18181b' }}
                        >
                            {saving ? 'Saving...' : 'Save All Findings'}
                        </button>
                    )}
                </div>

                {audit.status === 'PUBLISHED' && (
                    <div className="px-6 py-3 bg-green-50 border-b text-sm text-green-800">
                        ✅ This audit has been published. Findings are now visible to the company.
                    </div>
                )}

                <div className="divide-y divide-zinc-50">
                    {items.map((item: any) => {
                        const finding = findingsMap[item.id]
                        const isNonConformant = finding?.findingType?.includes('NON_CONFORMANT')

                        return (
                            <div key={item.id} className="px-6 py-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-zinc-900">
                                            {item.requirement?.code} — {item.requirement?.name}
                                        </p>
                                        <p className="text-xs text-zinc-400 mt-0.5">{item.requirement?.pillar} › {item.requirement?.category}</p>
                                    </div>
                                    <select
                                        disabled={audit.status === 'PUBLISHED'}
                                        value={finding?.findingType ?? 'NOT_ASSESSED'}
                                        onChange={e => handleFindingChange(item.id, 'findingType', e.target.value)}
                                        className="text-sm border-zinc-300 rounded ml-4 min-w-48"
                                    >
                                        {FINDING_TYPES.map(ft => (
                                            <option key={ft.value} value={ft.value}>{ft.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <textarea
                                    disabled={audit.status === 'PUBLISHED'}
                                    placeholder="Evidence reviewed (required for all assessed items)..."
                                    rows={2}
                                    className="w-full text-sm rounded border-zinc-300 text-zinc-700"
                                    value={finding?.evidenceReviewed ?? ''}
                                    onChange={e => handleFindingChange(item.id, 'evidenceReviewed', e.target.value)}
                                />

                                {isNonConformant && (
                                    <textarea
                                        disabled={audit.status === 'PUBLISHED'}
                                        placeholder="Corrective action required..."
                                        rows={2}
                                        className="w-full text-sm rounded border-red-200 bg-red-50 text-zinc-700"
                                        value={finding?.correctiveActionRequired ?? ''}
                                        onChange={e => handleFindingChange(item.id, 'correctiveActionRequired', e.target.value)}
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
