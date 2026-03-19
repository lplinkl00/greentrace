'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AggregatorChecklistReviewPage({
    params,
}: {
    params: { companyId: string, checklistId: string }
}) {
    const router = useRouter()
    const [checklist, setChecklist] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [auditorId, setAuditorId] = useState('')
    const [auditors, setAuditors] = useState<{ id: string; name: string; email: string }[]>([])
    const [returnReason, setReturnReason] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const [actionSuccess, setActionSuccess] = useState<string | null>(null)

    useEffect(() => {
        Promise.all([
            fetch(`/api/checklists/${params.checklistId}`).then(r => r.json()),
            fetch(`/api/users?role=AUDITOR`).then(r => r.json()),
        ]).then(([checklistData, auditorsData]) => {
            setChecklist(checklistData.data)
            setAuditors(auditorsData.data ?? [])
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [params.checklistId])

    const handleReturnToCompany = async () => {
        if (!returnReason) {
            setActionError('Please enter a reason.')
            return
        }
        setActionError(null)
        setActionLoading(true)
        const res = await fetch(`/api/checklists/${params.checklistId}/return-to-company`, {
            method: 'POST',
            body: JSON.stringify({ reason: returnReason })
        })
        const data = await res.json()
        setActionLoading(false)
        if (data.error) {
            setActionError(data.error)
        } else {
            setActionSuccess('Returned to Company successfully.')
            window.location.reload()
        }
    }

    const handleSendToAudit = async () => {
        if (!auditorId) {
            setActionError('Please assign an auditor.')
            return
        }
        setActionError(null)
        setActionLoading(true)
        const res = await fetch(`/api/checklists/${params.checklistId}/send-to-audit`, {
            method: 'POST',
            body: JSON.stringify({ auditorId })
        })
        const data = await res.json()
        setActionLoading(false)
        if (data.error) {
            setActionError(data.error)
        } else {
            setActionSuccess('Sent to External Audit successfully.')
            window.location.reload()
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
        </div>
    )
    if (!checklist) return (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
            <p className="text-sm">Checklist not found.</p>
        </div>
    )

    return (
        <div className="space-y-6 max-w-5xl mx-auto py-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">Checklist Review</h1>
                    <p className="text-sm text-zinc-400">{checklist.company?.name} · {checklist.regulation} · {checklist.periodStart.substring(0, 10)} to {checklist.periodEnd.substring(0, 10)}</p>
                </div>
                <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: '#fef9c3', color: '#92400e' }}
                >
                    {checklist.status}
                </span>
            </div>

            {actionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                    {actionError}
                </div>
            )}
            {actionSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
                    {actionSuccess}
                </div>
            )}

            <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-6">
                <h2 className="text-sm font-semibold text-zinc-700 mb-4">Review Progress</h2>
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100">
                        <p className="text-xs text-zinc-400">Items Reviewed</p>
                        <p className="text-2xl font-bold text-zinc-900">
                            {checklist.items?.filter((i: any) => i.aggregatorReviewed).length} / {checklist.items?.length}
                        </p>
                    </div>
                </div>

                <div className="border border-zinc-100 rounded-xl mb-8 overflow-hidden">
                    <div className="bg-zinc-50/60 px-4 py-3 border-b border-zinc-100">
                        <h2 className="text-sm font-semibold text-zinc-700">Requirements</h2>
                    </div>
                    <div className="divide-y divide-zinc-50 max-h-96 overflow-y-auto">
                        {checklist.items?.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50/50">
                                <span className="text-sm font-medium text-zinc-800">
                                    {item.requirement?.code} — {item.requirement?.name}
                                </span>
                                <span
                                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                                    style={item.aggregatorReviewed
                                        ? { backgroundColor: '#f0fdf4', color: '#15803d' }
                                        : { backgroundColor: '#f4f4f5', color: '#71717a' }
                                    }
                                >
                                    {item.aggregatorReviewed ? 'Reviewed' : 'Pending'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {checklist.status === 'UNDER_REVIEW' && (
                    <div className="border-t border-zinc-100 pt-6">
                        <h3 className="text-sm font-semibold text-zinc-700 mb-4">Aggregator Actions</h3>

                        <div className="grid grid-cols-2 gap-8">
                            {/* Return to Company */}
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                <h4 className="font-semibold text-red-800 text-sm mb-1">Return to Company</h4>
                                <p className="text-xs text-red-600 mb-3">If data is incomplete or incorrect, send it back for revision.</p>
                                <textarea
                                    className="w-full text-sm border border-red-200 rounded-lg p-2 mb-3 bg-white focus:outline-none focus:ring-2 focus:ring-red-300"
                                    rows={3}
                                    placeholder="Reason for return..."
                                    value={returnReason}
                                    onChange={e => setReturnReason(e.target.value)}
                                />
                                <button
                                    onClick={handleReturnToCompany}
                                    disabled={actionLoading || !returnReason}
                                    className="w-full text-sm font-semibold text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                                    style={{ background: '#dc2626' }}
                                >
                                    Return to Company
                                </button>
                            </div>

                            {/* Send to Audit */}
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                <h4 className="font-semibold text-green-800 text-sm mb-1">Approve and Send to Audit</h4>
                                <p className="text-xs text-green-700 mb-3">Assign an external auditor to begin the final certification audit.</p>
                                <select
                                    className="w-full text-sm border border-green-200 rounded-lg p-2 mb-3 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
                                    value={auditorId}
                                    onChange={e => setAuditorId(e.target.value)}
                                >
                                    <option value="">Select Auditor...</option>
                                    {auditors.length === 0 && (
                                        <option disabled value="">No auditors registered</option>
                                    )}
                                    {auditors.map(a => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} ({a.email})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleSendToAudit}
                                    disabled={actionLoading || !auditorId}
                                    className="w-full text-sm font-semibold text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                                    style={{ background: '#16a34a' }}
                                >
                                    Send to Audit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
