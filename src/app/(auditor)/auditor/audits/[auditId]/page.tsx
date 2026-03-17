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

const STATUS_COLORS: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    FINDINGS_REVIEW: 'bg-purple-100 text-purple-800',
    PUBLISHED: 'bg-green-100 text-green-800',
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
        const findingsArray = Object.values(findingsMap).filter(f => f.findingType && f.findingType !== 'NOT_ASSESSED')
        await fetch('/api/audit-findings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auditId: params.auditId, findings: findingsArray }),
        })
        setSaving(false)
        await refreshAudit()
    }

    const handleAdvanceStatus = async () => {
        setStatusUpdating(true)
        const nextStatus = audit.status === 'SCHEDULED' ? 'IN_PROGRESS'
            : audit.status === 'IN_PROGRESS' ? 'FINDINGS_REVIEW'
                : null

        if (!nextStatus) { setStatusUpdating(false); return }

        await fetch(`/api/audits/${params.auditId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus }),
        })
        setStatusUpdating(false)
        await refreshAudit()
    }

    const handlePublish = async () => {
        if (!confirm('Publishing this audit will mark the checklist as CERTIFIED and update the company\'s certification status. This cannot be undone. Continue?')) return
        setPublishing(true)
        const res = await fetch(`/api/audits/${params.auditId}/publish`, { method: 'POST' })
        const data = await res.json()
        setPublishing(false)
        if (data.error) {
            alert(`Publish failed: ${data.error}`)
        } else {
            await refreshAudit()
        }
    }

    if (loading) return <div className="text-gray-500">Loading audit...</div>
    if (!audit) return <div className="text-red-500">Audit not found.</div>

    const items = audit?.checklist?.items ?? []
    const canPublish = audit.status === 'FINDINGS_REVIEW'
    const canAdvance = ['SCHEDULED', 'IN_PROGRESS'].includes(audit.status)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Audit: {audit.company?.name}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {audit.regulation?.replace(/_/g, ' ')} &bull; {audit.periodStart?.substring(0, 10)} → {audit.periodEnd?.substring(0, 10)}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[audit.status] ?? 'bg-gray-100'}`}>
                        {audit.status?.replace(/_/g, ' ')}
                    </span>
                    {canAdvance && (
                        <button
                            onClick={handleAdvanceStatus}
                            disabled={statusUpdating}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:bg-blue-300"
                        >
                            {statusUpdating ? 'Updating...' : audit.status === 'SCHEDULED' ? 'Start Audit' : 'Move to Review'}
                        </button>
                    )}
                    {canPublish && (
                        <button
                            onClick={handlePublish}
                            disabled={publishing}
                            className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:bg-green-300"
                        >
                            {publishing ? 'Publishing...' : '🏅 Publish Audit'}
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white shadow rounded-lg p-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Findings recorded</span>
                    <span>{Object.keys(findingsMap).length} / {items.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${items.length > 0 ? (Object.keys(findingsMap).length / items.length) * 100 : 0}%` }}
                    />
                </div>
            </div>

            {/* Finding Entry Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
                    <h2 className="font-semibold text-gray-800">Checklist Items — Finding Entry</h2>
                    {audit.status !== 'PUBLISHED' && (
                        <button
                            onClick={handleSaveAll}
                            disabled={saving}
                            className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900 disabled:bg-gray-400"
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

                <div className="divide-y">
                    {items.map((item: any) => {
                        const finding = findingsMap[item.id]
                        const isNonConformant = finding?.findingType?.includes('NON_CONFORMANT')

                        return (
                            <div key={item.id} className="px-6 py-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {item.requirement?.code} — {item.requirement?.name}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">{item.requirement?.pillar} › {item.requirement?.category}</p>
                                    </div>
                                    <select
                                        disabled={audit.status === 'PUBLISHED'}
                                        value={finding?.findingType ?? 'NOT_ASSESSED'}
                                        onChange={e => handleFindingChange(item.id, 'findingType', e.target.value)}
                                        className="text-sm border-gray-300 rounded ml-4 min-w-48"
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
                                    className="w-full text-sm rounded border-gray-300 text-gray-700"
                                    value={finding?.evidenceReviewed ?? ''}
                                    onChange={e => handleFindingChange(item.id, 'evidenceReviewed', e.target.value)}
                                />

                                {isNonConformant && (
                                    <textarea
                                        disabled={audit.status === 'PUBLISHED'}
                                        placeholder="Corrective action required..."
                                        rows={2}
                                        className="w-full text-sm rounded border-red-200 bg-red-50 text-gray-700"
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
