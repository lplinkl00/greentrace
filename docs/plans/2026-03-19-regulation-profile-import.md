# Regulation Profile Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a two-tab creation flow to `/aggregator/regulation-profiles/new` — Manual (existing shell form) + Import JSON (file upload/paste with preview and AI prompt template) — backed by a new `POST /api/regulation-profiles/import` endpoint.

**Architecture:** Three independent pieces wired together: (1) `importProfile()` lib function does the full nested Prisma create, (2) the import API route validates + calls it, (3) the page replaces the existing single-form with a tabbed layout that includes the import UI and the collapsible prompt template drawer.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma v7 + PrismaPg adapter, Tailwind CSS, React useState/useEffect, `withAuth` middleware pattern.

---

## Context

- Design doc: `docs/plans/2026-03-19-regulation-profile-import-design.md`
- Existing page to replace: `src/app/(aggregator)/aggregator/regulation-profiles/new/page.tsx`
- Existing lib: `src/lib/regulation-profiles.ts`
- Fixture format reference: `prisma/fixtures/iscc-eu.json`
- `RegulationCode` enum values: `ISCC_EU`, `ISCC_PLUS`, `RSPO_PC`, `RSPO_SCCS`
- `RequirementDataType` values: `ABSOLUTE_QUANTITY`, `RATE`, `DOCUMENT_ONLY`, `TEXT_RESPONSE`
- `RequirementCriticality` values: `CRITICAL`, `NON_CRITICAL`
- `GhgScope` values: `SCOPE1`, `SCOPE2`, `SCOPE3` (nullable)
- Auth pattern: `withAuth([UserRole.SUPER_ADMIN], async (request, context, user) => {...})`
- No test files exist in this project — verification is done by running `bun run build` and browser smoke-testing via `mcp__Claude_Preview__*` tools

---

### Task 1: Add `importProfile()` to regulation-profiles lib

**Files:**
- Modify: `src/lib/regulation-profiles.ts`

**Step 1: Add the fixture type and importProfile function**

At the top of `src/lib/regulation-profiles.ts`, after the existing imports, add a `RegulationProfileFixture` TypeScript type, then add the `importProfile()` function after `createProfile()`.

Add this to `src/lib/regulation-profiles.ts` (after the existing imports, before `getProfiles`):

```typescript
// ─── Fixture import types ────────────────────────────────────────────────────

export type FixtureRequirement = {
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

export type FixtureCategory = {
    code: string
    name: string
    displayOrder?: number
    requirements: FixtureRequirement[]
}

export type FixturePillar = {
    code: string
    name: string
    displayOrder?: number
    categories: FixtureCategory[]
}

export type RegulationProfileFixture = {
    regulation: RegulationCode
    version: string
    name: string
    description?: string | null
    pillars: FixturePillar[]
}
```

Then add `importProfile()` right after `createProfile()`:

```typescript
export async function importProfile(fixture: RegulationProfileFixture) {
    return prisma.regulationProfile.create({
        data: {
            regulation: fixture.regulation,
            version: fixture.version,
            name: fixture.name,
            description: fixture.description ?? null,
            pillars: {
                create: fixture.pillars.map((pillar, pi) => ({
                    code: pillar.code,
                    name: pillar.name,
                    displayOrder: pillar.displayOrder ?? pi,
                    categories: {
                        create: pillar.categories.map((cat, ci) => ({
                            code: cat.code,
                            name: cat.name,
                            displayOrder: cat.displayOrder ?? ci,
                            requirements: {
                                create: cat.requirements.map((req, ri) => ({
                                    code: req.code,
                                    name: req.name,
                                    description: req.description,
                                    guidanceText: req.guidanceText ?? null,
                                    dataType: req.dataType as any,
                                    criticality: req.criticality as any,
                                    ghgScope: req.ghgScope ?? null,
                                    unit: req.unit ?? null,
                                    requiresForm: req.requiresForm ?? false,
                                    displayOrder: req.displayOrder ?? ri,
                                })),
                            },
                        })),
                    },
                })),
            },
        },
        include: { _count: { select: { pillars: true } } },
    })
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd "D:/Claude Code" && bun run build 2>&1 | tail -20
```

Expected: Build succeeds (or only pre-existing lint errors, no new type errors).

**Step 3: Commit**

```bash
cd "D:/Claude Code" && git add src/lib/regulation-profiles.ts && git commit -m "feat: add importProfile() lib function for full nested profile create"
```

---

### Task 2: Create the import API route

**Files:**
- Create: `src/app/api/regulation-profiles/import/route.ts`

**Step 1: Create the route file**

```typescript
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole, RegulationCode } from '@prisma/client'
import { importProfile, RegulationProfileFixture } from '@/lib/regulation-profiles'
import { prisma } from '@/lib/prisma'

const VALID_REGULATIONS = Object.values(RegulationCode) as string[]

export const POST = withAuth(
    [UserRole.SUPER_ADMIN],
    async (request: Request, _context: any, _user: any) => {
        let body: any
        try {
            body = await request.json()
        } catch {
            return NextResponse.json(
                { error: { message: 'Invalid JSON body.' } },
                { status: 400 }
            )
        }

        const { regulation, version, name, pillars } = body

        // Validate required fields
        if (!regulation || !VALID_REGULATIONS.includes(regulation)) {
            return NextResponse.json(
                { error: { message: `regulation must be one of: ${VALID_REGULATIONS.join(', ')}` } },
                { status: 422 }
            )
        }
        if (!version || typeof version !== 'string' || !version.trim()) {
            return NextResponse.json(
                { error: { message: 'version is required.' } },
                { status: 422 }
            )
        }
        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json(
                { error: { message: 'name is required.' } },
                { status: 422 }
            )
        }
        if (!Array.isArray(pillars) || pillars.length === 0) {
            return NextResponse.json(
                { error: { message: 'pillars must be a non-empty array.' } },
                { status: 422 }
            )
        }

        // Duplicate check
        const existing = await prisma.regulationProfile.findUnique({
            where: { regulation_version: { regulation, version } },
        })
        if (existing) {
            return NextResponse.json(
                { error: { message: `A profile for ${regulation} version "${version}" already exists.` } },
                { status: 409 }
            )
        }

        try {
            const profile = await importProfile(body as RegulationProfileFixture)
            return NextResponse.json({ data: profile }, { status: 201 })
        } catch (e: any) {
            return NextResponse.json(
                { error: { message: e.message ?? 'Failed to import profile.' } },
                { status: 500 }
            )
        }
    }
)
```

**Step 2: Verify TypeScript compiles**

```bash
cd "D:/Claude Code" && bun run build 2>&1 | tail -20
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
cd "D:/Claude Code" && git add src/app/api/regulation-profiles/import/route.ts && git commit -m "feat: add POST /api/regulation-profiles/import endpoint"
```

---

### Task 3: Replace the new profile page with two-tab layout

**Files:**
- Replace: `src/app/(aggregator)/aggregator/regulation-profiles/new/page.tsx`

**Step 1: Write the full page**

Replace the entire file with:

```tsx
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

const REGULATION_OPTIONS = [
    { value: 'ISCC_EU', label: 'ISCC EU' },
    { value: 'ISCC_PLUS', label: 'ISCC PLUS' },
    { value: 'RSPO_PC', label: 'RSPO PC' },
    { value: 'RSPO_SCCS', label: 'RSPO SCCS' },
]

const AI_PROMPT = `You are a compliance data engineer. Generate a GreenTrace regulation profile JSON for [REGULATION] version [VERSION].

Follow this exact schema:
{
  "regulation": "ISCC_EU|ISCC_PLUS|RSPO_PC|RSPO_SCCS",
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
    regulation: 'ISCC_EU',
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

const VALID_REGULATIONS = ['ISCC_EU', 'ISCC_PLUS', 'RSPO_PC', 'RSPO_SCCS']

function validateFixture(obj: any): string | null {
    if (!obj || typeof obj !== 'object') return 'JSON must be an object.'
    if (!VALID_REGULATIONS.includes(obj.regulation))
        return `"regulation" must be one of: ${VALID_REGULATIONS.join(', ')}`
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

    // Tab
    const [tab, setTab] = useState<Tab>('manual')

    // Manual form state
    const [regulation, setRegulation] = useState('ISCC_EU')
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

    // ── Stats derived ────────────────────────────────────────────────────────

    const stats = fixture ? countStats(fixture) : null

    // ─────────────────────────────────────────────────────────────────────────

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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Regulation</label>
                            <select
                                value={regulation}
                                onChange={e => setRegulation(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            >
                                {REGULATION_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
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
                            <p className="text-sm text-red-600 flex items-center gap-1">
                                ⚠ {parseError}
                            </p>
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
                            {/* Pillar tree */}
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
                    {importError && (
                        <p className="text-sm text-red-600">⚠ {importError}</p>
                    )}
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
                            <span>Don't have a JSON? Generate one with AI</span>
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
```

**Step 2: Verify TypeScript compiles**

```bash
cd "D:/Claude Code" && bun run build 2>&1 | tail -20
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
cd "D:/Claude Code" && git add src/app/(aggregator)/aggregator/regulation-profiles/new/page.tsx && git commit -m "feat: two-tab regulation profile creation with JSON import and AI prompt template"
```

---

### Task 4: Smoke test the full flow

Start the dev server if not running:

```bash
cd "D:/Claude Code" && bun run dev
```

**Test Manual tab:**
1. Navigate to `http://localhost:3000/aggregator/regulation-profiles` as SUPER_ADMIN
2. Click "+ New Profile" — verify you land on the new page with two tabs ("Manual" / "Import JSON")
3. Fill in regulation=ISCC_PLUS, version=test-1, name=Test Shell → click Create Profile
4. Verify redirect to list and new row appears

**Test Import JSON tab (paste):**
1. Navigate back to New Profile, click "Import JSON" tab
2. Paste the contents of `prisma/fixtures/rspo-sccs.json` into the textarea
3. Verify preview panel appears: regulation badge, version, pillar tree, counts
4. Click "Import Profile"
5. Verify redirect to list and new row with correct pillar count appears

**Test Import JSON tab (file upload):**
1. Click "Import JSON" tab, click "Click to select a .json file"
2. Select `prisma/fixtures/rspo-pc.json`
3. Verify preview appears, import succeeds

**Test validation errors:**
1. Paste `{}` — verify error "regulation must be one of..."
2. Paste `{ "regulation": "ISCC_EU", "version": "", "name": "x", "pillars": [] }` — verify error about pillars

**Test prompt template:**
1. Click "Don't have a JSON? Generate one with AI" to expand
2. Verify the AI prompt text is visible
3. Click "Copy" — verify button changes to "Copied!"
4. Click "Download blank template JSON" — verify download starts

**Test duplicate detection:**
1. Try importing `prisma/fixtures/iscc-eu.json` again (already seeded)
2. Verify error toast/message: "A profile for ISCC_EU version '2024-v1' already exists."

**Step 5: Final commit if smoke test passes**

```bash
cd "D:/Claude Code" && git status
```

If no uncommitted changes, the feature is complete.
