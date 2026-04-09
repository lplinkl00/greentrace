# Page Load Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate loading spinners on the three dashboard pages and reduce DB round-trips on every API call.

**Architecture:** Convert all three dashboard pages from `'use client'` + `useEffect` fetch to async React Server Components that call data functions directly — data arrives with the HTML. Parallelise the DB queries inside those data functions and cache the session lookup per request.

**Tech Stack:** Next.js 14 App Router (React Server Components), Prisma v7, React `cache()`, Vitest + React Testing Library

---

## Background: What's Slow and Why

Every dashboard page today:
1. Renders a spinner on the client
2. Fires `fetch('/api/dashboard/...')` after hydration
3. The API route calls `getSessionUser()` → 1 Supabase round-trip + 1 Prisma round-trip
4. Then fires 5–6 sequential Prisma queries

After this plan:
1. The server fetches data before sending HTML
2. No spinner — content arrives with the first response
3. `getSessionUser()` is cached per-request (one call, reused)
4. Dashboard queries run in parallel

---

## Task 1: Parallelise `getPortfolioStats()` and replace the GHG loop

**Files:**
- Modify: `src/lib/dashboard.ts`

The function currently runs 5+ sequential `await prisma.*` calls and loops over all certified checklist items in Node to sum GHG. Replace with `Promise.all` and a DB aggregate.

**Step 1: Open the file and identify all sequential awaits**

Read `src/lib/dashboard.ts` lines 1–85 (the `getPortfolioStats` function ends around line 85).

**Step 2: Replace with parallelised version**

Replace the body of `getPortfolioStats()` with:

```ts
export async function getPortfolioStats() {
    const [
        totalCompanies,
        certifiedCompanies,
        activeAuditsCount,
        openFindingsCount,
        ghgResult,
        timelineData,
    ] = await Promise.all([
        prisma.company.count(),

        prisma.company.count({
            where: { checklists: { some: { status: ChecklistStatus.CERTIFIED } } }
        }),

        prisma.audit.count({
            where: {
                status: { in: [AuditStatus.SCHEDULED, AuditStatus.IN_PROGRESS, AuditStatus.FINDINGS_REVIEW] }
            }
        }),

        prisma.auditFinding.count({
            where: {
                findingType: { in: ['NON_CONFORMANT_MAJOR', 'NON_CONFORMANT_MINOR'] },
                checklistItem: {
                    checklist: {
                        audits: { some: { status: { not: AuditStatus.WITHDRAWN } } }
                    }
                }
            }
        }),

        // DB-level aggregate instead of loading all items into memory
        prisma.dataEntry.aggregate({
            _sum: { valueConverted: true },
            where: {
                emissionFactorId: { not: null },
                checklistItem: { checklist: { status: ChecklistStatus.CERTIFIED } }
            }
        }),

        prisma.company.findMany({
            include: {
                checklists: {
                    where: { status: ChecklistStatus.CERTIFIED },
                    orderBy: { periodEnd: 'desc' },
                    take: 1
                }
            }
        }),
    ])

    const expiryTimeline = timelineData
        .map(company => {
            const latestCert = company.checklists[0]
            return {
                companyId: company.id,
                companyName: company.name,
                latestCertEnd: latestCert ? latestCert.periodEnd : null,
                regulation: latestCert ? latestCert.regulation : null,
            }
        })
        .filter(m => m.latestCertEnd !== null)
        .sort((a, b) => a.latestCertEnd!.getTime() - b.latestCertEnd!.getTime())

    return {
        totalCompanies,
        certifiedCompanies,
        activeAuditsCount,
        openFindingsCount,
        totalGhgKgCo2e: ghgResult._sum.valueConverted?.toNumber() ?? 0,
        expiryTimeline,
    }
}
```

**Step 3: Run the existing tests**

```bash
cd /d/Claude\ Code && bun run test 2>&1 | tail -20
```

Expected: all tests pass (the function signature and return shape are identical).

**Step 4: Commit**

```bash
git add src/lib/dashboard.ts
git commit -m "perf: parallelise getPortfolioStats queries and use DB aggregate for GHG"
```

---

## Task 2: Parallelise `getCompanyStats()` and `getAuditorStats()`

**Files:**
- Modify: `src/lib/dashboard.ts`

**Step 1: Update `getCompanyStats()`**

The function currently loads a checklist with all its items eagerly, then does a second sequential `prisma.dataEntry.count` call. The eager load of `items` with nested `dataEntries` is needed for the pillar breakdown — keep that. But the separate `unacknowledgedAlerts` count can be parallelised with the main checklist query.

Replace:
```ts
// The existing:
const latestChecklist = await prisma.checklist.findFirst({ ... })
if (!latestChecklist) return null
// ... process items ...
const unacknowledgedAlerts = await prisma.dataEntry.count({ ... })
```

With:
```ts
const latestChecklistPromise = prisma.checklist.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    include: {
        items: {
            include: {
                requirement: { include: { category: { include: { pillar: true } } } },
                dataEntries: {
                    where: { emissionFactorId: { not: null } },
                    select: { valueConverted: true }
                }
            }
        },
        massBalanceEntries: true
    }
})

// We need the checklist ID for the alerts query, so fetch checklist first
// to get its ID, then parallelise the alerts count if checklist exists.
// (The checklist load is the heavy query; alerts count is cheap.)
const latestChecklist = await latestChecklistPromise
if (!latestChecklist) return null

// ... compute progressByPillar, totalGhg, mbEntries, mbDiscrepancies as before ...

const unacknowledgedAlerts = await prisma.dataEntry.count({
    where: {
        checklistItem: { checklistId: latestChecklist.id },
        reconciliationFlag: true,
        reconciliationAcknowledgedAt: null,
    }
})
```

Note: The `unacknowledgedAlerts` query depends on `latestChecklist.id`, so it must be sequential. The main win here is already captured in Task 1. Leave this function structurally as-is — no regression risk.

**Step 2: Update `getAuditorStats()`**

The function runs `prisma.audit.findMany`, then `prisma.auditReport.findMany`, then `prisma.auditFinding.count` — all sequential. Wrap the independent ones:

```ts
export async function getAuditorStats(auditorId: string) {
    const [activeAudits, reportsToFinalise, totalFindings] = await Promise.all([
        prisma.audit.findMany({
            where: {
                auditorId,
                status: { in: [AuditStatus.SCHEDULED, AuditStatus.IN_PROGRESS, AuditStatus.FINDINGS_REVIEW] }
            },
            include: { company: { select: { name: true } } },
            orderBy: { conductedDate: 'asc' }
        }),

        prisma.auditReport.findMany({
            where: { status: 'DRAFT', audit: { auditorId } },
            orderBy: { version: 'desc' },
            distinct: ['auditId'],
            include: { audit: { include: { company: true } } }
        }),

        prisma.auditFinding.count({
            where: {
                checklistItem: {
                    checklist: {
                        audits: { some: { auditorId, status: { not: AuditStatus.WITHDRAWN } } }
                    }
                }
            }
        }),
    ])

    const auditsDueSoon = activeAudits.filter(a => {
        if (!a.conductedDate) return false
        const diffDays = (a.conductedDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)
        return diffDays >= 0 && diffDays <= 14
    })

    return {
        activeAuditsCount: activeAudits.length,
        auditsDueSoon: auditsDueSoon.map(a => ({
            id: a.id,
            companyName: a.company.name,
            regulation: a.regulation,
            conductedDate: a.conductedDate,
            status: a.status
        })),
        reportsToFinalise: reportsToFinalise.map(r => ({
            id: r.id,
            auditId: r.auditId,
            companyName: r.audit.company.name,
            version: r.version,
            generatedAt: r.generatedAt
        })),
        totalFindings
    }
}
```

**Step 3: Run tests**

```bash
bun run test 2>&1 | tail -20
```

Expected: all pass.

**Step 4: Commit**

```bash
git add src/lib/dashboard.ts
git commit -m "perf: parallelise getAuditorStats queries with Promise.all"
```

---

## Task 3: Cache `getSessionUser()` per request

**Files:**
- Modify: `src/lib/auth.ts`

React's `cache()` deduplicates async function calls within a single server render pass. Any server component or API route that calls `getSessionUser()` multiple times in the same request gets the cached result — one Supabase call, one Prisma call total.

**Step 1: Add the `cache` import and wrap the function**

At the top of `src/lib/auth.ts`, add:
```ts
import { cache } from 'react'
```

Then change:
```ts
export async function getSessionUser(): Promise<SessionUser | null> {
```

To:
```ts
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
```

And close the function body with `})` instead of `}`.

The full file becomes:
```ts
import { UserRole } from '@prisma/client'
import { prisma } from './prisma'
import { createClient } from './supabase-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { cache } from 'react'

export type SessionUser = {
    id: string
    email: string
    name: string
    role: UserRole
    companyId: string | null
    organisationId: string | null
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
    const supabase = createClient(cookies())
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

    if (error || !supabaseUser) return null

    const user = await prisma.user.findUnique({
        where: { supabaseUserId: supabaseUser.id }
    })

    if (!user || !user.isActive) return null

    let resolvedCompanyId = user.companyId

    if (user.role === 'SUPER_ADMIN') {
        const cookieStore = cookies()
        const activeCompanyId = cookieStore.get('activeCompanyId')?.value
        if (activeCompanyId) resolvedCompanyId = activeCompanyId
    }

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: resolvedCompanyId,
        organisationId: user.organisationId,
    }
})

export function withAuth(
    roles: UserRole[],
    handler: (request: Request, context: any, user: SessionUser) => Promise<NextResponse> | NextResponse
) {
    return async (request: Request, context: any) => {
        const user = await getSessionUser()
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        if (!roles.includes(user.role)) {
            return new NextResponse('Forbidden', { status: 403 })
        }

        return handler(request, context, user)
    }
}
```

**Step 2: Run tests**

```bash
bun run test 2>&1 | tail -20
```

Expected: all pass (no test touches `getSessionUser` directly).

**Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "perf: cache getSessionUser() per request with React cache()"
```

---

## Task 4: Add HTTP cache headers to dashboard API routes

**Files:**
- Modify: `src/app/api/dashboard/portfolio/route.ts`
- Modify: `src/app/api/dashboard/auditor/route.ts`
- Modify: `src/app/api/dashboard/company/[companyId]/route.ts`

Dashboard data is not real-time. `private, max-age=30` allows the browser to serve a cached response for 30 seconds before re-fetching. `stale-while-revalidate=60` lets it serve stale data while refreshing in the background.

**Step 1: Update portfolio route**

In `src/app/api/dashboard/portfolio/route.ts`, change:
```ts
return NextResponse.json({ data: stats })
```
To:
```ts
return NextResponse.json({ data: stats }, {
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
})
```

**Step 2: Update auditor route**

In `src/app/api/dashboard/auditor/route.ts`, same pattern:
```ts
return NextResponse.json({ data: stats }, {
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
})
```

**Step 3: Update company route**

In `src/app/api/dashboard/company/[companyId]/route.ts`, same pattern on the success response:
```ts
return NextResponse.json({ data: stats }, {
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
})
```

Leave the error responses without cache headers.

**Step 4: Run tests**

```bash
bun run test 2>&1 | tail -20
```

Expected: all pass.

**Step 5: Commit**

```bash
git add src/app/api/dashboard/portfolio/route.ts \
        src/app/api/dashboard/auditor/route.ts \
        src/app/api/dashboard/company/\[companyId\]/route.ts
git commit -m "perf: add 30s private cache headers to dashboard API routes"
```

---

## Task 5: Convert Aggregator Dashboard to Server Component

**Files:**
- Modify: `src/app/(aggregator)/aggregator/dashboard/page.tsx`
- Modify: `src/test/aggregator-dashboard.test.tsx`

**Step 1: Update the test first (TDD)**

The existing test mocks `global.fetch`. After this change the component calls `getPortfolioStats()` directly — no fetch. Update `src/test/aggregator-dashboard.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/link', () => ({
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}))

vi.mock('@/lib/dashboard', () => ({
    getPortfolioStats: vi.fn().mockResolvedValue({
        totalCompanies: 2,
        certifiedCompanies: 1,
        activeAuditsCount: 3,
        openFindingsCount: 5,
        totalGhgKgCo2e: 5000,
        expiryTimeline: [],
    }),
}))

// Server components are async functions — call and await to get renderable JSX
const { default: AggregatorDashboard } = await import(
    '@/app/(aggregator)/aggregator/dashboard/page'
)

describe('Aggregator dashboard — Recent Audits section', () => {
    it('View All link points to /aggregator/audits', async () => {
        render(await AggregatorDashboard())
        const recentAuditsSection = screen.getByText('Recent Audits').closest('div.bg-white')!
        const viewAllLink = within(recentAuditsSection).getByRole('link', { name: /view all/i })
        expect(viewAllLink).toHaveAttribute('href', '/aggregator/audits')
    })
})
```

**Step 2: Run test — confirm it fails**

```bash
bun run test src/test/aggregator-dashboard.test.tsx 2>&1 | tail -20
```

Expected: FAIL — component still fetches, test mocks the module but the component uses `fetch`.

**Step 3: Rewrite the page as an async Server Component**

Replace the entire `src/app/(aggregator)/aggregator/dashboard/page.tsx` with:

```tsx
import Link from 'next/link'
import { Building2, BarChart3, ClipboardList, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react'
import { getPortfolioStats } from '@/lib/dashboard'

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    accent,
}: {
    icon: React.ElementType
    label: string
    value: React.ReactNode
    sub?: string
    accent: string
}) {
    return (
        <div className="bg-white rounded-xl border border-zinc-100 p-5 shadow-card hover:shadow-card-hover transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: accent + '18' }}>
                    <Icon size={15} style={{ color: accent }} />
                </div>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{value}</p>
            {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
        </div>
    )
}

export default async function AggregatorDashboard() {
    const stats = await getPortfolioStats()

    const complianceRate = stats.totalCompanies > 0
        ? Math.round((stats.certifiedCompanies / stats.totalCompanies) * 100)
        : 0

    return (
        <div className="space-y-7">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">Portfolio Health Dashboard</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">Global overview across all companies and certifications.</p>
                </div>
                <Link
                    href="/aggregator/companies"
                    className="flex items-center gap-1.5 text-xs font-medium text-orange-500 hover:text-orange-600 transition"
                >
                    Full Report <ArrowRight size={13} />
                </Link>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Building2}
                    label="Total Compliance"
                    value={<>{complianceRate}%</>}
                    sub={`${stats.certifiedCompanies} of ${stats.totalCompanies} companies certified`}
                    accent="#f97316"
                />
                <StatCard
                    icon={ClipboardList}
                    label="Pending Audits"
                    value={stats.activeAuditsCount}
                    sub="In queue"
                    accent="#a855f7"
                />
                <StatCard
                    icon={AlertTriangle}
                    label="High-Risk Suppliers"
                    value={stats.openFindingsCount}
                    sub="Open findings"
                    accent="#ef4444"
                />
                <StatCard
                    icon={BarChart3}
                    label="Total GHG Emissions"
                    value={<>{(stats.totalGhgKgCo2e / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-base font-normal text-zinc-400">tCO₂e</span></>}
                    sub="From certified periods"
                    accent="#3b82f6"
                />
            </div>

            {/* Certification expiry table */}
            <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                    <h2 className="font-semibold text-zinc-800 text-sm">Certification Expiry Timeline</h2>
                    <Link href="/aggregator/companies" className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 transition">
                        View All <ArrowRight size={12} />
                    </Link>
                </div>

                {stats.expiryTimeline.length === 0 ? (
                    <p className="p-6 text-zinc-400 text-sm">No certified companies to display.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-50 bg-zinc-50/60">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Company Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Regulation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Expiry Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {stats.expiryTimeline.map(item => {
                                    const expiryDate = new Date(item.latestCertEnd!)
                                    const diffDays = (expiryDate.getTime() - Date.now()) / (1000 * 3600 * 24)
                                    const accentColor = diffDays <= 0 ? '#ef4444' : diffDays <= 60 ? '#f97316' : '#22c55e'
                                    const badge = diffDays <= 0
                                        ? { text: 'Expired', bg: '#fef2f2', color: '#dc2626' }
                                        : diffDays <= 60
                                            ? { text: 'Expiring Soon', bg: '#fff7ed', color: '#c2410c' }
                                            : { text: 'Valid', bg: '#f0fdf4', color: '#15803d' }

                                    return (
                                        <tr key={item.companyId} className="hover:bg-zinc-50/50 transition-colors">
                                            <td className="px-6 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-0.5 h-8 rounded-full" style={{ backgroundColor: accentColor }} />
                                                    <Link href={`/aggregator/companies/${item.companyId}`} className="font-medium text-zinc-800 hover:text-orange-600 transition">
                                                        {item.companyName}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600">
                                                    {item.regulation!.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap">
                                                <span
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                                    style={{ backgroundColor: badge.bg, color: badge.color }}
                                                >
                                                    {badge.text}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap text-zinc-500 text-xs">
                                                {expiryDate.toLocaleDateString()}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Recent audits placeholder row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-zinc-800 text-sm">Recent Audits</h2>
                        <Link href="/aggregator/audits" className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 transition">
                            View All <ArrowRight size={12} />
                        </Link>
                    </div>
                    <div className="flex flex-col items-center justify-center py-8 text-zinc-300">
                        <ClipboardList size={28} className="mb-2" />
                        <p className="text-xs">Audit feed coming soon</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-zinc-800 text-sm">GHG Trend</h2>
                        <span className="text-xs text-zinc-400">Last 12 months</span>
                    </div>
                    <div className="flex flex-col items-center justify-center py-8 text-zinc-300">
                        <TrendingUp size={28} className="mb-2" />
                        <p className="text-xs">Chart coming soon</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
```

Key changes from the original:
- Removed `'use client'`, `useState`, `useEffect` imports
- Page is now `async function`
- Calls `getPortfolioStats()` directly (no fetch)
- No loading spinner (data is ready before render)
- No error state (if Prisma throws, Next.js will show the error boundary)

**Step 4: Run the test — confirm it passes**

```bash
bun run test src/test/aggregator-dashboard.test.tsx 2>&1 | tail -20
```

Expected: PASS.

**Step 5: Run all tests**

```bash
bun run test 2>&1 | tail -20
```

Expected: all pass.

**Step 6: Commit**

```bash
git add src/app/\(aggregator\)/aggregator/dashboard/page.tsx \
        src/test/aggregator-dashboard.test.tsx
git commit -m "perf: convert aggregator dashboard to React Server Component"
```

---

## Task 6: Convert Company Dashboard to Server Component

**Files:**
- Modify: `src/app/(company)/company/dashboard/page.tsx`
- Modify: `src/test/company-dashboard-no-company.test.tsx`

**Step 1: Update the test first**

The existing test mocks `fetch` to return `{ error: 'User is not associated with a company' }`. After this change, the component calls `getSessionUser()` + `getCompanyStats()` directly. The "no company" case happens when `getSessionUser()` returns a user with `companyId: null`.

Replace `src/test/company-dashboard-no-company.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/link', () => ({
    default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

vi.mock('@/lib/auth', () => ({
    getSessionUser: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'COMPANY_MANAGER',
        companyId: null,   // ← the "no company" case
        organisationId: null,
    }),
}))

vi.mock('@/lib/dashboard', () => ({
    getCompanyStats: vi.fn(),  // should not be called when companyId is null
}))

const { default: CompanyDashboard } = await import(
    '@/app/(company)/company/dashboard/page'
)

describe('Company dashboard — no associated company', () => {
    it('shows a friendly message instead of a red error screen', async () => {
        render(await CompanyDashboard())
        const msg = await screen.findByText(/no company associated/i)
        expect(msg).toBeInTheDocument()
        expect(screen.queryByText(/^Error:/)).not.toBeInTheDocument()
    })
})
```

**Step 2: Run test — confirm it fails**

```bash
bun run test src/test/company-dashboard-no-company.test.tsx 2>&1 | tail -20
```

Expected: FAIL.

**Step 3: Rewrite the page as an async Server Component**

Replace the entire `src/app/(company)/company/dashboard/page.tsx`:

```tsx
import Link from 'next/link'
import { CheckCircle2, Leaf, AlertTriangle, ArrowRight, FileText, Clock } from 'lucide-react'
import { getSessionUser } from '@/lib/auth'
import { getCompanyStats } from '@/lib/dashboard'

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    DRAFT:        { bg: '#f4f4f5', color: '#71717a' },
    SUBMITTED:    { bg: '#eff6ff', color: '#2563eb' },
    UNDER_REVIEW: { bg: '#fef9c3', color: '#92400e' },
    UNDER_AUDIT:  { bg: '#fff7ed', color: '#c2410c' },
    CERTIFIED:    { bg: '#f0fdf4', color: '#15803d' },
    LOCKED:       { bg: '#1c1917', color: '#fafaf9' },
}

export default async function CompanyDashboardPage() {
    const user = await getSessionUser()

    if (!user?.companyId) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400 text-sm gap-2">
                <p className="font-medium text-zinc-600">No company associated</p>
                <p>Your account is not linked to a company. Contact your administrator.</p>
            </div>
        )
    }

    const stats = await getCompanyStats(user.companyId)

    if (!stats) {
        return <div className="text-zinc-400 text-sm p-4">No active checklists found.</div>
    }

    const progressPct = stats.progress.totalItems > 0
        ? Math.round((stats.progress.completedItems / stats.progress.totalItems) * 100)
        : 0
    const statusStyle = STATUS_STYLE[stats.status] ?? STATUS_STYLE.DRAFT

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">Company Dashboard</h1>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        {new Date(stats.periodStart).toLocaleDateString()} – {new Date(stats.periodEnd).toLocaleDateString()}
                        <span className="mx-2 text-zinc-200">|</span>
                        {stats.regulation.replace(/_/g, ' ')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={statusStyle}
                    >
                        {stats.status}
                    </span>
                    <Link
                        href={`/company/checklists/${stats.checklistId}`}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition"
                        style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                    >
                        Continue Entry <ArrowRight size={12} />
                    </Link>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-5">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Traceability Score</p>
                        <CheckCircle2 size={15} className="text-orange-400 mt-0.5" />
                    </div>
                    <p className="text-2xl font-bold text-zinc-900">{progressPct}%</p>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full mt-3">
                        <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #f97316, #ef4444)' }}
                        />
                    </div>
                    <p className="text-xs text-zinc-400 mt-1.5">{stats.progress.completedItems} / {stats.progress.totalItems} items</p>
                </div>

                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-5">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Pending Data Points</p>
                        <Clock size={15} className="text-purple-400 mt-0.5" />
                    </div>
                    <p className="text-2xl font-bold text-zinc-900">{stats.progress.totalItems - stats.progress.completedItems}</p>
                    <p className="text-xs text-zinc-400 mt-1">Action required by ESD</p>
                </div>

                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-5">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">GHG Intensity</p>
                        <Leaf size={15} className="text-green-500 mt-0.5" />
                    </div>
                    <p className="text-2xl font-bold text-zinc-900">
                        {(stats.ghgTotalKgCo2e / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        <span className="text-sm font-normal text-zinc-400 ml-1">tCO₂e</span>
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">Scope 1+2+3 total</p>
                </div>

                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-5">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Action Items</p>
                        <AlertTriangle size={15} className="text-amber-400 mt-0.5" />
                    </div>
                    <div className="flex items-end gap-4">
                        <div>
                            <p className={`text-2xl font-bold ${stats.reconciliationAlerts > 0 ? 'text-red-500' : 'text-zinc-900'}`}>
                                {stats.reconciliationAlerts}
                            </p>
                            <p className="text-xs text-zinc-400">Alerts</p>
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${stats.massBalance.discrepancies > 0 ? 'text-amber-500' : 'text-zinc-900'}`}>
                                {stats.massBalance.discrepancies}
                            </p>
                            <p className="text-xs text-zinc-400">Discrepancies</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Pillar progress */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-100 shadow-card p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-semibold text-zinc-800 text-sm">Checklist Completion by Pillar</h2>
                        <Link href={`/company/checklists/${stats.checklistId}`} className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 transition">
                            View All <ArrowRight size={12} />
                        </Link>
                    </div>
                    <div className="space-y-3.5">
                        {stats.progress.byPillar.map(pillar => (
                            <div key={pillar.pillar}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs font-medium text-zinc-700 truncate max-w-[60%]" title={pillar.pillar}>
                                        {pillar.pillar}
                                    </span>
                                    <span className="text-xs text-zinc-400 tabular-nums">
                                        {pillar.completed}/{pillar.total} · {pillar.percentage}%
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-zinc-100 rounded-full">
                                    <div
                                        className="h-1.5 rounded-full"
                                        style={{
                                            width: `${pillar.percentage}%`,
                                            background: pillar.percentage === 100 ? '#22c55e' : 'linear-gradient(90deg, #f97316, #ef4444)',
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick tools */}
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-6">
                    <h2 className="font-semibold text-zinc-800 text-sm mb-4">Quick Tools</h2>
                    <div className="grid grid-cols-2 gap-2">
                        {([
                            { label: 'Scan/Edit', icon: CheckCircle2, href: `/company/checklists/${stats.checklistId}` },
                            { label: 'Report', icon: FileText, href: '/company/checklists' },
                            { label: 'Help Desk', icon: AlertTriangle, href: '#' },
                            { label: 'Setup', icon: Clock, href: '/company/settings' },
                        ] as const).map(t => {
                            const Icon = t.icon
                            return (
                                <Link
                                    key={t.label}
                                    href={t.href}
                                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg bg-zinc-50 hover:bg-orange-50 border border-zinc-100 hover:border-orange-100 transition text-center"
                                >
                                    <Icon size={16} className="text-zinc-400" />
                                    <span className="text-xs font-medium text-zinc-600">{t.label}</span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
```

Key changes:
- Removed `'use client'`, `useState`, `useEffect`
- Calls `getSessionUser()` directly to get `companyId`
- Calls `getCompanyStats(user.companyId)` directly
- No fetch, no spinner

**Step 4: Run the test — confirm it passes**

```bash
bun run test src/test/company-dashboard-no-company.test.tsx 2>&1 | tail -20
```

Expected: PASS.

**Step 5: Run all tests**

```bash
bun run test 2>&1 | tail -20
```

Expected: all pass.

**Step 6: Commit**

```bash
git add src/app/\(company\)/company/dashboard/page.tsx \
        src/test/company-dashboard-no-company.test.tsx
git commit -m "perf: convert company dashboard to React Server Component"
```

---

## Task 7: Convert Auditor Dashboard to Server Component

**Files:**
- Modify: `src/app/(auditor)/auditor/dashboard/page.tsx`

There is no existing test for the auditor dashboard. Write a minimal one first.

**Step 1: Write a new test file**

Create `src/test/auditor-dashboard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/link', () => ({
    default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

vi.mock('@/lib/auth', () => ({
    getSessionUser: vi.fn().mockResolvedValue({
        id: 'auditor-1',
        email: 'auditor@test.com',
        name: 'Test Auditor',
        role: 'AUDITOR',
        companyId: null,
        organisationId: null,
    }),
}))

vi.mock('@/lib/dashboard', () => ({
    getAuditorStats: vi.fn().mockResolvedValue({
        activeAuditsCount: 2,
        auditsDueSoon: [],
        reportsToFinalise: [],
        totalFindings: 7,
    }),
}))

const { default: AuditorDashboard } = await import(
    '@/app/(auditor)/auditor/dashboard/page'
)

describe('Auditor dashboard', () => {
    it('renders the heading', async () => {
        render(await AuditorDashboard())
        expect(screen.getByText('Auditor Dashboard')).toBeInTheDocument()
    })

    it('shows total findings count', async () => {
        render(await AuditorDashboard())
        expect(screen.getByText('7')).toBeInTheDocument()
    })
})
```

**Step 2: Run test — confirm it fails**

```bash
bun run test src/test/auditor-dashboard.test.tsx 2>&1 | tail -20
```

Expected: FAIL — component still uses `fetch`.

**Step 3: Rewrite the page as an async Server Component**

Replace `src/app/(auditor)/auditor/dashboard/page.tsx`:

```tsx
import Link from 'next/link'
import { ClipboardList, FileText, AlertTriangle, ArrowRight, Calendar, CheckCircle2 } from 'lucide-react'
import { getSessionUser } from '@/lib/auth'
import { getAuditorStats } from '@/lib/dashboard'

const AUDIT_STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    SCHEDULED:       { bg: '#eff6ff', color: '#2563eb', label: 'Scheduled' },
    IN_PROGRESS:     { bg: '#fff7ed', color: '#c2410c', label: 'In Progress' },
    COMPLETED:       { bg: '#f0fdf4', color: '#15803d', label: 'Completed' },
    PUBLISHED:       { bg: '#f0fdf4', color: '#15803d', label: 'Published' },
    FINDINGS_REVIEW: { bg: '#fef9c3', color: '#92400e', label: 'Findings Review' },
    PENDING:         { bg: '#f4f4f5', color: '#71717a', label: 'Pending' },
}

export default async function AuditorDashboardPage() {
    const user = await getSessionUser()
    if (!user) return null  // middleware handles redirect; this is a safety fallback

    const stats = await getAuditorStats(user.id)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-zinc-900">Auditor Dashboard</h1>
                <p className="text-sm text-zinc-400 mt-0.5">Your assigned audits and pending actions.</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-5">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Audits Completed</p>
                        <CheckCircle2 size={15} className="text-green-500 mt-0.5" />
                    </div>
                    <p className="text-2xl font-bold text-zinc-900">{stats.activeAuditsCount}</p>
                    <Link href="/auditor/audits" className="text-xs text-orange-500 hover:text-orange-600 mt-1.5 flex items-center gap-1 transition">
                        View All Active <ArrowRight size={11} />
                    </Link>
                </div>

                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-5">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Pending Reviews</p>
                        <FileText size={15} className="text-amber-400 mt-0.5" />
                    </div>
                    <p className="text-2xl font-bold text-zinc-900">{stats.reportsToFinalise.length}</p>
                    <p className="text-xs text-amber-500 mt-1">High-priority status</p>
                </div>

                <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-5">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Avg. Completion Time</p>
                        <ClipboardList size={15} className="text-blue-400 mt-0.5" />
                    </div>
                    <p className="text-2xl font-bold text-zinc-900">{stats.totalFindings}</p>
                    <p className="text-xs text-zinc-400 mt-1">Total findings across audits</p>
                </div>
            </div>

            {/* Two-column */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Audit queue */}
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-50">
                        <h2 className="font-semibold text-zinc-800 text-sm">My Audit Queue</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                                {stats.auditsDueSoon.length} assigned
                            </span>
                            <Link href="/auditor/audits" className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 transition">
                                View All <ArrowRight size={11} />
                            </Link>
                        </div>
                    </div>
                    {stats.auditsDueSoon.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-zinc-300">
                            <Calendar size={24} className="mb-2" />
                            <p className="text-xs">No upcoming audits</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-zinc-50">
                            {stats.auditsDueSoon.map(audit => {
                                const s = AUDIT_STATUS_STYLE[audit.status] ?? AUDIT_STATUS_STYLE.PENDING
                                return (
                                    <li key={audit.id} className="px-6 py-3.5 hover:bg-zinc-50/60 transition-colors">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <Link href={`/auditor/audits/${audit.id}`} className="text-sm font-medium text-zinc-800 hover:text-orange-600 truncate block transition">
                                                    {audit.companyName}
                                                </Link>
                                                <p className="text-xs text-zinc-400 mt-0.5">
                                                    {audit.regulation.replace(/_/g, ' ')}
                                                    <span className="mx-1.5 text-zinc-200">·</span>
                                                    {audit.conductedDate ? new Date(audit.conductedDate).toLocaleDateString() : '—'}
                                                </p>
                                            </div>
                                            <span
                                                className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                                                style={{ backgroundColor: s.bg, color: s.color }}
                                            >
                                                {s.label}
                                            </span>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                {/* Reports to finalise */}
                <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-50">
                        <h2 className="font-semibold text-zinc-800 text-sm">Draft Reports Requiring Action</h2>
                        {stats.reportsToFinalise.length > 0 && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                                {stats.reportsToFinalise.length}
                            </span>
                        )}
                    </div>
                    {stats.reportsToFinalise.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-zinc-300">
                            <CheckCircle2 size={24} className="mb-2" />
                            <p className="text-xs">No draft reports require action</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-zinc-50">
                            {stats.reportsToFinalise.map(report => (
                                <li key={report.id} className="px-6 py-3.5 hover:bg-zinc-50/60 transition-colors">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-zinc-800 truncate">{report.companyName}</p>
                                            <p className="text-xs text-zinc-400 mt-0.5">
                                                Draft v{report.version} · {new Date(report.generatedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Link
                                            href={`/auditor/audits/${report.auditId}/report`}
                                            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-orange-200 hover:text-orange-600 transition shrink-0"
                                        >
                                            Review
                                        </Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
```

Key changes:
- Removed `'use client'`, `useState`, `useEffect`
- Calls `getSessionUser()` to get `user.id` for `getAuditorStats()`
- No fetch, no spinner

**Step 4: Run the new test — confirm it passes**

```bash
bun run test src/test/auditor-dashboard.test.tsx 2>&1 | tail -20
```

Expected: PASS.

**Step 5: Run all tests**

```bash
bun run test 2>&1 | tail -20
```

Expected: all pass.

**Step 6: Commit**

```bash
git add src/app/\(auditor\)/auditor/dashboard/page.tsx \
        src/test/auditor-dashboard.test.tsx
git commit -m "perf: convert auditor dashboard to React Server Component"
```

---

## Final Verification

**Step 1: Build check**

```bash
bun run build 2>&1 | tail -30
```

Expected: build succeeds with no errors. Check that the three dashboard pages are listed as server-rendered (not marked with ○ static or λ edge).

**Step 2: Manual smoke test**

Start the dev server:
```bash
bun run dev
```

Visit each dashboard as the appropriate user:
- `http://localhost:3000/` as `admin@greentrace.local` / `admin123` → aggregator dashboard should render immediately with no spinner
- `http://localhost:3000/` as `ps.manager@greentrace.local` / `manager123` → company dashboard, no spinner
- `http://localhost:3000/` as `auditor@greentrace.local` / `auditor123` → auditor dashboard, no spinner

**Step 3: Final commit summary**

All changes are already committed per-task. The branch `optimizations-1` is ready to open a PR against `dev`.
