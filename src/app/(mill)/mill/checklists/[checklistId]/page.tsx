'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    DRAFT: { bg: '#f4f4f5', color: '#71717a' },
    SUBMITTED: { bg: '#eff6ff', color: '#2563eb' },
    UNDER_REVIEW: { bg: '#fef9c3', color: '#92400e' },
    CERTIFIED: { bg: '#f0fdf4', color: '#15803d' },
    RETURNED: { bg: '#fef2f2', color: '#dc2626' },
}

const ITEM_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    NOT_STARTED: { bg: '#f4f4f5', color: '#71717a' },
    IN_PROGRESS: { bg: '#eff6ff', color: '#2563eb' },
    COMPLETE: { bg: '#f0fdf4', color: '#15803d' },
    NOT_APPLICABLE: { bg: '#f4f4f5', color: '#a1a1aa' },
}

export default function MillChecklistPage({
    params,
}: {
    params: { checklistId: string }
}) {
    const router = useRouter()
    const [checklist, setChecklist] = useState<any>(null)
    const [validation, setValidation] = useState<{ isValid: boolean, errors: string[] } | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [loading, setLoading] = useState(true)
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    useEffect(() => {
        fetch(`/api/checklists/${params.checklistId}`)
            .then(res => res.json())
            .then(data => {
                setChecklist(data.data)
                setLoading(false)

                if (data.data?.status === 'DRAFT') {
                    fetch(`/api/checklists/${params.checklistId}/validate`)
                        .then(res => res.json())
                        .then(valData => {
                            if (valData.data?.isValid === false) {
                                setValidation({ isValid: false, errors: valData.data.errors ?? [] })
                            } else {
                                setValidation({ isValid: true, errors: [] })
                            }
                        })
                        .catch(() => {
                            // validate failed — allow submit optimistically
                            setValidation({ isValid: true, errors: [] })
                        })
                }
            })
            .catch(() => setLoading(false))
    }, [params.checklistId])

    const handleSubmit = async () => {
        setSubmitting(true)
        setSubmitError(null)
        setSubmitSuccess(false)
        const res = await fetch(`/api/checklists/${params.checklistId}/submit`, { method: 'POST' })
        const data = await res.json()
        setSubmitting(false)
        if (!data.error) {
            setSubmitSuccess(true)
            window.location.reload()
        } else {
            const errorParts = data.error.split(": ")
            const errs = errorParts.length > 1 ? errorParts[1].split(" | ") : [data.error]
            setValidation({ isValid: false, errors: errs })
            setSubmitError('Submission failed. See blockers below.')
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

    const statusStyle = STATUS_STYLE[checklist.status] ?? STATUS_STYLE.DRAFT

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">Checklist Overview</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">
                        {checklist.regulation?.replace(/_/g, ' ')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={statusStyle}
                    >
                        {checklist.status}
                    </span>
                    {checklist.status === 'DRAFT' && (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || (!!validation && !validation.isValid)}
                            className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition"
                            style={
                                validation && !validation.isValid
                                    ? { background: '#a1a1aa', cursor: 'not-allowed' }
                                    : { background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }
                            }
                        >
                            {submitting ? 'Submitting…' : 'Submit to Aggregator'}
                        </button>
                    )}
                </div>
            </div>

            {submitSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
                    Checklist submitted successfully!
                </div>
            )}
            {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                    {submitError}
                </div>
            )}

            {/* Validation Blockers Panel */}
            {checklist.status === 'DRAFT' && validation && !validation.isValid && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-red-800 mb-2">
                        Submission Blocked — resolve the following issues first:
                    </h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-red-700">
                        {validation.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-50">
                    <p className="text-sm text-zinc-500">
                        Items are grouped by Pillar → Category → Requirement. Click an item to enter data.
                    </p>
                </div>

                <div className="divide-y divide-zinc-50">
                    {checklist.items?.map((item: any) => {
                        const s = ITEM_STATUS_STYLE[item.status] ?? ITEM_STATUS_STYLE.NOT_STARTED
                        return (
                            <a
                                key={item.id}
                                href={`/company/checklists/${params.checklistId}/items/${item.id}`}
                                className="flex items-center justify-between px-6 py-3.5 hover:bg-zinc-50/50 transition-colors"
                            >
                                <div>
                                    <span className="text-sm font-medium text-zinc-800">
                                        {item.requirement?.code} — {item.requirement?.name}
                                    </span>
                                    {item.requirement?.criticality === 'CRITICAL' && (
                                        <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded"
                                            style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
                                            Critical
                                        </span>
                                    )}
                                </div>
                                <span
                                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: s.bg, color: s.color }}
                                >
                                    {item.status.replace(/_/g, ' ')}
                                </span>
                            </a>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
