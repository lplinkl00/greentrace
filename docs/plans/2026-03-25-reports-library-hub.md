# Reports Library Hub Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the `/auditor/reports` "coming soon" stub with a cross-audit reports library — a searchable, filterable table of every `AuditReport` across all companies, linking through to the existing per-audit report editor.

**Architecture:** A new `GET /api/audit-reports` route (top-level, separate from the existing `GET /api/audit-reports/[id]`) queries `AuditReport` with `Audit` + `Company` joined and returns a flat list. The reports page becomes a `'use client'` component that fetches this endpoint, filters client-side, and renders a table matching the app's zinc/orange design system. No DB schema changes.

**Tech Stack:** Next.js 14, TypeScript, Prisma v7 with PrismaPg adapter, Tailwind CSS, `lucide-react`

---

## Security note

The `withAuth` wrapper handles role enforcement. Use it on the new route exactly as the existing routes do — import from `@/lib/auth`.

---

## Task 1: New `GET /api/audit-reports` list endpoint

**Files:**
- Create: `src/app/api/audit-reports/route.ts`

> **Important:** This file is NEW — it lives at `src/app/api/audit-reports/route.ts` (the top-level segment, not inside `[id]`). The existing `src/app/api/audit-reports/[id]/route.ts` is left completely untouched.

**Step 1: Create the route file**

Create `src/app/api/audit-reports/route.ts` with this exact content:

```ts
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const ALLOWED_ROLES = [
    UserRole.AUDITOR,
    UserRole.SUPER_ADMIN,
    UserRole.AGGREGATOR_MANAGER,
]

export const GET = withAuth(ALLOWED_ROLES, async (_req: Request) => {
    const reports = await prisma.auditReport.findMany({
        orderBy: { generatedAt: 'desc' },
        include: {
            audit: {
                include: {
                    company: {
                        select: { id: true, name: true, code: true },
                    },
                },
            },
        },
    })

    return NextResponse.json({ data: reports })
})
```

**Step 2: Verify TypeScript compiles**

```bash
cd "D:\Claude Code"
npx tsc --noEmit
```

Expected: no errors related to `audit-reports/route.ts`.

**Step 3: Verify the dev server returns data**

Start the dev server if not already running:
```bash
bun run dev
```

In another terminal, hit the endpoint (replace the cookie with a real session — easiest to test via browser DevTools or a logged-in fetch):
```bash
curl -s http://localhost:3000/api/audit-reports \
  -H "Cookie: <your-session-cookie>" | jq '.data | length'
```

Expected: a number ≥ 0 (not an error object). If no session cookie available, checking in the browser while logged in as `auditor@greentrace.local` / `auditor123` is fine.

**Step 4: Commit**

```bash
cd "D:\Claude Code"
git add src/app/api/audit-reports/route.ts
git commit -m "feat(api): add GET /api/audit-reports list endpoint"
```

---

## Task 2: Replace the "coming soon" reports page

**Files:**
- Modify: `src/app/(auditor)/auditor/reports/page.tsx`

**Step 1: Read the current file**

Read `src/app/(auditor)/auditor/reports/page.tsx` before editing. It is currently ~26 lines with a "Reports coming soon." stub.

**Step 2: Replace the entire file**

Overwrite `src/app/(auditor)/auditor/reports/page.tsx` with:

```tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { BarChart3, ArrowRight, FileText } from 'lucide-react'

type ReportRow = {
    id: string
    auditId: string
    version: number
    status: 'DRAFT' | 'FINAL'
    generatedBy: string
    llmModel: string
    generatedAt: string
    updatedAt: string
    audit: {
        periodStart: string
        periodEnd: string
        company: {
            id: string
            name: string
            code: string
        }
    }
}

const STATUS_STYLES = {
    DRAFT: { bg: '#fff7ed', color: '#c2410c' },
    FINAL: { bg: '#f0fdf4', color: '#15803d' },
}

function providerLabel(generatedBy: string) {
    if (generatedBy === 'ANTHROPIC') return 'Claude'
    if (generatedBy === 'GOOGLE') return 'Gemini'
    return generatedBy
}

function relativeDate(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 2) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return new Date(iso).toLocaleDateString()
}

export default function AuditorReportsPage() {
    const [reports, setReports] = useState<ReportRow[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'FINAL'>('ALL')
    const [companyFilter, setCompanyFilter] = useState('ALL')

    useEffect(() => {
        fetch('/api/audit-reports')
            .then(res => res.ok ? res.json() : { data: [] })
            .then(data => { setReports(data.data ?? []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    const companies = useMemo(() => {
        const map = new Map<string, string>()
        reports.forEach(r => map.set(r.audit.company.id, r.audit.company.name))
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
    }, [reports])

    const filtered = useMemo(() => {
        return reports.filter(r => {
            if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
            if (companyFilter !== 'ALL' && r.audit.company.id !== companyFilter) return false
            if (search.trim()) {
                const q = search.trim().toLowerCase()
                if (!r.audit.company.name.toLowerCase().includes(q)) return false
            }
            return true
        })
    }, [reports, statusFilter, companyFilter, search])

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center gap-3">
                <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                >
                    <BarChart3 size={18} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">Reports</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">All audit reports across your companies.</p>
                </div>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap gap-3">
                <input
                    type="text"
                    placeholder="Search company…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="text-sm border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400 w-52"
                />
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className="text-sm border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                    <option value="ALL">All statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="FINAL">Final</option>
                </select>
                {companies.length > 0 && (
                    <select
                        value={companyFilter}
                        onChange={e => setCompanyFilter(e.target.value)}
                        className="text-sm border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                        <option value="ALL">All companies</option>
                        {companies.map(([id, name]) => (
                            <option key={id} value={id}>{name}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-300">
                        <FileText size={32} className="mb-3" />
                        {reports.length === 0 ? (
                            <>
                                <p className="text-sm text-zinc-500 font-medium">No reports yet.</p>
                                <p className="text-xs text-zinc-400 mt-1">
                                    Open an audit and use{' '}
                                    <Link href="/auditor/audits" className="text-orange-500 hover:underline">
                                        Generate with AI
                                    </Link>{' '}
                                    to create the first one.
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-zinc-500">No reports match your filters.</p>
                        )}
                    </div>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-50 bg-zinc-50/60">
                                {['Company', 'Audit Year', 'Status', 'Version', 'Generated By', 'Last Modified', ''].map((h, i) => (
                                    <th key={i} className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {filtered.map(r => {
                                const s = STATUS_STYLES[r.status] ?? { bg: '#f4f4f5', color: '#71717a' }
                                const year = new Date(r.audit.periodStart).getFullYear()
                                return (
                                    <tr key={r.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <div className="font-medium text-zinc-800">{r.audit.company.name}</div>
                                            <div className="text-xs text-zinc-400 font-mono mt-0.5">{r.audit.company.code}</div>
                                        </td>
                                        <td className="px-6 py-3.5 text-zinc-500 text-xs">
                                            {year}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span
                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                                style={{ backgroundColor: s.bg, color: s.color }}
                                            >
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-zinc-500 text-xs">
                                            v{r.version}
                                        </td>
                                        <td className="px-6 py-3.5 text-zinc-500 text-xs">
                                            {providerLabel(r.generatedBy)}
                                        </td>
                                        <td className="px-6 py-3.5 text-zinc-400 text-xs whitespace-nowrap">
                                            {relativeDate(r.updatedAt ?? r.generatedAt)}
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <Link
                                                href={`/auditor/audits/${r.auditId}/report`}
                                                className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium"
                                            >
                                                Open <ArrowRight size={13} />
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd "D:\Claude Code"
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Build check**

```bash
bun run build
```

Expected: build succeeds (ESLint errors are ignored per `eslint.ignoreDuringBuilds: true`).

**Step 5: Manual verification in the browser**

1. Start dev server: `bun run dev`
2. Navigate to `http://localhost:3000/login`, log in as `auditor@greentrace.local` / `auditor123`
3. Click **Reports** in the left sidebar
4. Verify: the table loads and shows at least one row (the seeded PS 2023 PUBLISHED audit has a report)
5. Verify: the status badge is orange for DRAFT or green for FINAL
6. Verify: typing in the search box filters rows by company name
7. Verify: changing the Status dropdown filters the list
8. Verify: clicking **Open →** on any row navigates to the correct `/auditor/audits/[auditId]/report` page

**Step 6: Commit**

```bash
cd "D:\Claude Code"
git add src/app/(auditor)/auditor/reports/page.tsx
git commit -m "feat(auditor): replace reports coming-soon with library hub"
```

---

## Done

The `/auditor/reports` page now shows a fully functional, filterable reports library. The AI writer customization (colour scheme, style preset) is handled by the separate plan `docs/plans/2026-03-25-ai-report-writer-customization.md` and is not in scope here.
