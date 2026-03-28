'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ReportContentJson } from '@/lib/llm/types'

type AuditReport = {
    id: string
    version: number
    status: string
    generatedBy: string
    llmModel: string
    generatedAt: string
    contentJson: ReportContentJson
    pdfPath?: string | null
}

const PROVIDERS = [
    { value: 'gemini', label: 'Gemini (Google)' },
    { value: 'anthropic', label: 'Claude (Anthropic)' },
]

export default function AuditReportPage({
    params,
}: {
    params: { auditId: string }
}) {
    const [reports, setReports] = useState<AuditReport[]>([])
    const [selectedReport, setSelectedReport] = useState<AuditReport | null>(null)
    const [editContent, setEditContent] = useState('')
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [saving, setSaving] = useState(false)
    const [finalising, setFinalising] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [provider, setProvider] = useState<'gemini' | 'anthropic'>('gemini')
    const [error, setError] = useState<string | null>(null)

    const loadReports = useCallback(async () => {
        setLoading(true)
        const res = await fetch(`/api/audit-reports?auditId=${params.auditId}`)
        const data = await res.json()
        const list: AuditReport[] = data.data ?? []
        setReports(list)
        if (list.length > 0) {
            setSelectedReport(list[0])
            setEditContent(JSON.stringify(list[0].contentJson, null, 2))
        }
        setLoading(false)
    }, [params.auditId])

    useEffect(() => { loadReports() }, [loadReports])

    const handleGenerate = async () => {
        setGenerating(true)
        setError(null)
        const res = await fetch('/api/audit-reports/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auditId: params.auditId, provider }),
        })
        const data = await res.json()
        setGenerating(false)
        if (data.error) {
            setError(data.error)
        } else {
            await loadReports()
        }
    }

    const handleSaveEdit = async () => {
        if (!selectedReport) return
        setSaving(true)
        setError(null)
        try {
            const contentJson = JSON.parse(editContent)
            const res = await fetch(`/api/audit-reports/${selectedReport.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contentJson }),
            })
            const data = await res.json()
            if (data.error) setError(data.error)
            else await loadReports()
        } catch {
            setError('Invalid JSON — please check your edits.')
        }
        setSaving(false)
    }

    const handleFinalise = async () => {
        if (!selectedReport) return
        if (!confirm('Mark this report as FINAL? It will become read-only.')) return
        setFinalising(true)
        const res = await fetch(`/api/audit-reports/${selectedReport.id}/finalise`, { method: 'POST' })
        const data = await res.json()
        setFinalising(false)
        if (data.error) setError(data.error)
        else await loadReports()
    }

    const handleExportPdf = async () => {
        if (!selectedReport) return
        setExporting(true)
        const res = await fetch(`/api/audit-reports/${selectedReport.id}/export-pdf`, { method: 'POST' })
        const data = await res.json()
        setExporting(false)
        if (data.error) {
            setError(data.error)
        } else if (data.data?.signedUrl) {
            window.open(data.data.signedUrl, '_blank')
        }
    }

    const isFinal = selectedReport?.status === 'FINAL'

    if (loading) return <div className="text-gray-500 p-6">Loading reports...</div>

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Audit Report</h1>
                    <p className="text-sm text-gray-500">Generate, review, finalise, and export the certification audit report.</p>
                </div>
                <div className="flex items-center gap-3">
                    {reports.length === 0 && (
                        <>
                            <select
                                value={provider}
                                onChange={e => setProvider(e.target.value as any)}
                                className="text-sm border-gray-300 rounded"
                            >
                                {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="bg-green-600 text-white px-5 py-2 rounded text-sm hover:bg-green-700 disabled:bg-green-300"
                            >
                                {generating ? '⏳ Generating...' : '✨ Generate with AI'}
                            </button>
                        </>
                    )}
                    {reports.length > 0 && !isFinal && (
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-gray-900 disabled:bg-gray-300"
                        >
                            {generating ? '⏳ Generating...' : '↺ Re-generate'}
                        </button>
                    )}
                    {selectedReport && !isFinal && (
                        <button
                            onClick={handleFinalise}
                            disabled={finalising}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:bg-blue-300"
                        >
                            {finalising ? 'Finalising...' : '✅ Finalise Report'}
                        </button>
                    )}
                    {isFinal && (
                        <button
                            onClick={handleExportPdf}
                            disabled={exporting}
                            className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:bg-green-300"
                        >
                            {exporting ? 'Exporting...' : '📄 Export PDF'}
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                    {error}
                </div>
            )}

            {generating && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-4 rounded text-sm animate-pulse">
                    ⏳ Generating AI draft report — this may take up to 60 seconds...
                </div>
            )}

            {reports.length === 0 && !generating && (
                <div className="bg-white shadow rounded-lg p-16 text-center">
                    <p className="text-4xl mb-4">📝</p>
                    <p className="text-gray-500 text-lg mb-2">No report generated yet.</p>
                    <p className="text-gray-400 text-sm">Select an AI provider and click "Generate with AI" to create a draft report from the audit findings.</p>
                </div>
            )}

            {selectedReport && (
                <div className="grid grid-cols-4 gap-6">
                    {/* Version History Sidebar */}
                    <div className="col-span-1">
                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b">
                                <h3 className="text-sm font-semibold text-gray-700">Version History</h3>
                            </div>
                            <div className="divide-y">
                                {reports.map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => { setSelectedReport(r); setEditContent(JSON.stringify(r.contentJson, null, 2)) }}
                                        className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 ${r.id === selectedReport.id ? 'bg-blue-50' : ''}`}
                                    >
                                        <p className="font-medium text-gray-900">v{r.version}</p>
                                        <p className="text-xs text-gray-400">{r.generatedBy} · {r.status}</p>
                                        <p className="text-xs text-gray-400">{new Date(r.generatedAt).toLocaleDateString()}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Report Content */}
                    <div className="col-span-3 space-y-4">
                        {/* AI Banner */}
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                            <span>⚠️</span>
                            <div>
                                <strong>AI-Generated Draft</strong> — This report was generated with AI assistance and requires human review before finalisation.
                                {isFinal && <span className="ml-2 text-green-700 font-medium">✅ Human-reviewed and finalised.</span>}
                            </div>
                        </div>

                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b">
                                <h2 className="font-semibold text-gray-800">Report Content — v{selectedReport.version} ({selectedReport.status})</h2>
                                {!isFinal && (
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={saving}
                                        className="bg-gray-800 text-white px-3 py-1.5 rounded text-xs hover:bg-gray-900 disabled:bg-gray-400"
                                    >
                                        {saving ? 'Saving...' : 'Save as New Version'}
                                    </button>
                                )}
                            </div>

                            <div className="p-6 space-y-6">
                                {isFinal ? (
                                    /* Read-only view */
                                    <div className="space-y-6 text-sm text-gray-800">
                                        <div>
                                            <h3 className="font-semibold text-gray-700 mb-2">Executive Summary</h3>
                                            <p className="leading-relaxed">{selectedReport.contentJson.executiveSummary}</p>
                                        </div>
                                        {(selectedReport.contentJson.findingsByPillar ?? []).map(pillar => (
                                            <div key={pillar.pillar}>
                                                <h3 className="font-semibold text-green-700 mb-2">{pillar.pillar}</h3>
                                                <div className="space-y-2">
                                                    {(pillar.items ?? []).map(item => (
                                                        <div key={item.requirementCode} className="pl-4 border-l-2 border-gray-200">
                                                            <p className="font-medium">[{item.requirementCode}] {item.requirementName} <span className="text-xs text-gray-500">({item.findingType})</span></p>
                                                            <p className="text-gray-600">{item.summary}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        <div>
                                            <h3 className="font-semibold text-gray-700 mb-2">Recommendations</h3>
                                            <ul className="list-disc list-inside space-y-1">
                                                {(selectedReport.contentJson.recommendations ?? []).map((r, i) => <li key={i}>{r}</li>)}
                                            </ul>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-700 mb-2">Conclusion</h3>
                                            <p className="leading-relaxed">{selectedReport.contentJson.conclusion}</p>
                                        </div>
                                    </div>
                                ) : (
                                    /* Edit mode — raw JSON editor */
                                    <div>
                                        <p className="text-xs text-gray-400 mb-2">Edit the JSON below. Saving creates a new version — all prior versions are preserved.</p>
                                        <textarea
                                            className="w-full font-mono text-xs border-gray-300 rounded h-[500px]"
                                            value={editContent}
                                            onChange={e => setEditContent(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
