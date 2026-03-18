# Notion Ticket Bug Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three open bugs from the Notion ticket board: surface Climatiq API errors properly (#10), add GHG seed data for the CERTIFIED checklist so the aggregator dashboard shows a non-zero total (#15), and add a "New Profile" create flow to the Regulation Profiles page (#16).

**Architecture:** Each fix is isolated. #10 is a one-line route change. #15 adds GHG data entries to the seed file for the PS 2023 CERTIFIED checklist. #16 adds a button to an existing list page and a new form page that POSTs to the already-existing `/api/regulation-profiles` endpoint.

**Tech Stack:** Next.js 14, TypeScript, Prisma v7 + PrismaPg adapter, Supabase (browser client for client-side role checks), Bun.

---

## Bug #10 — Climatiq API error is swallowed

The route returns a generic "Climatiq API request failed" instead of the actual Climatiq error body. This makes debugging impossible — the real problem (expired key, wrong activity ID, rate limit, etc.) is invisible to the user.

**Files:**
- Modify: `src/app/api/carbon-calculator/estimate/route.ts:74-81`

### Task 1: Surface the Climatiq error message

**Step 1: Open and read the file**

Read `src/app/api/carbon-calculator/estimate/route.ts`. Find lines 74-81:

```ts
if (!climatiqRes.ok) {
  const errorText = await climatiqRes.text()
  console.error('Climatiq API error:', climatiqRes.status, errorText)
  return NextResponse.json(
    { data: null, error: { code: 'CLIMATIQ_ERROR', message: 'Climatiq API request failed' }, meta: null },
    { status: 502 },
  )
}
```

**Step 2: Replace with error-surfacing version**

```ts
if (!climatiqRes.ok) {
  const errorBody = await climatiqRes.text()
  console.error('Climatiq API error:', climatiqRes.status, errorBody)
  let climatiqMessage = 'Climatiq API request failed'
  try {
    const parsed = JSON.parse(errorBody)
    if (parsed.error) climatiqMessage = parsed.error
    else if (parsed.message) climatiqMessage = parsed.message
  } catch {
    if (errorBody && errorBody.length < 200) climatiqMessage = errorBody
  }
  return NextResponse.json(
    { data: null, error: { code: 'CLIMATIQ_ERROR', message: climatiqMessage }, meta: null },
    { status: 502 },
  )
}
```

**Step 3: Verify locally**

Run the dev server (`bun run dev`) and open the carbon calculator widget on any data entry form. Enter any values and click Calculate. If the key is valid you get a result. If it's still broken, the UI now shows the actual Climatiq error — use that to debug further (e.g., update the key in `.env.local`).

**Step 4: Commit**

```bash
git add src/app/api/carbon-calculator/estimate/route.ts
git commit -m "fix: surface actual Climatiq error message instead of generic 502"
```

---

## Bug #15 — GHG total shows 0 on aggregator dashboard

`getPortfolioStats()` in `src/lib/dashboard.ts` sums `valueConverted` from `DataEntry` rows where `emissionFactorId IS NOT NULL`, scoped to **CERTIFIED** checklists only. The PS 2023 checklist is the only CERTIFIED checklist in seed data, but it has zero data entries — all entries are on PS 2024 (SUBMITTED).

**Files:**
- Modify: `prisma/seed.ts` — add a Step 10b block after the existing Step 10

### Task 2: Add GHG data entries for the PS 2023 CERTIFIED checklist

**Step 1: Read seed.ts and locate the insertion point**

Read `prisma/seed.ts`. Find the end of the Step 10 block (the last `await prisma.dataEntry.create` for PS 2024 data, followed by `console.log('  ✓ ...')`). Insert the new block immediately after.

**Step 2: Add the Step 10b block**

Insert after Step 10's closing `}`:

```ts
// ═══════════════════════════════════════════════════════════════════════════
// STEP 10b — Data Entries (GHG items for PS 2023 CERTIFIED)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── Step 10b: Data Entries PS 2023 (CERTIFIED) ────────────────────')

const existingDE23 = await prisma.dataEntry.count({ where: { checklistItemId: ps23Items['ENV-01-002'] } })
if (existingDE23 === 0) {
    // Monthly electricity 2023 (Scope 2) — ENV-01-002
    const monthlyMWh23 = [388, 372, 405, 381, 395, 420, 398, 390, 380, 374, 362, 378]
    const elecEntries23 = monthlyMWh23.map((mwh, i) => ({
        checklistItemId: ps23Items['ENV-01-002'],
        enteredById: psStaffUser.id,
        entryType: DataEntryType.FORM01_ABSOLUTE,
        valueRaw: new Prisma.Decimal(mwh),
        unitInput: 'MWh',
        valueConverted: new Prisma.Decimal(mwh * 620),
        unitReference: 'kgCO2e',
        emissionFactorId: 'seed-ef-grid_electricity',
        reportingMonth: new Date(`2023-${String(i + 1).padStart(2, '0')}-01`),
    }))
    await prisma.dataEntry.createMany({ data: elecEntries23 })

    // Annual diesel (Scope 1) — ENV-01-001
    await prisma.dataEntry.create({
        data: {
            checklistItemId: ps23Items['ENV-01-001'],
            enteredById: psStaffUser.id,
            entryType: DataEntryType.FORM01_ABSOLUTE,
            valueRaw: new Prisma.Decimal('81200'),
            unitInput: 'litres',
            valueConverted: new Prisma.Decimal('217616'),
            unitReference: 'kgCO2e',
            emissionFactorId: 'seed-ef-diesel',
            notes: 'Annual diesel consumption 2023.',
        },
    })

    // POME methane (Scope 1) — ENV-01-001
    await prisma.dataEntry.create({
        data: {
            checklistItemId: ps23Items['ENV-01-001'],
            enteredById: psStaffUser.id,
            entryType: DataEntryType.FORM01_ABSOLUTE,
            valueRaw: new Prisma.Decimal('11800'),
            unitInput: 'm3',
            valueConverted: new Prisma.Decimal('295000'),
            unitReference: 'kgCO2e',
            emissionFactorId: 'seed-ef-pome_methane',
            notes: 'POME methane 2023 from open lagoon system.',
        },
    })

    console.log('  ✓ GHG data entries seeded for PS 2023 CERTIFIED checklist')
}
```

**Step 3: Re-run the seed**

```bash
bun run db:seed
```

Expected: output includes `✓ GHG data entries seeded for PS 2023 CERTIFIED checklist`

**Step 4: Verify on the aggregator dashboard**

Open `http://localhost:3000/aggregator/dashboard` logged in as `admin@greentrace.local` / `admin123`. The "Total GHG Emissions" card should now show a non-zero value (≈ 3,388 tCO₂e from 2023 electricity + diesel + POME).

**Step 5: Commit**

```bash
git add prisma/seed.ts
git commit -m "fix: add GHG data entries for PS 2023 CERTIFIED checklist so aggregator dashboard shows non-zero GHG total"
```

---

## Bug #16 — No 'Create' button on Regulation Profiles page

The list page (`src/app/(aggregator)/aggregator/regulation-profiles/page.tsx`) renders only a heading with no create action. The POST endpoint at `/api/regulation-profiles` already exists and is restricted to `SUPER_ADMIN`. We need:
1. A "New Profile" button on the list page — visible only when role is `SUPER_ADMIN`
2. A new form page at `/aggregator/regulation-profiles/new`

**Files:**
- Modify: `src/app/(aggregator)/aggregator/regulation-profiles/page.tsx`
- Create: `src/app/(aggregator)/aggregator/regulation-profiles/new/page.tsx`

### Task 3: Add "New Profile" button to the list page

The page is a `'use client'` component. Use the Supabase browser client from `src/lib/supabase.ts` to read `user.user_metadata.role` on mount, and conditionally render the button.

**Step 1: Read the file**

Read `src/app/(aggregator)/aggregator/regulation-profiles/page.tsx`.

**Step 2: Add import for supabase**

Add after the existing imports:

```ts
import { supabase } from '@/lib/supabase'
```

**Step 3: Add userRole state and effect**

Inside `RegulationProfilesPage`, after the existing `useState` declarations, add:

```ts
const [userRole, setUserRole] = useState<string | null>(null)

useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
        setUserRole(data.user?.user_metadata?.role ?? null)
    })
}, [])
```

**Step 4: Add the button to the header**

Replace:
```tsx
<div className="flex items-center justify-between">
    <h1 className="text-2xl font-bold text-gray-900">Regulation Profiles</h1>
</div>
```

With:
```tsx
<div className="flex items-center justify-between">
    <h1 className="text-2xl font-bold text-gray-900">Regulation Profiles</h1>
    {userRole === 'SUPER_ADMIN' && (
        <a
            href="/aggregator/regulation-profiles/new"
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition"
        >
            + New Profile
        </a>
    )}
</div>
```

**Step 5: Verify role gating**

- Log in as `admin@greentrace.local` (SUPER_ADMIN) → button visible
- Log in as `manager@greentrace.local` (AGGREGATOR_MANAGER) → button hidden

### Task 4: Create the new profile form page

**Step 1: Create the file**

Create `src/app/(aggregator)/aggregator/regulation-profiles/new/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const REGULATION_OPTIONS = [
    { value: 'ISCC_EU', label: 'ISCC EU' },
    { value: 'ISCC_PLUS', label: 'ISCC PLUS' },
    { value: 'RSPO_PC', label: 'RSPO PC' },
    { value: 'RSPO_SCCS', label: 'RSPO SCCS' },
]

export default function NewRegulationProfilePage() {
    const router = useRouter()
    const [regulation, setRegulation] = useState('ISCC_EU')
    const [version, setVersion] = useState('')
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        const res = await fetch('/api/regulation-profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ regulation, version, name, description }),
        })
        const json = await res.json()

        if (!res.ok || json.error) {
            setError(json.error?.message ?? 'Failed to create profile')
            setSubmitting(false)
            return
        }

        router.push('/aggregator/regulation-profiles')
    }

    return (
        <div className="max-w-lg space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">New Regulation Profile</h1>
                <a href="/aggregator/regulation-profiles" className="text-sm text-gray-500 hover:underline">
                    ← Back
                </a>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
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
                            type="text"
                            required
                            placeholder="e.g. 3.0"
                            value={version}
                            onChange={e => setVersion(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. ISCC EU 3.0"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition"
                        >
                            {submitting ? 'Creating…' : 'Create Profile'}
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
        </div>
    )
}
```

**Step 2: Test the full create flow**

1. Log in as `admin@greentrace.local`
2. Navigate to `/aggregator/regulation-profiles`
3. Click "New Profile"
4. Fill in: Regulation = ISCC EU, Version = 3.0, Name = "ISCC EU 3.0 Test"
5. Click "Create Profile" — should redirect to list and show the new profile

**Step 3: Test 403 guard**

Log in as `manager@greentrace.local` and manually navigate to `/aggregator/regulation-profiles/new`. Submit the form — the API returns 403 and the error message appears on the form.

**Step 4: Commit**

```bash
git add src/app/(aggregator)/aggregator/regulation-profiles/page.tsx
git add src/app/(aggregator)/aggregator/regulation-profiles/new/page.tsx
git commit -m "fix: add New Profile button and create form to regulation profiles page"
```

---

## Final check

After all three fixes:

```bash
bun run build
```

Must complete with no errors. Then verify:
1. Aggregator dashboard shows non-zero GHG total
2. Carbon calculator shows meaningful error if key is invalid (or works if valid)
3. SUPER_ADMIN can create a regulation profile via the UI; other roles see no button
