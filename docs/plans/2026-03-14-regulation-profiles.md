# Regulation Profiles Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Seed full regulation profile templates for ISCC EU, ISCC PLUS, RSPO PC, and RSPO SCCS, then wire up the regulation profiles UI and checklist creation dropdown to real data.

**Architecture:** JSON fixture files under `prisma/fixtures/` hold the requirement trees; `prisma/seed.ts` reads and upserts them; two new API routes serve the data; three existing placeholder pages are wired up to those routes.

**Tech Stack:** Next.js 14, Prisma v7 + PrismaPg adapter, Bun, TypeScript, Supabase (Postgres)

> **No test framework is configured in this project.** Verification steps use `curl` / browser checks and `bun run db:seed` output.

---

### Task 1: Research ISCC EU requirement structure

Before writing any fixture, you MUST research the accurate and current ISCC EU standard structure. Do not invent requirement codes, names, or descriptions.

**Step 1: Research the ISCC EU standard**

Use web search to find the current ISCC EU system document (the 2023 or 2024 version). Look for:
- The official pillar/principle groupings
- All requirement categories within each pillar
- Individual requirements with their codes, names, and data types (quantitative vs document-only vs text)
- Which requirements are CRITICAL (block certification if failed) vs NON_CRITICAL

Key sources to check:
- https://www.iscc-system.org/process/iscc-documents/iscc-eu-documents/
- The ISCC EU System Document (ISCC EU 201-1) and Requirements (ISCC EU 202-x)

**Step 2: Create `prisma/fixtures/iscc-eu.json`**

Write the full fixture file based on your research. Use this exact schema:

```json
{
  "regulation": "ISCC_EU",
  "version": "2024-v1",
  "name": "ISCC EU 2024 v1",
  "description": "International Sustainability and Carbon Certification for EU renewable energy and materials.",
  "pillars": [
    {
      "code": "ENV",
      "name": "Environmental",
      "displayOrder": 1,
      "categories": [
        {
          "code": "ENV-01",
          "name": "GHG Emissions",
          "displayOrder": 1,
          "requirements": [
            {
              "code": "ENV-01-001",
              "name": "GHG Emission Calculation",
              "description": "Calculate and report total GHG emissions for the reporting period using the ISCC methodology.",
              "guidanceText": "Use the ISCC GHG calculation tool. Report in tCO2e. Include Scope 1 direct emissions from processing.",
              "dataType": "ABSOLUTE_QUANTITY",
              "criticality": "CRITICAL",
              "ghgScope": "SCOPE1",
              "unit": "tCO2e",
              "requiresForm": true,
              "displayOrder": 1
            }
          ]
        }
      ]
    }
  ]
}
```

Valid values:
- `dataType`: `"ABSOLUTE_QUANTITY"` | `"RATE"` | `"DOCUMENT_ONLY"` | `"TEXT_RESPONSE"`
- `criticality`: `"CRITICAL"` | `"NON_CRITICAL"`
- `ghgScope`: `"SCOPE1"` | `"SCOPE2"` | `"SCOPE3"` | `"NA"` | `null`
- `requiresForm`: `false` for `DOCUMENT_ONLY` items, `true` otherwise

**Step 3: Verify the file is valid JSON**

```bash
cd "D:\Claude Code"
node -e "JSON.parse(require('fs').readFileSync('prisma/fixtures/iscc-eu.json','utf8')); console.log('Valid JSON')"
```

Expected: `Valid JSON`

---

### Task 2: Research and write ISCC PLUS fixture

**Step 1: Research ISCC PLUS**

ISCC PLUS covers non-food/feed biomass and circular materials. Key differences from ISCC EU:
- GHG methodology applies to a wider scope of biomass
- Land criteria include additional biomass types
- Check https://www.iscc-system.org/process/iscc-documents/iscc-plus-documents/

**Step 2: Create `prisma/fixtures/iscc-plus.json`**

Same structure as `iscc-eu.json`. Use `"regulation": "ISCC_PLUS"` and `"version": "2024-v1"`.

**Step 3: Validate**

```bash
node -e "JSON.parse(require('fs').readFileSync('prisma/fixtures/iscc-plus.json','utf8')); console.log('Valid JSON')"
```

---

### Task 3: Research and write RSPO PC fixture

**Step 1: Research RSPO Principles & Criteria 2018**

The RSPO P&C 2018 has 8 principles. Research the full structure:
- https://rspo.org/resources/certification/rspo-principles-criteria-for-the-production-of-sustainable-palm-oil/
- Download the RSPO P&C 2018 document for accurate requirement codes and names

Map the 8 principles into 3 pillars for the fixture:
- **ENV** (Environmental) — Principles covering biodiversity, HCV, GHG, water, waste, fire
- **SOC** (Social) — Principles covering community rights, land rights, workers, smallholders, grievance
- **GOV** (Governance) — Principles covering legal compliance, transparency, best management practices

**Step 2: Create `prisma/fixtures/rspo-pc.json`**

Use `"regulation": "RSPO_PC"` and `"version": "2018-v1"`.

**Step 3: Validate**

```bash
node -e "JSON.parse(require('fs').readFileSync('prisma/fixtures/rspo-pc.json','utf8')); console.log('Valid JSON')"
```

---

### Task 4: Research and write RSPO SCCS fixture

**Step 1: Research RSPO Supply Chain Certification Standard**

RSPO SCCS is simpler — focused on chain of custody and certified volume tracking rather than field-level sustainability criteria.
- Check https://rspo.org/resources/certification/rspo-supply-chain-certification-standard/

Use 2 pillars:
- **SCI** (Supply Chain Integrity) — certified volume tracking, mass balance, chain of custody
- **GOV** (Governance) — documentation, auditing, claims management

**Step 2: Create `prisma/fixtures/rspo-sccs.json`**

Use `"regulation": "RSPO_SCCS"` and `"version": "2020-v1"`.

**Step 3: Validate**

```bash
node -e "JSON.parse(require('fs').readFileSync('prisma/fixtures/rspo-sccs.json','utf8')); console.log('Valid JSON')"
```

---

### Task 5: Add `seedRegulationProfiles()` to seed.ts

**Files:**
- Modify: `prisma/seed.ts`

**Step 1: Add the seed function**

Add this function before `main()` in `prisma/seed.ts`. It reads all four fixtures and upserts profiles idempotently:

```typescript
async function seedRegulationProfiles() {
    const fixtures = [
        'prisma/fixtures/iscc-eu.json',
        'prisma/fixtures/iscc-plus.json',
        'prisma/fixtures/rspo-pc.json',
        'prisma/fixtures/rspo-sccs.json',
    ]

    for (const fixturePath of fixtures) {
        const raw = await fs.readFile(path.resolve(process.cwd(), fixturePath), 'utf8')
        const fixture = JSON.parse(raw)

        // Check if this regulation+version already exists
        const existing = await prisma.regulationProfile.findUnique({
            where: { regulation_version: { regulation: fixture.regulation, version: fixture.version } },
        })

        if (existing) {
            console.log(`  ✓ Profile already exists: ${fixture.name} — skipping`)
            continue
        }

        await prisma.regulationProfile.create({
            data: {
                regulation: fixture.regulation,
                version: fixture.version,
                name: fixture.name,
                description: fixture.description ?? null,
                isActive: true,
                pillars: {
                    create: fixture.pillars.map((pillar: any, pi: number) => ({
                        code: pillar.code,
                        name: pillar.name,
                        displayOrder: pillar.displayOrder ?? pi,
                        categories: {
                            create: pillar.categories.map((cat: any, ci: number) => ({
                                code: cat.code,
                                name: cat.name,
                                displayOrder: cat.displayOrder ?? ci,
                                requirements: {
                                    create: cat.requirements.map((req: any, ri: number) => ({
                                        code: req.code,
                                        name: req.name,
                                        description: req.description,
                                        guidanceText: req.guidanceText ?? null,
                                        dataType: req.dataType,
                                        requiresForm: req.requiresForm ?? true,
                                        criticality: req.criticality ?? 'NON_CRITICAL',
                                        ghgScope: req.ghgScope ?? null,
                                        unit: req.unit ?? null,
                                        displayOrder: req.displayOrder ?? ri,
                                        isActive: true,
                                    })),
                                },
                            })),
                        },
                    })),
                },
            },
        })

        console.log(`  ✓ Created profile: ${fixture.name}`)
    }
}
```

**Step 2: Add `fs` import at top of seed.ts**

At the top of `prisma/seed.ts`, add:

```typescript
import fs from 'fs/promises'
```

**Step 3: Call `seedRegulationProfiles()` inside `main()`**

Add a new step before the existing steps, or as the first step. Add this block inside `main()`:

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// STEP 0 — Regulation Profiles
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── Step 0: Regulation Profiles ───────────────────────────────────')
await seedRegulationProfiles()
```

**Step 4: Run the seed and verify output**

```bash
cd "D:\Claude Code"
bun run db:seed
```

Expected output includes:
```
─── Step 0: Regulation Profiles ───────────────────────────────────
  ✓ Created profile: ISCC EU 2024 v1
  ✓ Created profile: ISCC PLUS 2024 v1
  ✓ Created profile: RSPO PC 2018 v1
  ✓ Created profile: RSPO SCCS 2020 v1
```

Run again to confirm idempotency — all four lines should say "already exists — skipping".

**Step 5: Commit**

```bash
git add prisma/fixtures/ prisma/seed.ts
git commit -m "feat: add regulation profile fixtures and seed loader"
```

---

### Task 6: Add `GET /api/regulation-profiles` route

**Files:**
- Create: `src/app/api/regulation-profiles/route.ts`

**Step 1: Create the route file**

```typescript
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getProfiles } from '@/lib/regulation-profiles'

export const GET = withAuth(
    [UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR],
    async () => {
        const profiles = await getProfiles()
        return NextResponse.json({ data: profiles, error: null, meta: null })
    }
)
```

**Step 2: Verify the `getProfiles` DAL function returns enough fields**

Open `src/lib/regulation-profiles.ts`. The existing `getProfiles()` returns all profile fields but does not include `_count`. Update it to include pillar count:

```typescript
export async function getProfiles(regulation?: RegulationCode) {
    return prisma.regulationProfile.findMany({
        where: { regulation: regulation || undefined },
        orderBy: { createdAt: 'desc' },
        include: {
            _count: { select: { pillars: true } },
        },
    })
}
```

**Step 3: Test the route**

With the dev server running (`bun run dev`), log in as admin and run:

```bash
curl -s http://localhost:3000/api/regulation-profiles \
  -H "Cookie: <copy auth cookie from browser>" | node -e "process.stdin||(x=>console.log(JSON.stringify(JSON.parse(x),null,2)))(require('fs').readFileSync('/dev/stdin','utf8'))"
```

Or simply open `http://localhost:3000/api/regulation-profiles` in a logged-in browser tab.

Expected: JSON with `data` array containing 4 profiles, each with `_count.pillars > 0`.

**Step 4: Commit**

```bash
git add src/app/api/regulation-profiles/route.ts src/lib/regulation-profiles.ts
git commit -m "feat: add GET /api/regulation-profiles route"
```

---

### Task 7: Add `GET /api/regulation-profiles/[profileId]` route

**Files:**
- Create: `src/app/api/regulation-profiles/[profileId]/route.ts`

**Step 1: Create the route file**

```typescript
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getProfileById } from '@/lib/regulation-profiles'

export const GET = withAuth(
    [UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR],
    async (_request: Request, context: { params: { profileId: string } }) => {
        const profile = await getProfileById(context.params.profileId)
        if (!profile) {
            return NextResponse.json(
                { data: null, error: { code: 'NOT_FOUND', message: 'Profile not found' }, meta: null },
                { status: 404 }
            )
        }
        return NextResponse.json({ data: profile, error: null, meta: null })
    }
)
```

**Step 2: Test the route**

Copy one profile ID from the list route response, then open in browser:
`http://localhost:3000/api/regulation-profiles/<profileId>`

Expected: JSON with `data.pillars` array, each pillar containing `categories`, each category containing `requirements`.

**Step 3: Commit**

```bash
git add src/app/api/regulation-profiles/[profileId]/route.ts
git commit -m "feat: add GET /api/regulation-profiles/[profileId] route"
```

---

### Task 8: Wire up regulation profiles list page

**Files:**
- Modify: `src/app/(aggregator)/aggregator/regulation-profiles/page.tsx`

**Step 1: Replace the placeholder with a live client component**

```typescript
'use client'

import { useState, useEffect } from 'react'

type Profile = {
    id: string
    regulation: string
    version: string
    name: string
    isActive: boolean
    _count: { pillars: number }
}

const REGULATION_LABELS: Record<string, string> = {
    ISCC_EU: 'ISCC EU',
    ISCC_PLUS: 'ISCC PLUS',
    RSPO_PC: 'RSPO PC',
    RSPO_SCCS: 'RSPO SCCS',
}

export default function RegulationProfilesPage() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/regulation-profiles')
            .then(res => res.json())
            .then(data => {
                setProfiles(data.data ?? [])
                setLoading(false)
            })
    }, [])

    if (loading) return <div className="text-gray-500 p-8">Loading profiles...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Regulation Profiles</h1>
            </div>
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <p className="px-6 py-4 text-sm text-gray-500 border-b">
                    Regulation profiles define the pillars, categories, and requirements that mills must track.
                    Each checklist is pinned to the profile version it was created from.
                </p>
                {profiles.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">No profiles found.</p>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3 text-left">Name</th>
                                <th className="px-6 py-3 text-left">Regulation</th>
                                <th className="px-6 py-3 text-left">Version</th>
                                <th className="px-6 py-3 text-left">Pillars</th>
                                <th className="px-6 py-3 text-left">Active</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                            {profiles.map(profile => (
                                <tr key={profile.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{profile.name}</td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {REGULATION_LABELS[profile.regulation] ?? profile.regulation}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{profile.version}</td>
                                    <td className="px-6 py-4 text-gray-600">{profile._count.pillars}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            profile.isActive
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {profile.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <a
                                            href={`/aggregator/regulation-profiles/${profile.id}`}
                                            className="text-green-600 hover:underline font-medium text-sm"
                                        >
                                            View →
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
```

**Step 2: Verify in browser**

Open `http://localhost:3000/aggregator/regulation-profiles` while logged in as admin.

Expected: table showing 4 profiles with correct regulation labels, version, pillar count, and "Active" badges.

**Step 3: Commit**

```bash
git add src/app/\(aggregator\)/aggregator/regulation-profiles/page.tsx
git commit -m "feat: wire up regulation profiles list page"
```

---

### Task 9: Wire up regulation profile detail page

**Files:**
- Modify: `src/app/(aggregator)/aggregator/regulation-profiles/[profileId]/page.tsx`

**Step 1: Replace the placeholder with a live accordion tree**

```typescript
'use client'

import { useState, useEffect } from 'react'

type Requirement = {
    id: string
    code: string
    name: string
    dataType: string
    criticality: string
    unit: string | null
    requiresForm: boolean
}

type Category = {
    id: string
    code: string
    name: string
    requirements: Requirement[]
}

type Pillar = {
    id: string
    code: string
    name: string
    categories: Category[]
}

type Profile = {
    id: string
    name: string
    regulation: string
    version: string
    description: string | null
    pillars: Pillar[]
}

const DATA_TYPE_LABELS: Record<string, string> = {
    ABSOLUTE_QUANTITY: 'Quantity',
    RATE: 'Rate',
    DOCUMENT_ONLY: 'Document',
    TEXT_RESPONSE: 'Text',
}

const CRITICALITY_COLORS: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700',
    NON_CRITICAL: 'bg-yellow-100 text-yellow-700',
}

export default function RegulationProfileDetailPage({
    params,
}: {
    params: { profileId: string }
}) {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [openPillars, setOpenPillars] = useState<Set<string>>(new Set())
    const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())

    useEffect(() => {
        fetch(`/api/regulation-profiles/${params.profileId}`)
            .then(res => res.json())
            .then(data => {
                setProfile(data.data)
                setLoading(false)
                // Open first pillar by default
                if (data.data?.pillars?.length > 0) {
                    setOpenPillars(new Set([data.data.pillars[0].id]))
                }
            })
    }, [params.profileId])

    if (loading) return <div className="text-gray-500 p-8">Loading profile...</div>
    if (!profile) return <div className="text-red-500 p-8">Profile not found.</div>

    const togglePillar = (id: string) => {
        setOpenPillars(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const toggleCategory = (id: string) => {
        setOpenCategories(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const totalRequirements = profile.pillars
        .flatMap(p => p.categories)
        .flatMap(c => c.requirements).length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                    {profile.description && (
                        <p className="mt-1 text-sm text-gray-500">{profile.description}</p>
                    )}
                </div>
                <div className="text-sm text-gray-500">
                    {profile.pillars.length} pillars · {profile.pillars.flatMap(p => p.categories).length} categories · {totalRequirements} requirements
                </div>
            </div>

            <div className="space-y-3">
                {profile.pillars.map(pillar => (
                    <div key={pillar.id} className="bg-white shadow rounded-lg overflow-hidden">
                        <button
                            onClick={() => togglePillar(pillar.id)}
                            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                    {pillar.code}
                                </span>
                                <span className="font-semibold text-gray-900">{pillar.name}</span>
                                <span className="text-xs text-gray-400">
                                    {pillar.categories.length} categories
                                </span>
                            </div>
                            <span className="text-gray-400">{openPillars.has(pillar.id) ? '▲' : '▼'}</span>
                        </button>

                        {openPillars.has(pillar.id) && (
                            <div className="border-t divide-y">
                                {pillar.categories.map(cat => (
                                    <div key={cat.id}>
                                        <button
                                            onClick={() => toggleCategory(cat.id)}
                                            className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-gray-50 bg-gray-50"
                                        >
                                            <div className="flex items-center gap-3 ml-4">
                                                <span className="text-xs font-mono bg-white border text-gray-600 px-2 py-0.5 rounded">
                                                    {cat.code}
                                                </span>
                                                <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                                                <span className="text-xs text-gray-400">
                                                    {cat.requirements.length} requirements
                                                </span>
                                            </div>
                                            <span className="text-gray-400 text-xs">{openCategories.has(cat.id) ? '▲' : '▼'}</span>
                                        </button>

                                        {openCategories.has(cat.id) && (
                                            <div className="divide-y bg-white">
                                                {cat.requirements.map(req => (
                                                    <div key={req.id} className="px-6 py-3 ml-8 flex items-start gap-4">
                                                        <span className="text-xs font-mono text-gray-400 mt-0.5 shrink-0">
                                                            {req.code}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-gray-900">{req.name}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-xs text-gray-500">
                                                                {DATA_TYPE_LABELS[req.dataType] ?? req.dataType}
                                                                {req.unit ? ` (${req.unit})` : ''}
                                                            </span>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CRITICALITY_COLORS[req.criticality] ?? 'bg-gray-100 text-gray-600'}`}>
                                                                {req.criticality === 'CRITICAL' ? 'Major' : 'Minor'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
```

**Step 2: Verify in browser**

Open `http://localhost:3000/aggregator/regulation-profiles` → click "View →" on any profile.

Expected:
- Page shows profile name, pillar/category/requirement counts
- Clicking a pillar expands to show categories
- Clicking a category expands to show requirements with code, name, data type, and criticality badge

**Step 3: Commit**

```bash
git add src/app/\(aggregator\)/aggregator/regulation-profiles/\[profileId\]/page.tsx
git commit -m "feat: wire up regulation profile detail page with accordion tree"
```

---

### Task 10: Wire up checklist creation profile dropdown

**Files:**
- Modify: `src/app/(aggregator)/aggregator/checklists/new/page.tsx`

**Step 1: Replace the placeholder with a functional client component**

The existing page is a static form. Replace it with a live version that loads profiles and mills:

```typescript
'use client'

import { useState, useEffect } from 'react'

type Profile = {
    id: string
    name: string
    regulation: string
    isActive: boolean
}

type Mill = {
    id: string
    name: string
    code: string
}

export default function NewChecklistPage() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [mills, setMills] = useState<Mill[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [millId, setMillId] = useState('')
    const [profileId, setProfileId] = useState('')
    const [periodStart, setPeriodStart] = useState('')
    const [periodEnd, setPeriodEnd] = useState('')

    useEffect(() => {
        Promise.all([
            fetch('/api/regulation-profiles').then(r => r.json()),
            fetch('/api/mills').then(r => r.json()),
        ]).then(([profilesData, millsData]) => {
            setProfiles((profilesData.data ?? []).filter((p: Profile) => p.isActive))
            setMills(millsData.data ?? [])
            setLoading(false)
        })
    }, [])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        const res = await fetch('/api/checklists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ millId, profileId, periodStart, periodEnd }),
        })

        const data = await res.json()

        if (!res.ok) {
            setError(data.error?.message ?? 'Failed to create checklist')
            setSubmitting(false)
            return
        }

        // Redirect to the new checklist
        window.location.href = `/aggregator/mills/${millId}/checklists/${data.data.id}/review`
    }

    if (loading) return <div className="text-gray-500 p-8">Loading...</div>

    return (
        <div className="space-y-6 max-w-xl">
            <h1 className="text-2xl font-bold text-gray-900">Assign Regulation to Mill</h1>
            <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">
                        {error}
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Mill</label>
                    <select
                        required
                        value={millId}
                        onChange={e => setMillId(e.target.value)}
                        className="mt-1 block w-full border rounded-md p-2 text-sm"
                    >
                        <option value="">Select a mill…</option>
                        {mills.map(mill => (
                            <option key={mill.id} value={mill.id}>
                                {mill.name} ({mill.code})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Regulation Profile</label>
                    <select
                        required
                        value={profileId}
                        onChange={e => setProfileId(e.target.value)}
                        className="mt-1 block w-full border rounded-md p-2 text-sm"
                    >
                        <option value="">Select a profile…</option>
                        {profiles.map(profile => (
                            <option key={profile.id} value={profile.id}>
                                {profile.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Period Start</label>
                        <input
                            type="date"
                            required
                            value={periodStart}
                            onChange={e => setPeriodStart(e.target.value)}
                            className="mt-1 block w-full border rounded-md p-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Period End</label>
                        <input
                            type="date"
                            required
                            value={periodEnd}
                            onChange={e => setPeriodEnd(e.target.value)}
                            className="mt-1 block w-full border rounded-md p-2 text-sm"
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                    {submitting ? 'Creating…' : 'Create Checklist'}
                </button>
            </form>
        </div>
    )
}
```

**Step 2: Check if `GET /api/mills` exists**

```bash
ls "D:\Claude Code\src\app\api\mills\"
```

If it doesn't exist, you need to create it. Check `src/lib/` for a `mills.ts` DAL file. If there is one with a `getMills()` function, create `src/app/api/mills/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(
    [UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER],
    async () => {
        const mills = await prisma.mill.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, code: true },
        })
        return NextResponse.json({ data: mills, error: null, meta: null })
    }
)
```

**Step 3: Verify in browser**

Open `http://localhost:3000/aggregator/checklists/new` while logged in as admin.

Expected:
- "Mill" dropdown shows real mills (Palm Star Mill, Green Valley Mill)
- "Regulation Profile" dropdown shows 4 active profiles
- Submitting the form creates a checklist and redirects to the review page

**Step 4: Commit**

```bash
git add src/app/\(aggregator\)/aggregator/checklists/new/page.tsx
git add src/app/api/mills/  # if created
git commit -m "feat: wire up checklist creation form with live mills and profiles"
```

---

### Task 11: Final verification

**Step 1: Run the full seed to confirm idempotency**

```bash
bun run db:seed
```

Expected: all Step 0 lines say "already exists — skipping". No errors.

**Step 2: Smoke-test all three pages**

1. `http://localhost:3000/aggregator/regulation-profiles` — 4 profiles in table
2. Click "View →" on each profile — accordion tree loads correctly
3. `http://localhost:3000/aggregator/checklists/new` — both dropdowns populated

**Step 3: Update Notion ticket #8 to Done**

Update the ticket status to "Done" in Notion.

**Step 4: Final commit if any loose ends**

```bash
git status  # should be clean
```
