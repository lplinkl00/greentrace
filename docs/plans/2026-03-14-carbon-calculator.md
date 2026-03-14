# Carbon Calculator (Climatiq) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Embed a Climatiq-powered CO₂e calculator as an inline collapsible panel in the checklist item data entry form, writing results directly into `valueConverted`.

**Architecture:** A static curated activity config maps mill-relevant activities to Climatiq activity IDs. A new server-side API route proxies requests to Climatiq (keeping the API key server-only). A client component renders the inline panel and writes the CO₂e result into the parent form's state.

**Tech Stack:** Next.js 14 App Router, TypeScript, Climatiq REST API, Tailwind CSS, `lucide-react`

---

## Prerequisites

- `CLIMATIQ_API_KEY` must be set in `.env.local`. Get a free key at https://www.climatiq.io/
- Climatiq base URL: `https://api.climatiq.io/data/v1/estimate`
- The checklist item page (`src/app/(mill)/mill/checklists/[checklistId]/items/[itemId]/page.tsx`) is currently a **stub** — the carbon calculator will be embedded in the "Data Entry" card. The rest of the page is out of scope for this ticket.

---

### Task 1: Add Climatiq API key to env files

**Files:**
- Modify: `.env.example` (or `.env.local.example` if it exists)
- Modify: `.env.local` (your local file — add the real key here)

**Step 1: Add to `.env.example`**

Open `.env.example` and append:
```
# Climatiq Carbon Calculator API
CLIMATIQ_API_KEY=
```

**Step 2: Add real key to `.env.local`**

```
CLIMATIQ_API_KEY=your_real_key_here
```

**Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: add CLIMATIQ_API_KEY to env example"
```

---

### Task 2: Create curated activity config

**Files:**
- Create: `src/lib/climatiq-activities.ts`

**Step 1: Create the file**

```typescript
// src/lib/climatiq-activities.ts

export type ParameterType = 'volume' | 'energy' | 'weight' | 'weight_distance'

export interface ClimatiqActivity {
  id: string          // Climatiq activity_id
  label: string       // Display name in dropdown
  parameterType: ParameterType
  defaultUnit: string // Pre-filled unit
  units: string[]     // Available units in dropdown
}

export const CLIMATIQ_ACTIVITIES: ClimatiqActivity[] = [
  {
    id: 'fuel_combustion-type_diesel-fuel_use',
    label: 'Diesel combustion',
    parameterType: 'volume',
    defaultUnit: 'L',
    units: ['L', 'm3'],
  },
  {
    id: 'electricity-supply_grid-source_residual_mix',
    label: 'Grid electricity',
    parameterType: 'energy',
    defaultUnit: 'kWh',
    units: ['kWh', 'MWh'],
  },
  {
    id: 'fuel_combustion-type_natural_gas-fuel_use',
    label: 'Natural gas combustion',
    parameterType: 'volume',
    defaultUnit: 'm3',
    units: ['m3'],
  },
  {
    id: 'fuel_combustion-type_petrol-fuel_use',
    label: 'Petrol / gasoline',
    parameterType: 'volume',
    defaultUnit: 'L',
    units: ['L'],
  },
  {
    id: 'fuel_combustion-type_biomass-fuel_use',
    label: 'Palm kernel shell (biomass)',
    parameterType: 'weight',
    defaultUnit: 't',
    units: ['t', 'kg'],
  },
  {
    id: 'chemical_production-type_nitrogen_fertiliser',
    label: 'Nitrogen fertilizer',
    parameterType: 'weight',
    defaultUnit: 'kg',
    units: ['kg', 't'],
  },
  {
    id: 'freight_vehicle-vehicle_type_hgv-fuel_source_diesel-vehicle_weight_gt_17t-loading_half_load',
    label: 'Road freight (CPO transport)',
    parameterType: 'weight_distance',
    defaultUnit: 'tonne_km',
    units: ['tonne_km'],
  },
  {
    id: 'wastewater_treatment-type_anaerobic_lagoon',
    label: 'Wastewater treatment (POME)',
    parameterType: 'volume',
    defaultUnit: 'm3',
    units: ['m3'],
  },
  {
    id: 'refrigerants-type_r410a',
    label: 'Refrigerant leakage (R-410A)',
    parameterType: 'weight',
    defaultUnit: 'kg',
    units: ['kg'],
  },
  {
    id: 'fuel_combustion-type_coal-fuel_use',
    label: 'Coal combustion',
    parameterType: 'weight',
    defaultUnit: 't',
    units: ['t', 'kg'],
  },
]
```

**Step 2: Verify it compiles**

```bash
cd "D:\Claude Code" && bun run build 2>&1 | tail -5
```

Expected: no TypeScript errors related to this file.

**Step 3: Commit**

```bash
git add src/lib/climatiq-activities.ts
git commit -m "feat: add curated Climatiq activity config"
```

---

### Task 3: Create the server-side API route

**Files:**
- Create: `src/app/api/carbon-calculator/estimate/route.ts`

This route proxies to Climatiq so the API key never touches the client.

**Step 1: Create the route**

```typescript
// src/app/api/carbon-calculator/estimate/route.ts
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { CLIMATIQ_ACTIVITIES } from '@/lib/climatiq-activities'

const ALLOWED_ROLES = [
  UserRole.MILL_MANAGER,
  UserRole.MILL_STAFF,
  UserRole.SUPER_ADMIN,
  UserRole.AGGREGATOR_MANAGER,
]

export const POST = withAuth(
  ALLOWED_ROLES,
  async (request: Request) => {
    const apiKey = process.env.CLIMATIQ_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { data: null, error: { code: 'CONFIGURATION_ERROR', message: 'Climatiq API key not configured' }, meta: null },
        { status: 500 },
      )
    }

    const body = await request.json()
    const { activityId, quantity, unit } = body

    if (!activityId || quantity == null || !unit) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'activityId, quantity, and unit are required' }, meta: null },
        { status: 422 },
      )
    }

    // Validate activityId is from our curated list
    const activity = CLIMATIQ_ACTIVITIES.find(a => a.id === activityId)
    if (!activity) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Unknown activity ID' }, meta: null },
        { status: 422 },
      )
    }

    // Build Climatiq request body based on parameter type
    let parameters: Record<string, unknown>
    switch (activity.parameterType) {
      case 'volume':
        parameters = { volume: quantity, volume_unit: unit }
        break
      case 'energy':
        parameters = { energy: quantity, energy_unit: unit }
        break
      case 'weight':
        parameters = { weight: quantity, weight_unit: unit }
        break
      case 'weight_distance':
        // tonne_km: treat quantity as tonne_km directly
        parameters = { weight: quantity, weight_unit: 't', distance: 1, distance_unit: 'km' }
        break
    }

    const climatiqRes = await fetch('https://api.climatiq.io/data/v1/estimate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emission_factor: { activity_id: activityId, data_version: '^21' },
        parameters,
      }),
    })

    if (!climatiqRes.ok) {
      const errorText = await climatiqRes.text()
      console.error('Climatiq API error:', climatiqRes.status, errorText)
      return NextResponse.json(
        { data: null, error: { code: 'CLIMATIQ_ERROR', message: 'Climatiq API request failed' }, meta: null },
        { status: 502 },
      )
    }

    const climatiqData = await climatiqRes.json()

    return NextResponse.json({
      data: {
        co2e: climatiqData.co2e as number,
        co2e_unit: climatiqData.co2e_unit as string,
        activity_label: activity.label,
      },
      error: null,
      meta: null,
    })
  },
)
```

**Step 2: Verify build**

```bash
cd "D:\Claude Code" && bun run build 2>&1 | tail -10
```

Expected: builds without errors.

**Step 3: Quick manual test** (optional — requires real API key)

```bash
curl -X POST http://localhost:3000/api/carbon-calculator/estimate \
  -H "Content-Type: application/json" \
  -H "Cookie: <your session cookie>" \
  -d '{"activityId":"fuel_combustion-type_diesel-fuel_use","quantity":100,"unit":"L"}'
```

Expected: `{"data":{"co2e":0.264,"co2e_unit":"kg","activity_label":"Diesel combustion"},...}`

**Step 4: Commit**

```bash
git add src/app/api/carbon-calculator/estimate/route.ts
git commit -m "feat: add carbon calculator API route (Climatiq proxy)"
```

---

### Task 4: Create the CarbonCalculator client component

**Files:**
- Create: `src/components/carbon-calculator.tsx`

This is a `'use client'` component. It takes an `onValueSet` callback that the parent uses to write `valueConverted`.

**Step 1: Create the component**

```tsx
// src/components/carbon-calculator.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Zap, Loader2 } from 'lucide-react'
import { CLIMATIQ_ACTIVITIES } from '@/lib/climatiq-activities'

interface Props {
  onValueSet: (co2e: number, unit: string) => void
}

export function CarbonCalculator({ onValueSet }: Props) {
  const [open, setOpen] = useState(false)
  const [activityId, setActivityId] = useState(CLIMATIQ_ACTIVITIES[0].id)
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState(CLIMATIQ_ACTIVITIES[0].defaultUnit)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ co2e: number; co2e_unit: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  const selectedActivity = CLIMATIQ_ACTIVITIES.find(a => a.id === activityId)!

  function handleActivityChange(id: string) {
    const act = CLIMATIQ_ACTIVITIES.find(a => a.id === id)!
    setActivityId(id)
    setUnit(act.defaultUnit)
    setResult(null)
    setError(null)
    setApplied(false)
  }

  async function handleCalculate() {
    if (!quantity || isNaN(Number(quantity))) {
      setError('Enter a valid quantity')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setApplied(false)

    try {
      const res = await fetch('/api/carbon-calculator/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, quantity: Number(quantity), unit }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error?.message ?? 'Climatiq API request failed')
      } else {
        setResult(json.data)
      }
    } catch {
      setError('Network error — could not reach Climatiq')
    } finally {
      setLoading(false)
    }
  }

  function handleUseValue() {
    if (!result) return
    onValueSet(result.co2e, result.co2e_unit)
    setApplied(true)
    setOpen(false)
  }

  return (
    <div className="rounded-lg border border-green-100 bg-green-50/40">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-50 transition rounded-lg"
      >
        <span className="flex items-center gap-2">
          <Zap size={14} />
          Calculate with Climatiq
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Applied badge (shown when collapsed after use) */}
      {!open && applied && result && (
        <div className="px-4 pb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            CO₂e set via Climatiq: {result.co2e} {result.co2e_unit}
          </span>
        </div>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="border-t border-green-100 px-4 py-4 space-y-3">
          {/* Activity selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Activity</label>
            <select
              value={activityId}
              onChange={e => handleActivityChange(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {CLIMATIQ_ACTIVITIES.map(a => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Quantity + unit */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Quantity</label>
              <input
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={e => { setQuantity(e.target.value); setResult(null); setError(null) }}
                placeholder="e.g. 100"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Unit</label>
              <select
                value={unit}
                onChange={e => { setUnit(e.target.value); setResult(null) }}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                {selectedActivity.units.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          {/* Result */}
          {result && (
            <div className="flex items-center justify-between rounded-md bg-white border border-green-200 px-3 py-2">
              <span className="text-sm font-semibold text-zinc-800">
                {result.co2e} {result.co2e_unit}
              </span>
              <button
                type="button"
                onClick={handleUseValue}
                className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md transition"
              >
                Use this value →
              </button>
            </div>
          )}

          {/* Calculate button */}
          <button
            type="button"
            onClick={handleCalculate}
            disabled={loading || !quantity}
            className="flex items-center gap-2 rounded-md bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-40 transition"
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify build**

```bash
cd "D:\Claude Code" && bun run build 2>&1 | tail -10
```

Expected: builds without errors.

**Step 3: Commit**

```bash
git add src/components/carbon-calculator.tsx
git commit -m "feat: add CarbonCalculator client component"
```

---

### Task 5: Embed CarbonCalculator in the checklist item page

**Files:**
- Modify: `src/app/(mill)/mill/checklists/[checklistId]/items/[itemId]/page.tsx`

The page is a stub. We'll convert the Data Entry card into a client component wrapper that includes the calculator. Since the page needs `useState` (to hold the applied CO₂e value), convert the inner data entry section to a client component.

**Step 1: Create a thin client wrapper for the data entry card**

Create a new file:

```tsx
// src/components/checklist-item-data-entry.tsx
'use client'

import { useState } from 'react'
import { CarbonCalculator } from '@/components/carbon-calculator'

export function ChecklistItemDataEntry() {
  const [appliedCo2e, setAppliedCo2e] = useState<{ value: number; unit: string } | null>(null)

  function handleCo2eSet(co2e: number, unit: string) {
    setAppliedCo2e({ value: co2e, unit })
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="font-semibold text-gray-800 mb-4">Data Entry</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Entry Type</label>
          <select className="mt-1 block w-full border rounded-md p-2 text-sm">
            <option>FORM01 — Absolute Quantity</option>
            <option>FORM02 — Rate</option>
            <option>Document Only</option>
            <option>Text Response</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Value</label>
            <input
              type="number"
              step="0.01"
              className="mt-1 block w-full border rounded-md p-2 text-sm"
              placeholder="Enter value"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Unit</label>
            <input
              type="text"
              className="mt-1 block w-full border rounded-md p-2 text-sm"
              placeholder="e.g. tCO2e, MWh"
            />
          </div>
        </div>

        {/* CO₂e (Climatiq) — shown when calculator has set a value */}
        {appliedCo2e && (
          <div>
            <label className="block text-sm font-medium text-gray-700">CO₂e (from Climatiq)</label>
            <input
              type="text"
              readOnly
              value={`${appliedCo2e.value} ${appliedCo2e.unit}`}
              className="mt-1 block w-full border border-green-300 bg-green-50 rounded-md p-2 text-sm text-green-800 font-medium"
            />
          </div>
        )}

        {/* Emission factor field — hidden when Climatiq value applied */}
        {!appliedCo2e && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Emission Factor</label>
            <select className="mt-1 block w-full border rounded-md p-2 text-sm">
              <option value="">Select emission factor (optional)</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Reporting Month</label>
          <input type="month" className="mt-1 block w-full border rounded-md p-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea className="mt-1 block w-full border rounded-md p-2 text-sm" rows={3} />
        </div>

        {/* Carbon Calculator */}
        <CarbonCalculator onValueSet={handleCo2eSet} />

        <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700">
          Save Entry
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Update the checklist item page to use the new component**

Replace the content of `src/app/(mill)/mill/checklists/[checklistId]/items/[itemId]/page.tsx`:

```tsx
import { ChecklistItemDataEntry } from '@/components/checklist-item-data-entry'

export default function ChecklistItemDetailPage({
    params,
}: {
    params: { checklistId: string; itemId: string }
}) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <p className="text-sm text-gray-500">Checklist {params.checklistId}</p>
                <h1 className="text-2xl font-bold text-gray-900">Item Detail</h1>
                <p className="text-sm text-gray-400 mt-1">Item ID: {params.itemId}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Data Entry Form */}
                <div className="lg:col-span-2 space-y-4">
                    <ChecklistItemDataEntry />

                    {/* Document Upload */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="font-semibold text-gray-800 mb-4">Documents</h2>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <p className="text-sm text-gray-500">Drag & drop files here, or click to browse</p>
                            <p className="text-xs text-gray-400 mt-1">PDF, JPEG, PNG, XLSX, CSV, DOCX — max 25 MB</p>
                            <input type="file" className="mt-2" />
                        </div>
                        <div className="mt-4 text-sm text-gray-500">No documents uploaded yet.</div>
                    </div>
                </div>

                {/* Comment Thread + Status */}
                <div className="space-y-4">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="font-semibold text-gray-800 mb-4">Status</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Status</span>
                                <span className="font-medium">Not Started</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Assignee</span>
                                <span className="font-medium">Unassigned</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="font-semibold text-gray-800 mb-4">Comments</h2>
                        <div className="space-y-3 text-sm text-gray-500">
                            <p>No comments yet.</p>
                        </div>
                        <div className="mt-4 border-t pt-4">
                            <textarea className="w-full border rounded-md p-2 text-sm" rows={2} placeholder="Add a comment…" />
                            <button className="mt-2 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700">
                                Post
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
```

**Step 3: Verify build**

```bash
cd "D:\Claude Code" && bun run build 2>&1 | tail -15
```

Expected: clean build, no errors.

**Step 4: Manual smoke test**

1. Run `bun dev`
2. Log in as `ps.staff@greentrace.local` / `staff123`
3. Navigate to `/mill/checklists/<any-id>/items/<any-id>`
4. Confirm the "Calculate with Climatiq" toggle appears in the Data Entry card
5. Select "Diesel combustion", enter `100`, unit `L`, click Calculate
6. Confirm a CO₂e result appears
7. Click "Use this value →"
8. Confirm the CO₂e field appears in the form, emission factor field is hidden, panel collapses with green badge

**Step 5: Commit**

```bash
git add src/components/checklist-item-data-entry.tsx src/app/\(mill\)/mill/checklists/\[checklistId\]/items/\[itemId\]/page.tsx
git commit -m "feat: embed CarbonCalculator in checklist item data entry"
```

---

### Task 6: Update Notion ticket status

Update ticket #7 "Add a Carbon Calculator using Climatiq API" from **Backlog** → **In Progress** (or **Done** once all tasks complete).

---

## Done Criteria

- [ ] `CLIMATIQ_API_KEY` documented in `.env.example`
- [ ] Curated activity config at `src/lib/climatiq-activities.ts`
- [ ] API route at `/api/carbon-calculator/estimate` returns `{ co2e, co2e_unit }`
- [ ] `CarbonCalculator` component renders correctly, calls API, populates result
- [ ] Panel collapses after "Use this value", shows green badge
- [ ] Emission factor field hidden when Climatiq value applied
- [ ] Build passes cleanly
