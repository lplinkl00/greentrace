'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
                            if (!valData.data.isValid) {
                                setValidation({ isValid: false, errors: valData.data.errors })
                            } else {
                                setValidation({ isValid: true, errors: [] })
                            }
                        })
                }
            })
    }, [params.checklistId, router])

    const handleSubmit = async () => {
        setSubmitting(true)
        const res = await fetch(`/api/checklists/${params.checklistId}/submit`, { method: 'POST' })
        const data = await res.json()
        setSubmitting(false)
        if (!data.error) {
            alert('Checklist submitted successfully!')
            window.location.reload()
        } else {
            const errorParts = data.error.split(": ")
            const errs = errorParts.length > 1 ? errorParts[1].split(" | ") : [data.error]
            setValidation({ isValid: false, errors: errs })
            alert('Submission failed. See blockers on page.')
        }
    }

    if (loading) return <div>Loading...</div>
    if (!checklist) return <div>Not found.</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Checklist Overview</h1>
                <div className="flex space-x-4 items-center">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full uppercase">
                        {checklist.status}
                    </span>
                    {checklist.status === 'DRAFT' && (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || (!!validation && !validation.isValid)}
                            className={`px-4 py-2 text-white font-medium rounded ${validation && !validation.isValid ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                }`}
                        >
                            {submitting ? 'Submitting...' : 'Submit to Aggregator'}
                        </button>
                    )}
                </div>
            </div>

            {/* Validation Blockers Panel */}
            {checklist.status === 'DRAFT' && validation && !validation.isValid && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">
                                Submission Blocked: Resolve the following issues first
                            </h3>
                            <div className="mt-2 text-sm text-red-700">
                                <ul className="list-disc pl-5 space-y-1">
                                    {validation.errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white shadow rounded-lg p-6">
                <p className="text-sm text-gray-500 mb-4">
                    Items are grouped by Pillar → Category → Requirement. Click an item to enter data.
                </p>

                {/* Render items (mockup approach based on standard structure) */}
                <div className="border rounded mb-4">
                    <div className="bg-green-50 px-4 py-3 border-b">
                        <h2 className="font-semibold text-green-800">Requirements</h2>
                    </div>
                    <div className="divide-y">
                        {checklist.items?.map((item: any) => (
                            <a
                                key={item.id}
                                href={`/mill/checklists/${params.checklistId}/items/${item.id}`}
                                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                            >
                                <div>
                                    <span className="text-sm font-medium text-gray-900">
                                        {item.requirement?.code} - {item.requirement?.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">
                                        {item.status}
                                    </span>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
