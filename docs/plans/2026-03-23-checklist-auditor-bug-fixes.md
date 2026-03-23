# Checklist & Auditor Bug Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three bugs found during checklist/auditor workflow review: a phantom status badge, missing UNDER_AUDIT badge, incorrect DA-2 shipment query scope, and inconsistent audit detail page styling.

**Architecture:** All fixes are isolated — one touches a single React status map, one fixes a Prisma query predicate, and one reskins a single page component. No schema changes, no migrations, no new dependencies.

**Tech Stack:** Next.js 14, TypeScript, Prisma v7, Tailwind CSS

**Tickets:**
- [#BUG] Checklist status badge map has phantom SUBMITTED state and missing UNDER_AUDIT state
- [#BUG] DA-2 validation queries all unallocated company shipments instead of only those in the checklist period
- [#BUG] Audit detail page uses raw Tailwind and does not match app design system

---

## Task 1: Fix checklist status badge map (phantom SUBMITTED + missing UNDER_AUDIT)

**Priority:** Medium
**File:** `src/app/(company)/company/checklists/page.tsx`

The `STATUS` map at line 16 has a `SUBMITTED` key that does not correspond to any real workflow state (the API transitions `DRAFT → UNDER_REVIEW`, never to `SUBMITTED`). The actual state `UNDER_AUDIT` (set when the aggregator sends the checklist to an external auditor) has no entry, so those rows render with no badge.

**Step 1: Open the file and locate the STATUS map**

File: `src/app/(company)/company/checklists/page.tsx`, lines 16–22.

Current code:
```ts
const STATUS: Record<string, { bg: string; color: string }> = {
    DRAFT: { bg: '#f4f4f5', color: '#71717a' },
    SUBMITTED: { bg: '#eff6ff', color: '#2563eb' },
    UNDER_REVIEW: { bg: '#fef9c3', color: '#92400e' },
    CERTIFIED: { bg: '#f0fdf4', color: '#15803d' },
    RETURNED: { bg: '#fef2f2', color: '#dc2626' },
}
```

**Step 2: Replace the STATUS map**

Replace the entire `STATUS` constant with:
```ts
const STATUS: Record<string, { bg: string; color: string }> = {
    DRAFT:        { bg: '#f4f4f5', color: '#71717a' },
    UNDER_REVIEW: { bg: '#fef9c3', color: '#92400e' },
    UNDER_AUDIT:  { bg: '#fff7ed', color: '#c2410c' },
    CERTIFIED:    { bg: '#f0fdf4', color: '#15803d' },
    RETURNED:     { bg: '#fef2f2', color: '#dc2626' },
}
```

**Step 3: Verify in browser**

1. Log in as `ps.manager@greentrace.local` / `manager123`
2. Navigate to `/company/checklists`
3. Confirm PS 2023 shows a green `CERTIFIED` badge
4. Confirm PS 2024 shows the amber `UNDER_REVIEW` badge (not broken)
5. There is no `SUBMITTED` or unstyled row

**Step 4: Commit**
```bash
git add src/app/\(company\)/company/checklists/page.tsx
git commit -m "fix: remove phantom SUBMITTED badge and add UNDER_AUDIT to checklist status map"
```

---

## Task 2: Fix DA-2 validation — scope shipment query to checklist period

**Priority:** High
**File:** `src/lib/checklist-workflow.ts`

In `validateChecklistSubmission()`, the Prisma query for `company.shipments` only filters by `isccAllocationPct: null` at the database level. The date-range filter (`checklist.periodStart` / `checklist.periodEnd`) is applied in JavaScript *after* the fact. This means:

- The DB fetches every ever-unallocated shipment for the company
- A JavaScript filter then narrows them — but this is wasteful and fragile (timezone edges)

**Step 1: Locate the query**

`src/lib/checklist-workflow.ts`, lines 13–34. The relevant part:
```ts
company: {
    include: {
        shipments: {
            where: {
                isccAllocationPct: null, // DA-2 rule
            }
        }
    }
}
```

And the JS filter at lines 57–62:
```ts
const unallocatedShipments = checklist.company.shipments.filter(shipment =>
    shipment.shipmentDate >= checklist.periodStart && shipment.shipmentDate <= checklist.periodEnd
)
```

**Step 2: Move the date filter into the Prisma query**

Replace the `shipments` include block (lines 23–28):
```ts
shipments: {
    where: {
        isccAllocationPct: null, // DA-2 rule
    }
}
```

With:
```ts
shipments: {
    where: {
        isccAllocationPct: null,
        shipmentDate: {
            gte: checklist.periodStart,
            lte: checklist.periodEnd,
        },
    }
}
```

**Note:** `checklist` is not yet in scope at query time — the `include` is nested inside the `findUnique` for `checklist` itself. We need to restructure slightly. The cleanest approach: add the date fields to the `include` dynamically by passing them as variables. But since Prisma requires static `include` shape, the real fix is to remove the redundant JS filter and rely fully on the DB predicate.

The full corrected `prisma.checklist.findUnique` call becomes:

```ts
const checklist = await prisma.checklist.findUnique({
    where: { id },
    include: {
        items: {
            include: {
                dataEntries: true
            }
        },
        massBalanceEntries: true,
        company: true,  // fetch company without shipments here
    }
})

if (!checklist) throw new Error('Checklist not found')

// Fetch unallocated shipments scoped to this period at DB level
const unallocatedShipments = await prisma.shipment.findMany({
    where: {
        companyId: checklist.companyId,
        isccAllocationPct: null,
        shipmentDate: {
            gte: checklist.periodStart,
            lte: checklist.periodEnd,
        },
    },
    select: { id: true },
})
```

Then remove the old JS `.filter()` block (lines 57–62) and use `unallocatedShipments.length` directly in the error check:

```ts
// DA-2 rule
if (unallocatedShipments.length > 0) {
    errors.push(`DA-2 Flag: ${unallocatedShipments.length} shipments strictly during this period require double-accounting allocation confirmation.`)
}
```

**Step 3: Remove the now-unused company shipments include**

After the refactor, the `company` include in the original query no longer needs the nested `shipments` sub-include. Verify the `company` key in the include is simplified to just `company: true` (only used for `organisationId` in `submitChecklist`, not in `validateChecklistSubmission`). Actually `validateChecklistSubmission` doesn't use `company` at all after this fix — but `company` is used by `checklist.company.organisationId` in `submitChecklist`. Since `validateChecklistSubmission` is a separate export that only returns `{ isValid, errors }`, it's safe to drop `company: true` from the include entirely in this function. Do so to keep the query lean.

Final shape of the `findUnique` include in `validateChecklistSubmission`:
```ts
include: {
    items: {
        include: { dataEntries: true }
    },
    massBalanceEntries: true,
}
```

**Step 4: Verify manually**

1. Log in as `admin@greentrace.local` / `admin123`
2. Navigate to a company's checklist in DRAFT state
3. Confirm the validation panel correctly shows/hides DA-2 errors
4. Check that the badge shows errors only for unallocated shipments *within* the checklist year, not all-time

**Step 5: Commit**
```bash
git add src/lib/checklist-workflow.ts
git commit -m "fix: scope DA-2 shipment query to checklist period at DB level"
```

---

## Task 3: Restyle audit detail page to match design system

**Priority:** Low
**File:** `src/app/(auditor)/auditor/audits/[auditId]/page.tsx`

The audit detail page uses raw Tailwind (`bg-white shadow rounded-lg`, `bg-blue-600`, `bg-green-600`) while the rest of the app uses:
- Cards: `bg-white rounded-xl border border-zinc-100 shadow-card`
- Buttons: sunset gradient (`linear-gradient(135deg, #f97316 0%, #ef4444 100%)`) or zinc dark
- Typography: `text-zinc-900` headings, `text-zinc-500` body, `text-sm`
- Status badges: inline `style={{ backgroundColor, color }}` with pill shape

**Step 1: Update the header section**

Current:
```tsx
<h1 className="text-2xl font-bold text-gray-900">
    Audit: {audit.company?.name}
</h1>
<p className="text-sm text-gray-500">...</p>
```

Replace `text-gray-900` → `text-zinc-900`, `text-gray-500` → `text-zinc-500`.

**Step 2: Update status badge**

Current:
```tsx
<span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[audit.status] ?? 'bg-gray-100'}`}>
```

Replace with inline style approach matching the rest of the app:
```tsx
<span
    className="text-xs font-semibold px-2.5 py-1 rounded-full"
    style={STATUS_STYLES[audit.status] ?? { bg: '#f4f4f5', color: '#71717a' }}
>
```

And replace the `STATUS_COLORS` Tailwind map with a `STATUS_STYLES` object:
```ts
const STATUS_STYLES: Record<string, { backgroundColor: string; color: string }> = {
    SCHEDULED:       { backgroundColor: '#eff6ff', color: '#2563eb' },
    IN_PROGRESS:     { backgroundColor: '#fef9c3', color: '#92400e' },
    FINDINGS_REVIEW: { backgroundColor: '#faf5ff', color: '#7e22ce' },
    PUBLISHED:       { backgroundColor: '#f0fdf4', color: '#15803d' },
}
```

**Step 3: Update action buttons**

Replace `bg-blue-600 ... hover:bg-blue-700` Start/Advance button with sunset gradient:
```tsx
<button
    onClick={handleAdvanceStatus}
    disabled={statusUpdating}
    className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition disabled:opacity-50"
    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
>
    {statusUpdating ? 'Updating…' : audit.status === 'SCHEDULED' ? 'Start Audit' : 'Move to Review'}
</button>
```

Replace `bg-green-600 ... hover:bg-green-700` Publish button with green solid (publishing is a distinct action):
```tsx
<button
    onClick={handlePublish}
    disabled={publishing}
    className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition disabled:opacity-50"
    style={{ background: '#16a34a' }}
>
    {publishing ? 'Publishing…' : 'Publish Audit'}
</button>
```

**Step 4: Update card containers**

Replace all instances of `className="bg-white shadow rounded-lg ..."` with `className="bg-white rounded-xl border border-zinc-100 shadow-card ..."`.

Specific replacements:
- Progress bar card (line ~148): `bg-white shadow rounded-lg p-4` → `bg-white rounded-xl border border-zinc-100 shadow-card p-4`
- Finding entry table (line ~162): `bg-white shadow rounded-lg overflow-hidden` → `bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden`
- Table header bar: `bg-gray-50` → `bg-zinc-50/60`
- `text-gray-800` headings → `text-zinc-800`, `text-gray-600` → `text-zinc-600`, `text-gray-900` → `text-zinc-900`

**Step 5: Update PUBLISHED banner and finding inputs**

Published banner:
```tsx
<div className="px-6 py-3 bg-green-50 border-b border-green-100 text-sm text-green-800">
    ✅ This audit has been published. Findings are now visible to the company.
</div>
```
(Already fine — keep as-is.)

Finding item rows: replace `text-gray-900`, `text-gray-400`, `text-gray-700` with zinc equivalents.

**Step 6: Verify in browser**

1. Log in as `auditor@greentrace.local` / `auditor123`
2. Navigate to `/auditor/audits` and open the PS 2023 audit (PUBLISHED)
3. Confirm the page matches the card/zinc/sunset-gradient design language of other pages
4. Check that the published banner and frozen inputs still display correctly

**Step 7: Commit**
```bash
git add src/app/\(auditor\)/auditor/audits/\[auditId\]/page.tsx
git commit -m "fix: restyle audit detail page to match app design system"
```

---

## Execution Order

| # | Task | Priority | Risk | Time |
|---|------|----------|------|------|
| 1 | DA-2 query scope fix | High | Low | ~10 min |
| 2 | Status badge map fix | Medium | Low | ~5 min |
| 3 | Audit detail restyling | Low | Low | ~20 min |

Start with Task 2 (highest risk-adjusted value, smallest change), then Task 1 (logic fix), then Task 3 (cosmetic).
