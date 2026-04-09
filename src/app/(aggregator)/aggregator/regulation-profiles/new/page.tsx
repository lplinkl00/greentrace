'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Copy, Check, ChevronDown, ChevronUp, Download } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'manual' | 'import'

type FixtureRequirement = {
    code: string
    name: string
    description: string
    guidanceText?: string | null
    dataType: string
    criticality: string
    ghgScope?: string | null
    unit?: string | null
    requiresForm?: boolean
    displayOrder?: number
}

type FixtureCategory = {
    code: string
    name: string
    displayOrder?: number
    requirements: FixtureRequirement[]
}

type FixturePillar = {
    code: string
    name: string
    displayOrder?: number
    categories: FixtureCategory[]
}

type RegulationProfileFixture = {
    regulation: string
    version: string
    name: string
    description?: string | null
    pillars: FixturePillar[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AI_PROMPT = `You are a compliance data engineer. Generate a GreenTrace regulation profile JSON for [REGULATION] version [VERSION].

Follow this exact schema:
{
  "regulation": "string (e.g. 'ISCC_EU', 'RSPO_PC', 'SEDG', 'MSPO')",
  "version": "string (e.g. '2024-v1')",
  "name": "string",
  "description": "string",
  "pillars": [
    {
      "code": "string (e.g. 'ENV')",
      "name": "string",
      "displayOrder": 1,
      "categories": [
        {
          "code": "string (e.g. 'ENV-01')",
          "name": "string",
          "displayOrder": 1,
          "requirements": [
            {
              "code": "string (e.g. 'ENV-01-001')",
              "name": "string",
              "description": "string",
              "guidanceText": "string",
              "dataType": "ABSOLUTE_QUANTITY|RATE|DOCUMENT_ONLY|TEXT_RESPONSE",
              "criticality": "CRITICAL|NON_CRITICAL",
              "ghgScope": "SCOPE1|SCOPE2|SCOPE3|null",
              "unit": "string or null",
              "requiresForm": true,
              "displayOrder": 1
            }
          ]
        }
      ]
    }
  ]
}
Output only valid JSON. No explanation.`

const BLANK_TEMPLATE: RegulationProfileFixture = {
    regulation: 'MY_REGULATION',
    version: '1.0',
    name: 'My Profile',
    description: '',
    pillars: [
        {
            code: 'PIL',
            name: 'Pillar Name',
            displayOrder: 1,
            categories: [
                {
                    code: 'PIL-01',
                    name: 'Category Name',
                    displayOrder: 1,
                    requirements: [
                        {
                            code: 'PIL-01-001',
                            name: 'Requirement Name',
                            description: 'What must be demonstrated.',
                            guidanceText: 'How to collect the evidence.',
                            dataType: 'DOCUMENT_ONLY',
                            criticality: 'CRITICAL',
                            ghgScope: null,
                            unit: null,
                            requiresForm: false,
                            displayOrder: 1,
                        },
                    ],
                },
            ],
        },
    ],
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateFixture(obj: any): string | null {
    if (!obj || typeof obj !== 'object') return 'JSON must be an object.'
    if (!obj.regulation?.trim()) return '"regulation" is required.'
    if (!obj.version?.trim()) return '"version" is required.'
    if (!obj.name?.trim()) return '"name" is required.'
    if (!Array.isArray(obj.pillars) || obj.pillars.length === 0)
        return '"pillars" must be a non-empty array.'
    return null
}

function countStats(fixture: RegulationProfileFixture) {
    const categories = fixture.pillars.flatMap(p => p.categories)
    const requirements = categories.flatMap(c => c.requirements)
    return {
        pillars: fixture.pillars.length,
        categories: categories.length,
        requirements: requirements.length,
    }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NewRegulationProfilePage() {
    const router = useRouter()

    const [tab, setTab] = useState<Tab>('manual')

    // Manual form state
    const [regulation, setRegulation] = useState('')
    const [version, setVersion] = useState('')
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [manualSubmitting, setManualSubmitting] = useState(false)
    const [manualError, setManualError] = useState<string | null>(null)

    // Import state
    const [jsonText, setJsonText] = useState('')
    const [parseError, setParseError] = useState<string | null>(null)
    const [fixture, setFixture] = useState<RegulationProfileFixture | null>(null)
    const [importing, setImporting] = useState(false)
    const [importError, setImportError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Prompt template drawer
    const [promptOpen, setPromptOpen] = useState(false)
    const [copied, setCopied] = useState(false)

    // ── Manual submit ────────────────────────────────────────────────────────

    async function handleManualSubmit(e: React.FormEvent) {
        e.preventDefault()
        setManualSubmitting(true)
        setManualError(null)

        const res = await fetch('/api/regulation-profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ regulation, version, name, description }),
        })

        let json: any = {}
        try { json = await res.json() } catch {}

        if (!res.ok || json.error) {
            setManualError(json.error?.message ?? `Request failed (${res.status})`)
            setManualSubmitting(false)
            return
        }

        setManualSubmitting(false)
        router.push('/aggregator/regulation-profiles')
    }

    // ── JSON parse ───────────────────────────────────────────────────────────

    function parseJson(text: string) {
        setJsonText(text)
        if (!text.trim()) {
            setParseError(null)
            setFixture(null)
            return
        }
        let parsed: any
        try {
            parsed = JSON.parse(text)
        } catch {
            setParseError('Invalid JSON — check for syntax errors.')
            setFixture(null)
            return
        }
        const err = validateFixture(parsed)
        if (err) {
            setParseError(err)
            setFixture(null)
            return
        }
        setParseError(null)
        setFixture(parsed as RegulationProfileFixture)
    }

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => parseJson((ev.target?.result as string) ?? '')
        reader.readAsText(file)
        e.target.value = ''  // allow re-uploading same filename
    }

    // ── Import submit ────────────────────────────────────────────────────────

    async function handleImport() {
        if (!fixture) return
        setImporting(true)
        setImportError(null)

        const res = await fetch('/api/regulation-profiles/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fixture),
        })

        let json: any = {}
        try { json = await res.json() } catch {}

        if (!res.ok || json.error) {
            setImportError(json.error?.message ?? `Request failed (${res.status})`)
            setImporting(false)
            return
        }

        setImporting(false)
        router.push('/aggregator/regulation-profiles')
    }

    // ── Copy prompt ──────────────────────────────────────────────────────────

    async function handleCopyPrompt() {
        await navigator.clipboard.writeText(AI_PROMPT)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // ── Download blank template ──────────────────────────────────────────────

    function handleDownloadTemplate() {
        const blob = new Blob([JSON.stringify(BLANK_TEMPLATE, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'regulation-profile-template.json'
        a.click()
        URL.revokeObjectURL(url)
    }

    const stats = fixture ? countStats(fixture) : null

    return (
        <div className="max-w-2xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">New Regulation Profile</h1>
                <a href="/aggregator/regulation-profiles" className="text-sm text-gray-500 hover:underline">
                    ← Back
                </a>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                {(['manual', 'import'] as Tab[]).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                            tab === t
                                ? 'border-green-600 text-green-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {t === 'manual' ? 'Manual' : 'Import JSON'}
                    </button>
                ))}
            </div>

            {/* ── Manual tab ── */}
            {tab === 'manual' && (
                <div className="bg-white shadow rounded-lg p-6">
                    <p className="text-sm text-gray-500 mb-4">
                        Create a profile shell — pillars and requirements can be added later.
                    </p>
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Regulation Code</label>
                            <input
                                type="text" required placeholder="e.g. ISCC_EU, RSPO_PC, SEDG" value={regulation}
                                onChange={e => setRegulation(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                            <input
                                type="text" required placeholder="e.g. 3.0" value={version}
                                onChange={e => setVersion(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                type="text" required placeholder="e.g. ISCC EU 3.0" value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <textarea
                                rows={3} value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                        </div>
                        {manualError && <p className="text-sm text-red-600">{manualError}</p>}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit" disabled={manualSubmitting}
                                className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition"
                            >
                                {manualSubmitting ? 'Creating…' : 'Create Profile'}
                            </button>
                            <a
                                href="/aggregator/regulation-profiles"
                                className="flex-1 text-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </a>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Import JSON tab ── */}
            {tab === 'import' && (
                <div className="space-y-4">
                    {/* Upload / Paste zone */}
                    <div className="bg-white shadow rounded-lg p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Upload JSON file</label>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 rounded-md border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-green-400 hover:text-green-600 transition w-full justify-center"
                            >
                                <Upload size={16} /> Click to select a .json file
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file" accept=".json,application/json"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                            <div className="flex-1 h-px bg-gray-200" />
                            or paste JSON below
                            <div className="flex-1 h-px bg-gray-200" />
                        </div>
                        <div>
                            <textarea
                                rows={10}
                                value={jsonText}
                                onChange={e => parseJson(e.target.value)}
                                placeholder={'{\n  "regulation": "ISCC_EU",\n  "version": "2024-v1",\n  "name": "...",\n  "pillars": [...]\n}'}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-green-400"
                                spellCheck={false}
                            />
                        </div>
                        {parseError && (
                            <p className="text-sm text-red-600">⚠ {parseError}</p>
                        )}
                    </div>

                    {/* Preview panel */}
                    {fixture && stats && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-5 space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-green-900">{fixture.name}</p>
                                    {fixture.description && (
                                        <p className="text-xs text-green-700 mt-0.5">{fixture.description}</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-xs font-mono bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                        {fixture.regulation}
                                    </span>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                        v{fixture.version}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-4 text-xs text-green-700">
                                <span>{stats.pillars} pillar{stats.pillars !== 1 ? 's' : ''}</span>
                                <span>·</span>
                                <span>{stats.categories} categor{stats.categories !== 1 ? 'ies' : 'y'}</span>
                                <span>·</span>
                                <span>{stats.requirements} requirement{stats.requirements !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="space-y-1.5">
                                {fixture.pillars.map(p => (
                                    <div key={p.code} className="text-xs">
                                        <span className="font-mono bg-green-200 text-green-800 px-1.5 py-0.5 rounded mr-1.5">
                                            {p.code}
                                        </span>
                                        <span className="font-medium text-green-900">{p.name}</span>
                                        <span className="text-green-600 ml-1.5">
                                            — {p.categories.map(c => c.name).join(', ')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Import button */}
                    {importError && <p className="text-sm text-red-600">⚠ {importError}</p>}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleImport}
                            disabled={!fixture || importing}
                            className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40 transition"
                        >
                            {importing ? 'Importing…' : 'Import Profile'}
                        </button>
                        <a
                            href="/aggregator/regulation-profiles"
                            className="flex-1 text-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                            Cancel
                        </a>
                    </div>

                    {/* Prompt template drawer */}
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setPromptOpen(o => !o)}
                            className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                            <span>Don&apos;t have a JSON? Generate one with AI</span>
                            {promptOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {promptOpen && (
                            <div className="border-t border-gray-100 p-5 space-y-4">
                                <p className="text-xs text-gray-500">
                                    Copy this prompt and paste it into ChatGPT, Claude, or any AI assistant.
                                    Replace <code className="bg-gray-100 px-1 rounded">[REGULATION]</code> and{' '}
                                    <code className="bg-gray-100 px-1 rounded">[VERSION]</code> before sending.
                                </p>
                                <div className="relative">
                                    <pre className="bg-gray-50 border border-gray-200 rounded-md p-4 text-xs font-mono whitespace-pre-wrap text-gray-700 max-h-64 overflow-y-auto">
                                        {AI_PROMPT}
                                    </pre>
                                    <button
                                        type="button"
                                        onClick={handleCopyPrompt}
                                        className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-white border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 shadow-sm transition"
                                    >
                                        {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="flex items-center gap-2 text-sm text-green-700 hover:underline font-medium"
                                >
                                    <Download size={14} /> Download blank template JSON
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
