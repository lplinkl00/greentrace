'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AggregatorChecklistReviewPage({
    params,
}: {
    params: { millId: string, checklistId: string }
}) {
    const router = useRouter()
    const [checklist, setChecklist] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [auditorId, setAuditorId] = useState('')
    const [returnReason, setReturnReason] = useState('')
    const [actionLoading, setActionLoading] = useState(false)

    useEffect(() => {
        fetch(`/api/checklists/${params.checklistId}`)
            .then(res => res.json())
            .then(data => {
                setChecklist(data.data)
                setLoading(false)
            })
    }, [params.checklistId])

    const handleReturnToMill = async () => {
        if (!returnReason) return alert('Please enter a reason.')
        setActionLoading(true)
        const res = await fetch(`/api/checklists/${params.checklistId}/return-to-mill`, {
            method: 'POST',
            body: JSON.stringify({ reason: returnReason })
        })
        const data = await res.json()
        setActionLoading(false)
        if (data.error) alert(data.error)
        else {
            alert('Returned to Mill successfully.')
            router.refresh()
            window.location.reload()
        }
    }

    const handleSendToAudit = async () => {
        if (!auditorId) return alert('Please assign an auditor.')
        setActionLoading(true)
        const res = await fetch(`/api/checklists/${params.checklistId}/send-to-audit`, {
            method: 'POST',
            body: JSON.stringify({ auditorId })
        })
        const data = await res.json()
        setActionLoading(false)
        if (data.error) alert(data.error)
        else {
            alert('Sent to External Audit successfully.')
            router.refresh()
            window.location.reload()
        }
    }

    if (loading) return <div>Loading...</div>
    if (!checklist) return <div>Not found.</div>

    return (
        <div className="space-y-6 max-w-5xl mx-auto py-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Checklist Review</h1>
                    <p className="text-gray-500">{checklist.mill?.name} • {checklist.regulation} • {checklist.periodStart.substring(0, 10)} to {checklist.periodEnd.substring(0, 10)}</p>
                </div>
                <div className="flex space-x-4 items-center">
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full uppercase">
                        {checklist.status}
                    </span>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Review Progress</h2>
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg border">
                        <p className="text-sm text-gray-500">Items Reviewed</p>
                        <p className="text-2xl font-bold">
                            {checklist.items?.filter((i: any) => i.aggregatorReviewed).length} / {checklist.items?.length}
                        </p>
                    </div>
                </div>

                <div className="border rounded mb-8">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                        <h2 className="font-semibold text-gray-800">Requirements</h2>
                    </div>
                    <div className="divide-y max-h-96 overflow-y-auto">
                        {checklist.items?.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                                <div>
                                    <span className="text-sm font-medium text-gray-900">
                                        {item.requirement?.code} - {item.requirement?.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-1 rounded ${item.aggregatorReviewed ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                                        {item.aggregatorReviewed ? 'Reviewed' : 'Pending Review'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {checklist.status === 'UNDER_REVIEW' && (
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Aggregator Actions</h3>

                        <div className="grid grid-cols-2 gap-8">
                            {/* Return to Mill */}
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                <h4 className="font-medium text-red-800 mb-2">Return to Mill</h4>
                                <p className="text-sm text-red-600 mb-4">If data is incomplete or incorrect, send it back for revision.</p>
                                <textarea
                                    className="w-full text-sm border-gray-300 rounded mb-3"
                                    rows={3}
                                    placeholder="Reason for return..."
                                    value={returnReason}
                                    onChange={e => setReturnReason(e.target.value)}
                                />
                                <button
                                    onClick={handleReturnToMill}
                                    disabled={actionLoading || !returnReason}
                                    className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-red-300"
                                >
                                    Return to Mill
                                </button>
                            </div>

                            {/* Send to Audit */}
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                <h4 className="font-medium text-green-800 mb-2">Approve and Send to Audit</h4>
                                <p className="text-sm text-green-700 mb-4">Assign an external auditor to begin the final certification audit.</p>
                                <select
                                    className="w-full text-sm border-gray-300 rounded mb-3 p-2"
                                    value={auditorId}
                                    onChange={e => setAuditorId(e.target.value)}
                                >
                                    <option value="">Select Auditor...</option>
                                    <option value="test-auditor-uuid">Jane Doe (Test Auditor)</option>
                                </select>
                                <button
                                    onClick={handleSendToAudit}
                                    disabled={actionLoading || !auditorId}
                                    className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-green-300"
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
