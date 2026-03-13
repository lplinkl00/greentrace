# Production Records Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/mill/production` module for mills to log daily FFB received and CPO/PKO produced, with OER/KER derived on the fly — coexisting with the existing shipments and imports features.

**Architecture:** New `ProductionRecord` Prisma model + migration, `src/lib/production.ts` data layer, two API routes, two pages under `(mill)/mill/production/`, and a new sidebar nav item. No existing files are structurally changed except `AppSidebar.tsx` (add nav item) and `schema.prisma` (add model + enum).

**Tech Stack:** Next.js 14 App Router, Prisma v7 + PrismaPg adapter, Supabase, TypeScript, Bun, Tailwind CSS, lucide-react

---

### Task 1: Add `ProductionSource` enum and `ProductionRecord` model to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add the enum after `ShipmentSource`**

In `prisma/schema.prisma`, find the `ShipmentSource` enum block and add the new enum directly after it:

```prisma
enum ProductionSource {
  MANUAL
  CSV_IMPORT
}
```

**Step 2: Add the model at the end of the file (before the last closing brace if any, or just append)**

```prisma
model ProductionRecord {
  id              String           @id @default(cuid())
  millId          String
  mill            Mill             @relation(fields: [millId], references: [id])
  recordedById    String
  recordedBy      User             @relation(fields: [recordedById], references: [id])

  productionDate  DateTime         @db.Date
  ffbReceivedMt   Decimal          @db.Decimal(18, 4)
  cpoProducedMt   Decimal          @db.Decimal(18, 4)
  pkoProducedMt   Decimal          @db.Decimal(18, 4)
  notes           String?

  source          ProductionSource @default(MANUAL)

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@unique([millId, productionDate])
  @@index([millId, productionDate])
}
```

**Step 3: Add back-relations to `Mill` and `User` models**

In the `Mill` model, add:
```prisma
  productionRecords ProductionRecord[]
```

In the `User` model, add:
```prisma
  productionRecords ProductionRecord[]
```

**Step 4: Verify schema parses**

```bash
cd "D:/Claude Code"
bunx prisma validate
```

Expected: no errors.

**Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add ProductionRecord model and ProductionSource enum to schema"
```

---

### Task 2: Run the DB migration

**Files:**
- Auto-generated: `prisma/migrations/<timestamp>_add_production_record/migration.sql`

**Step 1: Generate and apply the migration**

```bash
cd "D:/Claude Code"
bunx prisma migrate dev --name add_production_record
```

Expected output: migration file created, applied to Supabase dev DB, Prisma client regenerated.

**Step 2: Verify the table exists**

```bash
bunx prisma studio
```

Or check via Supabase dashboard — `production_records` table should be visible with all columns.

**Step 3: Commit**

```bash
git add prisma/migrations/
git commit -m "feat: apply migration for production_records table"
```

---

### Task 3: Create `src/lib/production.ts` data access layer

**Files:**
- Create: `src/lib/production.ts`

**Step 1: Write the file**

```typescript
import { prisma } from './prisma'
import { Prisma, ProductionSource } from '@prisma/client'

export async function getProductionRecords(millId: string) {
    return prisma.productionRecord.findMany({
        where: { millId },
        orderBy: { productionDate: 'desc' },
    })
}

export async function getProductionRecord(id: string) {
    return prisma.productionRecord.findUnique({ where: { id } })
}

export async function createProductionRecord(data: {
    millId: string
    recordedById: string
    productionDate: Date
    ffbReceivedMt: Prisma.Decimal | number
    cpoProducedMt: Prisma.Decimal | number
    pkoProducedMt: Prisma.Decimal | number
    notes?: string
}) {
    return prisma.productionRecord.create({
        data: {
            ...data,
            ffbReceivedMt: new Prisma.Decimal(data.ffbReceivedMt),
            cpoProducedMt: new Prisma.Decimal(data.cpoProducedMt),
            pkoProducedMt: new Prisma.Decimal(data.pkoProducedMt),
            source: ProductionSource.MANUAL,
        },
    })
}

// Derived metrics helpers (computed, not stored)
export function calcOer(ffb: Prisma.Decimal, cpo: Prisma.Decimal): number {
    if (ffb.isZero()) return 0
    return cpo.div(ffb).mul(100).toDecimalPlaces(2).toNumber()
}

export function calcKer(ffb: Prisma.Decimal, pko: Prisma.Decimal): number {
    if (ffb.isZero()) return 0
    return pko.div(ffb).mul(100).toDecimalPlaces(2).toNumber()
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd "D:/Claude Code"
bunx tsc --noEmit
```

Expected: no errors related to the new file.

**Step 3: Commit**

```bash
git add src/lib/production.ts
git commit -m "feat: add production data access layer"
```

---

### Task 4: Add API routes for production records

**Files:**
- Create: `src/app/api/production/route.ts`

**Step 1: Write the file**

```typescript
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getProductionRecords, createProductionRecord } from '@/lib/production'
import { Prisma } from '@prisma/client'

const MILL_ROLES = [UserRole.MILL_MANAGER, UserRole.MILL_STAFF]

export const GET = withAuth(
    [...MILL_ROLES, UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.AUDITOR],
    async (request: Request, _context: any, user) => {
        const { searchParams } = new URL(request.url)
        const millId = searchParams.get('millId')

        if (!millId) {
            return NextResponse.json(
                { data: null, error: { code: 'VALIDATION_ERROR', message: 'millId is required' }, meta: null },
                { status: 422 },
            )
        }

        const records = await getProductionRecords(millId)
        return NextResponse.json({ data: records, error: null, meta: null })
    },
)

export const POST = withAuth(
    MILL_ROLES,
    async (request: Request, _context: any, user) => {
        if (!user.millId) {
            return NextResponse.json(
                { data: null, error: { code: 'FORBIDDEN', message: 'No mill associated with user' }, meta: null },
                { status: 403 },
            )
        }

        const body = await request.json()
        const { productionDate, ffbReceivedMt, cpoProducedMt, pkoProducedMt, notes } = body

        if (!productionDate || ffbReceivedMt == null || cpoProducedMt == null || pkoProducedMt == null) {
            return NextResponse.json(
                { data: null, error: { code: 'VALIDATION_ERROR', message: 'productionDate, ffbReceivedMt, cpoProducedMt, pkoProducedMt are required' }, meta: null },
                { status: 422 },
            )
        }

        try {
            const record = await createProductionRecord({
                millId: user.millId,
                recordedById: user.id,
                productionDate: new Date(productionDate),
                ffbReceivedMt,
                cpoProducedMt,
                pkoProducedMt,
                notes: notes ?? undefined,
            })
            return NextResponse.json({ data: record, error: null, meta: null }, { status: 201 })
        } catch (err: any) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                return NextResponse.json(
                    { data: null, error: { code: 'CONFLICT', message: 'A production record for this date already exists' }, meta: null },
                    { status: 409 },
                )
            }
            throw err
        }
    },
)
```

**Step 2: Verify TypeScript**

```bash
bunx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/app/api/production/route.ts
git commit -m "feat: add GET and POST API routes for production records"
```

---

### Task 5: Create the `/mill/production` list page

**Files:**
- Create: `src/app/(mill)/mill/production/page.tsx`

**Step 1: Write the file**

```tsx
import { getSessionUser } from '@/lib/auth'
import { getProductionRecords, calcOer, calcKer } from '@/lib/production'
import { redirect } from 'next/navigation'
import { Factory, Plus } from 'lucide-react'
import Link from 'next/link'
import { Prisma } from '@prisma/client'

export default async function MillProductionPage() {
    const user = await getSessionUser()
    if (!user?.millId) redirect('/login')

    const records = await getProductionRecords(user.millId)

    // Summary stats
    const totalFfb = records.reduce(
        (sum, r) => sum.add(r.ffbReceivedMt),
        new Prisma.Decimal(0),
    )
    const avgOer = records.length > 0
        ? records.reduce((sum, r) => sum + calcOer(r.ffbReceivedMt, r.cpoProducedMt), 0) / records.length
        : 0
    const avgKer = records.length > 0
        ? records.reduce((sum, r) => sum + calcKer(r.ffbReceivedMt, r.pkoProducedMt), 0) / records.length
        : 0

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">Production Records</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">Daily FFB intake and CPO/PKO output logs.</p>
                </div>
                <Link
                    href="/mill/production/new"
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                >
                    <Plus size={14} /> New Record
                </Link>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total FFB Received', value: `${Number(totalFfb).toLocaleString(undefined, { maximumFractionDigits: 1 })} MT` },
                    { label: 'Avg OER', value: records.length > 0 ? `${avgOer.toFixed(2)}%` : '—' },
                    { label: 'Avg KER', value: records.length > 0 ? `${avgKer.toFixed(2)}%` : '—' },
                ].map(card => (
                    <div key={card.label} className="bg-white rounded-xl border border-zinc-100 shadow-card px-5 py-4">
                        <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium">{card.label}</p>
                        <p className="text-2xl font-bold text-zinc-900 mt-1">{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-zinc-50 bg-zinc-50/60">
                            {['Date', 'FFB (MT)', 'CPO (MT)', 'PKO (MT)', 'OER', 'KER', 'Notes'].map((h, i) => (
                                <th key={h} className={`px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide ${i >= 1 && i <= 5 ? 'text-right' : 'text-left'}`}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {records.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center">
                                    <Factory size={28} className="mx-auto mb-2 text-zinc-200" />
                                    <p className="text-sm text-zinc-400">No production records yet.</p>
                                </td>
                            </tr>
                        ) : records.map(r => {
                            const oer = calcOer(r.ffbReceivedMt, r.cpoProducedMt)
                            const ker = calcKer(r.ffbReceivedMt, r.pkoProducedMt)
                            return (
                                <tr key={r.id} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-6 py-3.5 text-zinc-400 text-xs whitespace-nowrap">
                                        {new Date(r.productionDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-3.5 text-right text-xs font-medium text-zinc-800 tabular-nums">
                                        {Number(r.ffbReceivedMt).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-3.5 text-right text-xs font-medium text-orange-600 tabular-nums">
                                        {Number(r.cpoProducedMt).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-3.5 text-right text-xs font-medium text-blue-600 tabular-nums">
                                        {Number(r.pkoProducedMt).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-3.5 text-right text-xs text-zinc-500 tabular-nums">{oer.toFixed(2)}%</td>
                                    <td className="px-6 py-3.5 text-right text-xs text-zinc-500 tabular-nums">{ker.toFixed(2)}%</td>
                                    <td className="px-6 py-3.5 text-xs text-zinc-400 max-w-xs truncate">{r.notes ?? '—'}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
```

**Step 2: Verify build**

```bash
cd "D:/Claude Code"
bun run build 2>&1 | tail -20
```

Expected: no build errors for the new page.

**Step 3: Commit**

```bash
git add src/app/(mill)/mill/production/page.tsx
git commit -m "feat: add /mill/production list page with summary stats"
```

---

### Task 6: Create the `/mill/production/new` form page

**Files:**
- Create: `src/app/(mill)/mill/production/new/page.tsx`

**Step 1: Write the file**

This is a client component with a controlled form that POSTs to `/api/production` and redirects on success.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Factory } from 'lucide-react'

export default function NewProductionRecordPage() {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({
        productionDate: new Date().toISOString().split('T')[0],
        ffbReceivedMt: '',
        cpoProducedMt: '',
        pkoProducedMt: '',
        notes: '',
    })

    function set(field: string, value: string) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        const res = await fetch('/api/production', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productionDate: form.productionDate,
                ffbReceivedMt: parseFloat(form.ffbReceivedMt),
                cpoProducedMt: parseFloat(form.cpoProducedMt),
                pkoProducedMt: parseFloat(form.pkoProducedMt),
                notes: form.notes || undefined,
            }),
        })

        if (res.ok) {
            router.push('/mill/production')
        } else {
            const json = await res.json()
            setError(json?.error?.message ?? 'Something went wrong')
            setSubmitting(false)
        }
    }

    const inputClass = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-400'
    const labelClass = 'block text-xs font-medium text-zinc-600 mb-1'

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}>
                    <Factory size={16} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">New Production Record</h1>
                    <p className="text-sm text-zinc-400">Log daily FFB intake and output volumes.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-100 shadow-card p-6 space-y-5">
                <div>
                    <label className={labelClass}>Production Date <span className="text-red-500">*</span></label>
                    <input
                        type="date"
                        required
                        value={form.productionDate}
                        onChange={e => set('productionDate', e.target.value)}
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className={labelClass}>FFB Received (MT) <span className="text-red-500">*</span></label>
                    <input
                        type="number"
                        required
                        min="0"
                        step="0.0001"
                        placeholder="e.g. 250.5"
                        value={form.ffbReceivedMt}
                        onChange={e => set('ffbReceivedMt', e.target.value)}
                        className={inputClass}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>CPO Produced (MT) <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.0001"
                            placeholder="e.g. 52.3"
                            value={form.cpoProducedMt}
                            onChange={e => set('cpoProducedMt', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>PKO Produced (MT) <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.0001"
                            placeholder="e.g. 12.1"
                            value={form.pkoProducedMt}
                            onChange={e => set('pkoProducedMt', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Notes</label>
                    <textarea
                        rows={3}
                        placeholder="Optional notes about this production run…"
                        value={form.notes}
                        onChange={e => set('notes', e.target.value)}
                        className={inputClass + ' resize-none'}
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                        type="button"
                        onClick={() => router.push('/mill/production')}
                        className="text-sm text-zinc-500 hover:text-zinc-800 px-4 py-2 rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="text-sm font-semibold px-5 py-2 rounded-lg text-white hover:opacity-90 transition disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                    >
                        {submitting ? 'Saving…' : 'Save Record'}
                    </button>
                </div>
            </form>
        </div>
    )
}
```

**Step 2: Verify build**

```bash
bun run build 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add src/app/(mill)/mill/production/new/page.tsx
git commit -m "feat: add /mill/production/new form page"
```

---

### Task 7: Add "Production" nav item to the sidebar

**Files:**
- Modify: `src/components/AppSidebar.tsx`

**Step 1: Import `Factory` icon**

Find the existing icon import line:
```tsx
import {
    LayoutDashboard, Building2, ClipboardList, Users, FileText, Settings,
    ClipboardCheck, Package, Ship, BarChart3, LogOut,
} from 'lucide-react'
```

Add `Factory` to the import:
```tsx
import {
    LayoutDashboard, Building2, ClipboardList, Users, FileText, Settings,
    ClipboardCheck, Package, Ship, BarChart3, LogOut, Factory,
} from 'lucide-react'
```

**Step 2: Add the nav item to the `mill` section**

Find the `mill` items array:
```tsx
items: [
    { href: '/mill/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/mill/checklists', label: 'Compliance', icon: ClipboardCheck },
    { href: '/mill/imports', label: 'Imports', icon: Package },
    { href: '/mill/shipments', label: 'Trade Ledger', icon: Ship },
    { href: '/mill/settings', label: 'Settings', icon: Settings },
],
```

Replace with:
```tsx
items: [
    { href: '/mill/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/mill/checklists', label: 'Compliance', icon: ClipboardCheck },
    { href: '/mill/production', label: 'Production', icon: Factory },
    { href: '/mill/shipments', label: 'Trade Ledger', icon: Ship },
    { href: '/mill/imports', label: 'Imports', icon: Package },
    { href: '/mill/settings', label: 'Settings', icon: Settings },
],
```

**Step 3: Verify build**

```bash
bun run build 2>&1 | tail -20
```

**Step 4: Verify dev server visually**

```bash
bun run dev
```

Navigate to `http://localhost:3000/mill/production` — confirm:
- "Production" appears in the sidebar between Compliance and Trade Ledger
- List page loads with 3 summary cards and an empty-state table
- "New Record" button navigates to `/mill/production/new`
- Form submits successfully, redirects back to list, record appears

**Step 5: Commit**

```bash
git add src/components/AppSidebar.tsx
git commit -m "feat: add Production nav item to mill sidebar"
```

---

### Task 8: Update the Notion ticket status to Done

Update ticket #3 "Change Imports to Production for Mills" in the Notion ticketing database from **Backlog** → **Done**.

(Use the `notion-update-page` tool with the page ID `3227ee21-af0e-80e1-abec-c3f4f6e93c0a`.)
