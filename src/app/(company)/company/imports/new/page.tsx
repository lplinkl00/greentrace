'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Papa from 'papaparse'
import { Upload, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'

const GREENTRACE_FIELDS = [
    { key: 'shipmentDate',                   label: 'Shipment Date',              required: true },
    { key: 'direction',                      label: 'Direction',                  required: true },
    { key: 'materialType',                   label: 'Material Type',              required: true },
    { key: 'volumeMt',                       label: 'Volume (MT)',                required: true },
    { key: 'certificationStatus',            label: 'Certification Status',       required: true },
    { key: 'counterpartyName',               label: 'Counterparty Name',          required: true },
    { key: 'referenceNumber',                label: 'Reference Number',           required: true },
    { key: 'ghgValueKgco2e',                 label: 'GHG Value (kgCO₂e)',        required: false },
    { key: 'sustainabilityDeclarationNumber', label: 'Sustainability Declaration No.', required: false },
]

type Step = 'upload' | 'map' | 'done'

export default function CompanyImportWizardPage() {
    const router = useRouter()
    const fileRef = useRef<HTMLInputElement>(null)

    const [step, setStep] = useState<Step>('upload')
    const [csvHeaders, setCsvHeaders] = useState<string[]>([])
    const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
    const [fileName, setFileName] = useState('')
    const [mapping, setMapping] = useState<Record<string, string>>({})
    const [saveTemplate, setSaveTemplate] = useState(false)
    const [templateName, setTemplateName] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<{ processedRows: number; errorLog: string | null } | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setFileName(file.name)
        Papa.parse<Record<string, string>>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setCsvHeaders(results.meta.fields ?? [])
                setCsvRows(results.data)
                setStep('map')
            },
        })
    }

    const handleProcess = async () => {
        setSubmitting(true)
        setError(null)
        try {
            const uploadRes = await fetch('/api/imports/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName, fileType: 'CSV', filePath: fileName }),
            })
            if (!uploadRes.ok) {
                const d = await uploadRes.json().catch(() => ({}))
                setError(d.error?.message ?? 'Upload failed')
                return
            }
            const { data: job } = await uploadRes.json()

            const processRes = await fetch(`/api/imports/${job.id}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mappingJson: mapping,
                    mockRows: csvRows,
                    templateName: saveTemplate ? templateName : undefined,
                }),
            })
            if (!processRes.ok) {
                const d = await processRes.json().catch(() => ({}))
                setError(d.error?.message ?? 'Processing failed')
                return
            }
            const { data: processed } = await processRes.json()
            setResult({ processedRows: processed.processedRows, errorLog: processed.errorLog })
            setStep('done')
        } finally {
            setSubmitting(false)
        }
    }

    const requiredMapped = GREENTRACE_FIELDS.filter(f => f.required).every(f => !!mapping[f.key])

    const stepLabel = step === 'upload' ? 'Step 1: Upload File'
        : step === 'map' ? 'Step 2: Map Columns'
        : 'Step 3: Done'

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">New Import</h1>
                    <p className="text-xs text-zinc-400 mt-0.5">{stepLabel}</p>
                </div>
                <Link href="/company/imports"
                    className="text-sm text-zinc-500 hover:text-zinc-700 border border-zinc-200 rounded-lg px-3 py-1.5 transition">
                    Cancel
                </Link>
            </div>

            {step === 'upload' && (
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-8 flex flex-col items-center gap-4">
                    <Upload size={32} className="text-zinc-300" />
                    <p className="text-sm text-zinc-500">Select a CSV file to import shipment records</p>
                    <label className="cursor-pointer flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition"
                        style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}>
                        Choose CSV
                        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                    </label>
                </div>
            )}

            {step === 'map' && (
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-6 space-y-5">
                    <p className="text-xs text-zinc-400">
                        File: <span className="font-medium text-zinc-600">{fileName}</span> — {csvRows.length} rows detected
                    </p>

                    <div className="space-y-3">
                        {GREENTRACE_FIELDS.map(field => (
                            <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
                                <p className="text-sm font-medium text-zinc-700">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </p>
                                <select
                                    value={mapping[field.key] ?? ''}
                                    onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                                >
                                    <option value="">— skip —</option>
                                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div className="border-t pt-4 space-y-3">
                        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                            <input type="checkbox" checked={saveTemplate} onChange={e => setSaveTemplate(e.target.checked)} className="rounded" />
                            Save as template
                        </label>
                        {saveTemplate && (
                            <input
                                type="text"
                                placeholder="Template name"
                                value={templateName}
                                onChange={e => setTemplateName(e.target.value)}
                                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                            />
                        )}
                    </div>

                    {error && <p className="text-xs text-red-500">{error}</p>}

                    <div className="flex items-center justify-between pt-2">
                        <button onClick={() => setStep('upload')}
                            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition">
                            <ArrowLeft size={14} /> Back
                        </button>
                        <button
                            onClick={handleProcess}
                            disabled={submitting || !requiredMapped}
                            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-50 hover:opacity-90 transition"
                            style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                        >
                            {submitting ? 'Processing…' : 'Process Import'} <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {step === 'done' && result && (
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-8 flex flex-col items-center gap-4 text-center">
                    <CheckCircle size={32} className="text-green-500" />
                    <p className="font-semibold text-zinc-800">Import complete</p>
                    <p className="text-sm text-zinc-500">{result.processedRows} row(s) processed</p>
                    {result.errorLog && (
                        <p className="text-xs text-red-500 bg-red-50 rounded-lg p-3 w-full text-left whitespace-pre-wrap">{result.errorLog}</p>
                    )}
                    <button onClick={() => router.push('/company/imports')}
                        className="text-sm font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition"
                        style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}>
                        View Imports
                    </button>
                </div>
            )}
        </div>
    )
}
