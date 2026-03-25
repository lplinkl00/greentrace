'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ReportContentJson, ReportOptions, ColourScheme, StylePreset } from '@/lib/llm/types'
import { DEFAULT_REPORT_OPTIONS } from '@/lib/llm/types'

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
    { value: 'anthropic', label: 'Claude (Anthropic)' },
    { value: 'gemini',    label: 'Gemini (Google)' },
]

const COLOUR_SCHEMES: { value: ColourScheme; label: string; swatch: string }[] = [
    { value: 'green',  label: 'Green',  swatch: '#2d6a4f' },
    { value: 'navy',   label: 'Navy',   swatch: '#1e3a5f' },
    { value: 'slate',  label: 'Slate',  swatch: '#334155' },
    { value: 'amber',  label: 'Amber',  swatch: '#92400e' },
]

const STYLE_PRESETS: { value: StylePreset; label: string }[] = [
    { value: 'sustainability', label: 'Sustainability' },
    { value: 'corporate',      label: 'Corporate'      },
    { value: 'minimal',        label: 'Minimal'        },
]

export default function AuditReportPage({ params }: { params: { auditId: string } }) {
    const [reports,        setReports]        = useState<AuditReport[]>([])
    const [selectedReport, setSelectedReport] = useState<AuditReport | null>(null)
    const [editContent,    setEditContent]    = useState<ReportContentJson | null>(null)
    const [loading,        setLoading]        = useState(true)
    const [generating,     setGenerating]     = useState(false)
    const [saving,         setSaving]         = useState(false)
    const [finalising,     setFinalising]     = useState(false)
    const [exporting,      setExporting]      = useState(false)
    const [provider,       setProvider]       = useState<'gemini' | 'anthropic'>('anthropic')
    const [reportOptions,  setReportOptions]  = useState<ReportOptions>(DEFAULT_REPORT_OPTIONS)
    const [error,          setError]          = useState<string | null>(null)

    const loadReports = useCallback(async () => {
        setLoading(true)
        const res  = await fetch(`/api/audit-reports/${params.auditId}?auditId=${params.auditId}`)
        const data = await res.json()
        const list: AuditReport[] = data.data ?? []
        setReports(list)
        if (list.length > 0) {
            setSelectedReport(list[0])
            setEditContent(list[0].contentJson)
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
            body: JSON.stringify({ auditId: params.auditId, provider, reportOptions }),
        })
        const data = await res.json()
        setGenerating(false)
        if (data.error) setError(data.error)
        else await loadReports()
    }

    const handleSaveEdit = async () => {
        if (!selectedReport || !editContent) return
        setSaving(true)
        setError(null)
        const res = await fetch(`/api/audit-reports/${selectedReport.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contentJson: editContent }),
        })
        const data = await res.json()
        setSaving(false)
        if (data.error) setError(data.error)
        else await loadReports()
    }

    const handleFinalise = async () => {
        if (!selectedReport) return
        if (!confirm('Mark this report as FINAL? It will become read-only.')) return
        setFinalising(true)
        const res  = await fetch(`/api/audit-reports/${selectedReport.id}/finalise`, { method: 'POST' })
        const data = await res.json()
        setFinalising(false)
        if (data.error) setError(data.error)
        else await loadReports()
    }

    const handleExportPdf = async () => {
        if (!selectedReport) return
        setExporting(true)
        const res  = await fetch(`/api/audit-reports/${selectedReport.id}/export-pdf`, { method: 'POST' })
        const data = await res.json()
        setExporting(false)
        if (data.error) setError(data.error)
        else if (data.data?.signedUrl) window.open(data.data.signedUrl, '_blank')
    }

    const isFinal = selectedReport?.status === 'FINAL'

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-zinc-400">
            <div className="animate-spin mr-3 h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full" />
            Loading reports…
        </div>
    )

    return (
        <div className="space-y-6">
            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Audit Report</h1>
                    <p className="text-sm text-zinc-500 mt-0.5">Generate, review, finalise, and export the certification audit report.</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {!isFinal && (
                        <>
                            {/* Provider */}
                            <select
                                value={provider}
                                onChange={e => setProvider(e.target.value as 'gemini' | 'anthropic')}
                                className="text-sm border border-zinc-300 rounded-md px-2 py-1.5 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                            >
                                {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>

                            {/* Colour scheme swatches */}
                            <div className="flex items-center gap-1 border border-zinc-300 rounded-md px-2 py-1.5 bg-white">
                                <span className="text-xs text-zinc-500 mr-1">Colour</span>
                                {COLOUR_SCHEMES.map(cs => (
                                    <button
                                        key={cs.value}
                                        title={cs.label}
                                        onClick={() => setReportOptions(o => ({ ...o, colourScheme: cs.value }))}
                                        className={`w-5 h-5 rounded-full border-2 transition-all ${
                                            reportOptions.colourScheme === cs.value
                                                ? 'border-zinc-900 scale-110'
                                                : 'border-transparent opacity-70 hover:opacity-100'
                                        }`}
                                        style={{ backgroundColor: cs.swatch }}
                                    />
                                ))}
                            </div>

                            {/* Style preset */}
                            <select
                                value={reportOptions.stylePreset}
                                onChange={e => setReportOptions(o => ({ ...o, stylePreset: e.target.value as StylePreset }))}
                                className="text-sm border border-zinc-300 rounded-md px-2 py-1.5 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                            >
                                {STYLE_PRESETS.map(sp => <option key={sp.value} value={sp.value}>{sp.label}</option>)}
                            </select>
                        </>
                    )}

                    {reports.length === 0 && (
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                        >
                            {generating ? '⏳ Generating…' : '✨ Generate with AI'}
                        </button>
                    )}
                    {reports.length > 0 && !isFinal && (
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="bg-zinc-700 hover:bg-zinc-900 disabled:bg-zinc-300 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                        >
                            {generating ? '⏳ Generating…' : '↺ Re-generate'}
                        </button>
                    )}
                    {selectedReport && !isFinal && (
                        <button
                            onClick={handleFinalise}
                            disabled={finalising}
                            className="bg-zinc-800 hover:bg-zinc-900 disabled:bg-zinc-300 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                        >
                            {finalising ? 'Finalising…' : '✅ Finalise Report'}
                        </button>
                    )}
                    {isFinal && (
                        <button
                            onClick={handleExportPdf}
                            disabled={exporting}
                            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                        >
                            {exporting ? 'Exporting…' : '📄 Export PDF'}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Error banner ─────────────────────────────────────────── */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* ── Generating pulse ─────────────────────────────────────── */}
            {generating && (
                <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-4 rounded-lg text-sm animate-pulse">
                    ⏳ Generating AI draft report — this may take up to 60 seconds…
                </div>
            )}

            {/* ── Empty state ──────────────────────────────────────────── */}
            {reports.length === 0 && !generating && (
                <div className="bg-white border border-zinc-200 rounded-xl p-16 text-center shadow-sm">
                    <p className="text-4xl mb-4">📝</p>
                    <p className="text-zinc-600 text-lg mb-2 font-medium">No report generated yet</p>
                    <p className="text-zinc-400 text-sm">Choose your AI provider, colour scheme, and style above, then click "Generate with AI".</p>
                </div>
            )}

            {/* ── Report layout ─────────────────────────────────────────── */}
            {selectedReport && (
                <div className="grid grid-cols-4 gap-6">
                    {/* Version history sidebar */}
                    <div className="col-span-1">
                        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200">
                                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Version History</h3>
                            </div>
                            <div className="divide-y divide-zinc-100">
                                {reports.map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => { setSelectedReport(r); setEditContent(r.contentJson) }}
                                        className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-zinc-50 ${
                                            r.id === selectedReport.id
                                                ? 'bg-orange-50 border-l-2 border-orange-500'
                                                : ''
                                        }`}
                                    >
                                        <p className="font-semibold text-zinc-900">v{r.version}</p>
                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            {r.generatedBy} ·{' '}
                                            <span className={r.status === 'FINAL' ? 'text-green-600 font-medium' : ''}>
                                                {r.status}
                                            </span>
                                        </p>
                                        <p className="text-xs text-zinc-400">{new Date(r.generatedAt).toLocaleDateString()}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="col-span-3 space-y-4">
                        {/* AI notice */}
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                            <span>⚠️</span>
                            <div>
                                <strong>AI-Generated Draft</strong> — Requires human review before finalisation.
                                {isFinal && <span className="ml-2 text-green-700 font-medium">✅ Human-reviewed and finalised.</span>}
                            </div>
                        </div>

                        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between bg-zinc-50 px-5 py-3 border-b border-zinc-200">
                                <h2 className="font-semibold text-zinc-800 text-sm">
                                    Report Content — v{selectedReport.version}
                                    <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                                        isFinal ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-600'
                                    }`}>
                                        {selectedReport.status}
                                    </span>
                                </h2>
                                {!isFinal && (
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={saving}
                                        className="bg-zinc-800 hover:bg-zinc-900 disabled:bg-zinc-400 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                    >
                                        {saving ? 'Saving…' : 'Save as New Version'}
                                    </button>
                                )}
                            </div>

                            <div className="p-6 space-y-6 text-sm">
                                {isFinal ? (
                                    <ReadOnlyReport content={selectedReport.contentJson} />
                                ) : (
                                    editContent && (
                                        <StructuredEditor content={editContent} onChange={setEditContent} />
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Read-only view ────────────────────────────────────────────────────────────

function ReadOnlyReport({ content }: { content: ReportContentJson }) {
    return (
        <div className="space-y-6 text-zinc-800">
            <ReportSection title="Executive Summary">
                <p className="leading-relaxed text-zinc-600">{content.executiveSummary}</p>
            </ReportSection>

            {(content.findingsByPillar ?? []).map(pillar => (
                <div key={pillar.pillar}>
                    <h3 className="font-semibold text-orange-700 mb-3 text-sm">{pillar.pillar}</h3>
                    <div className="space-y-2">
                        {pillar.items.map(item => (
                            <div key={item.requirementCode} className="pl-4 border-l-2 border-zinc-200">
                                <p className="font-medium text-zinc-900">
                                    [{item.requirementCode}] {item.requirementName}
                                    <span className="ml-2 text-xs text-zinc-400">({item.findingType})</span>
                                </p>
                                <p className="text-zinc-600 mt-0.5">{item.summary}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <ReportSection title="Recommendations">
                <ul className="list-disc list-inside space-y-1 text-zinc-600">
                    {content.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
            </ReportSection>

            <ReportSection title="Conclusion">
                <p className="leading-relaxed text-zinc-600">{content.conclusion}</p>
            </ReportSection>
        </div>
    )
}

// ─── Structured field editor ──────────────────────────────────────────────────

function StructuredEditor({
    content,
    onChange,
}: {
    content: ReportContentJson
    onChange: (c: ReportContentJson) => void
}) {
    return (
        <div className="space-y-6">
            <p className="text-xs text-zinc-400">Edit each field below. Saving creates a new version — prior versions are preserved.</p>

            <EditorField label="Executive Summary">
                <textarea
                    className="w-full text-sm border border-zinc-300 rounded-lg p-3 h-36 resize-y focus:outline-none focus:ring-2 focus:ring-orange-400"
                    value={content.executiveSummary}
                    onChange={e => onChange({ ...content, executiveSummary: e.target.value })}
                />
            </EditorField>

            {(content.findingsByPillar ?? []).map((pillar, pi) => (
                <div key={pillar.pillar} className="rounded-lg border border-zinc-200 p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-orange-700 uppercase tracking-wide">{pillar.pillar}</h4>
                    {pillar.items.map((item, ii) => (
                        <div key={item.requirementCode} className="space-y-1">
                            <label className="text-xs text-zinc-500 font-medium">
                                [{item.requirementCode}] {item.requirementName} — <em>{item.findingType}</em>
                            </label>
                            <textarea
                                className="w-full text-sm border border-zinc-200 rounded-md p-2 h-20 resize-y focus:outline-none focus:ring-2 focus:ring-orange-400"
                                value={item.summary}
                                onChange={e => {
                                    const updated = content.findingsByPillar.map((p, pIdx) =>
                                        pIdx !== pi ? p : {
                                            ...p,
                                            items: p.items.map((it, iIdx) =>
                                                iIdx !== ii ? it : { ...it, summary: e.target.value }
                                            ),
                                        }
                                    )
                                    onChange({ ...content, findingsByPillar: updated })
                                }}
                            />
                        </div>
                    ))}
                </div>
            ))}

            <EditorField label="Recommendations (one per line)">
                <textarea
                    className="w-full text-sm border border-zinc-300 rounded-lg p-3 h-32 resize-y font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                    value={content.recommendations.join('\n')}
                    onChange={e => onChange({ ...content, recommendations: e.target.value.split('\n') })}
                />
            </EditorField>

            <EditorField label="Conclusion">
                <textarea
                    className="w-full text-sm border border-zinc-300 rounded-lg p-3 h-28 resize-y focus:outline-none focus:ring-2 focus:ring-orange-400"
                    value={content.conclusion}
                    onChange={e => onChange({ ...content, conclusion: e.target.value })}
                />
            </EditorField>
        </div>
    )
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="font-semibold text-zinc-700 mb-2 text-sm border-b border-zinc-100 pb-1">{title}</h3>
            {children}
        </div>
    )
}

function EditorField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{label}</label>
            {children}
        </div>
    )
}
