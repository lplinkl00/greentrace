# Wire Static Pages to Database Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all stub/placeholder pages with server or client components that fetch and display real data from the Prisma database.

**Architecture:** Server pages (mills, users, checklists lists, regulation-profiles, mill detail) call lib functions directly as async server components — matching the existing `shipments` and `imports` page pattern. Client pages that need interactivity (mass-balance forms, review auditor dropdown) fetch from API routes via `useEffect`. No new API routes are needed; all existing ones are used.

**Tech Stack:** Next.js 14 App Router, Prisma v7, TypeScript, Bun, Tailwind CSS

---

## Pages Being Wired

| Page | Change |
|---|---|
| `/aggregator/mills` | stub → server component, `getMills()` |
| `/aggregator/users` | stub → server component, `getUsers()` |
| `/aggregator/checklists` | empty table → server component, `getChecklists({})` |
| `/mill/checklists` | stub → server component, `getChecklists({millId})` |
| `/aggregator/mills/[millId]` | raw ID stub → server component, `getMillById()` |
| `/aggregator/regulation-profiles` | empty table → server component, `getProfiles()` |
| `/aggregator/.../mass-balance` | static rows → client component, fetch API |
| `/mill/.../mass-balance` | empty form → client component, fetch + save API |
| `review/page.tsx` auditor dropdown | hardcoded UUID → fetch `/api/users?role=AUDITOR` |

---

## Key Schema Facts

**MassBalanceEntry fields** (from schema): `certifiedIn`, `nonCertifiedIn`, `certifiedOut`, `nonCertifiedOut`, `openingStock`, `closingStock`, `discrepancyFlag`, `discrepancyNotes`, `openingStockConfirmed`, `openingStockConfirmedAt`, `materialType`

**`getChecklists()` currently includes:** `_count.items` but NOT `mill` — Task 1 fixes this.

**`getSessionUser()` returns:** `{ id, email, name, role, millId, organisationId }`

**MaterialType enum values:** `FFB`, `CRUDE_PALM_OIL`, `PALM_KERNEL_EXPELLER`, `PALM_KERNEL_OIL`, `POME_METHANE`, `EFB`

---

## Task 1: Update `getChecklists()` to include mill info

**Files:**
- Modify: `src/lib/checklists.ts`

**Step 1: Add `mill` to the Prisma include in `getChecklists()`**

In `src/lib/checklists.ts`, find the `include` block inside `getChecklists()`:

```typescript
// BEFORE
include: {
    _count: { select: { items: true } },
},
```

Change to:

```typescript
// AFTER
include: {
    _count: { select: { items: true } },
    mill: { select: { name: true, code: true } },
},
```

**Step 2: Verify TypeScript is happy**

```bash
cd "D:\Claude Code" && bun run build 2>&1 | tail -20
```

Expected: build succeeds (or same errors as before — ESLint is ignored during builds per `next.config.mjs`).

**Step 3: Commit**

```bash
git add src/lib/checklists.ts
git commit -m "feat: include mill in getChecklists() return"
```

---

## Task 2: Create `src/lib/mills.ts`

**Files:**
- Create: `src/lib/mills.ts`

**Step 1: Create the file**

```typescript
import { prisma } from './prisma'

export async function getMills() {
  return prisma.mill.findMany({
    include: {
      _count: { select: { checklists: true, users: true } },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getMillById(id: string) {
  return prisma.mill.findUnique({
    where: { id },
    include: {
      checklists: {
        include: {
          _count: { select: { items: true } },
        },
        orderBy: { periodStart: 'desc' },
      },
      _count: { select: { users: true } },
    },
  })
}
```

**Step 2: Commit**

```bash
git add src/lib/mills.ts
git commit -m "feat: add getMills and getMillById lib functions"
```

---

## Task 3: Wire `/aggregator/mills/page.tsx`

**Files:**
- Modify: `src/app/(aggregator)/aggregator/mills/page.tsx`

**Step 1: Replace the stub with a real server component**

```typescript
import { getMills } from '@/lib/mills'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AggregatorMillsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const mills = await getMills()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mills</h1>
        <span className="text-sm text-gray-500">{mills.length} mill{mills.length !== 1 ? 's' : ''}</span>
      </div>

      {mills.length === 0 ? (
        <p className="text-gray-500">No mills yet.</p>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Checklists</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mills.map((mill) => (
                <tr key={mill.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mill.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{mill.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{mill.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{mill.country}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{mill._count.users}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{mill._count.checklists}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      mill.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {mill.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Link href={`/aggregator/mills/${mill.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify page loads**

Start dev server (`bun run dev`) and navigate to `/aggregator/mills`. Should show Palm Star Mill and Green Valley Mill.

**Step 3: Commit**

```bash
git add src/app/(aggregator)/aggregator/mills/page.tsx
git commit -m "feat: wire aggregator mills page to database"
```

---

## Task 4: Wire `/aggregator/users/page.tsx`

**Files:**
- Modify: `src/app/(aggregator)/aggregator/users/page.tsx`

**Step 1: Replace the stub**

```typescript
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  AGGREGATOR_MANAGER: 'Aggregator Manager',
  MILL_MANAGER: 'Mill Manager',
  MILL_STAFF: 'Mill Staff',
  AUDITOR: 'Auditor',
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  AGGREGATOR_MANAGER: 'bg-blue-100 text-blue-800',
  MILL_MANAGER: 'bg-green-100 text-green-800',
  MILL_STAFF: 'bg-gray-100 text-gray-700',
  AUDITOR: 'bg-orange-100 text-orange-800',
}

export default async function AggregatorUsersPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const users = await prisma.user.findMany({
    include: {
      mill: { select: { name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <span className="text-sm text-gray-500">{users.length} user{users.length !== 1 ? 's' : ''}</span>
      </div>

      {users.length === 0 ? (
        <p className="text-gray-500">No users yet.</p>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mill</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {u.mill ? `${u.mill.name} (${u.mill.code})` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify page loads**

Navigate to `/aggregator/users`. Should show all 6 demo users.

**Step 3: Commit**

```bash
git add src/app/(aggregator)/aggregator/users/page.tsx
git commit -m "feat: wire aggregator users page to database"
```

---

## Task 5: Wire `/aggregator/checklists/page.tsx`

**Files:**
- Modify: `src/app/(aggregator)/aggregator/checklists/page.tsx`

**Step 1: Replace empty table with live data**

The existing file has the page structure with an "Assign Regulation to Mill" button. Replace the entire content:

```typescript
import { getChecklists } from '@/lib/checklists'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  UNDER_AUDIT: 'bg-purple-100 text-purple-800',
  CERTIFIED: 'bg-green-100 text-green-800',
  LOCKED: 'bg-red-100 text-red-800',
}

export default async function AggregatorChecklistsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const checklists = await getChecklists({})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Checklists</h1>
        <Link
          href="/aggregator/checklists/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          Assign Regulation to Mill
        </Link>
      </div>

      <p className="text-sm text-gray-500">
        Each checklist auto-generates checklist items from the active requirements of the selected regulation profile.
      </p>

      {checklists.length === 0 ? (
        <p className="text-gray-500">No checklists yet.</p>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mill</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regulation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {checklists.map((cl) => (
                <tr key={cl.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cl.mill.name}
                    <span className="ml-1 text-xs text-gray-400 font-mono">({cl.mill.code})</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cl.regulation}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(cl.periodStart).getFullYear()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_STYLES[cl.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {cl.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {cl._count.items}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Link
                      href={`/aggregator/mills/${cl.millId}/checklists/${cl.id}/review`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify page loads**

Navigate to `/aggregator/checklists`. Should show 3 checklists with mill names, statuses, and item counts.

**Step 3: Commit**

```bash
git add src/app/(aggregator)/aggregator/checklists/page.tsx
git commit -m "feat: wire aggregator checklists page to database"
```

---

## Task 6: Wire `/mill/checklists/page.tsx`

**Files:**
- Modify: `src/app/(mill)/mill/checklists/page.tsx`

**Step 1: Replace stub with server component**

```typescript
import { getChecklists } from '@/lib/checklists'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  UNDER_AUDIT: 'bg-purple-100 text-purple-800',
  CERTIFIED: 'bg-green-100 text-green-800',
  LOCKED: 'bg-red-100 text-red-800',
}

export default async function MillChecklistsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (!user.millId) redirect('/login')

  const checklists = await getChecklists({ millId: user.millId })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Checklists</h1>
        <span className="text-sm text-gray-500">{checklists.length} checklist{checklists.length !== 1 ? 's' : ''}</span>
      </div>

      {checklists.length === 0 ? (
        <p className="text-gray-500">No checklists assigned to your mill yet.</p>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regulation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {checklists.map((cl) => (
                <tr key={cl.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cl.regulation}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(cl.periodStart).getFullYear()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_STYLES[cl.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {cl.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {cl._count.items}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Link href={`/mill/checklists/${cl.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify page loads**

Log in as `ps.manager@greentrace.local` and navigate to `/mill/checklists`. Should show 2 Palm Star checklists.

**Step 3: Commit**

```bash
git add src/app/(mill)/mill/checklists/page.tsx
git commit -m "feat: wire mill checklists page to database"
```

---

## Task 7: Wire `/aggregator/mills/[millId]/page.tsx`

**Files:**
- Modify: `src/app/(aggregator)/aggregator/mills/[millId]/page.tsx`

**Step 1: Replace stub with server component**

```typescript
import { getMillById } from '@/lib/mills'
import { getSessionUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  UNDER_AUDIT: 'bg-purple-100 text-purple-800',
  CERTIFIED: 'bg-green-100 text-green-800',
  LOCKED: 'bg-red-100 text-red-800',
}

export default async function MillDetailPage({
  params,
}: {
  params: { millId: string }
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const mill = await getMillById(params.millId)
  if (!mill) notFound()

  return (
    <div className="space-y-6">
      {/* Mill Info Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{mill.name}</h1>
            <p className="text-sm text-gray-500 font-mono">{mill.code}</p>
          </div>
          <div className="flex gap-2">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${mill.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {mill.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Location</span>
            <p className="font-medium text-gray-900">{mill.location}</p>
          </div>
          <div>
            <span className="text-gray-500">Country</span>
            <p className="font-medium text-gray-900">{mill.country}</p>
          </div>
          <div>
            <span className="text-gray-500">Users</span>
            <p className="font-medium text-gray-900">{mill._count.users}</p>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <Link
            href={`/aggregator/mills/${mill.id}/integrations`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Manage Integrations →
          </Link>
        </div>
      </div>

      {/* Checklists */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Checklists</h2>
        {mill.checklists.length === 0 ? (
          <p className="text-gray-500 text-sm">No checklists for this mill yet.</p>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regulation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mill.checklists.map((cl) => (
                  <tr key={cl.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cl.regulation}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(cl.periodStart).getFullYear()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_STYLES[cl.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {cl.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {cl._count.items}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        href={`/aggregator/mills/${mill.id}/checklists/${cl.id}/review`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Verify page loads**

Navigate to `/aggregator/mills` → click "View →" on Palm Star Mill. Should show full mill info card and 2 checklists.

**Step 3: Commit**

```bash
git add src/app/(aggregator)/aggregator/mills/\[millId\]/page.tsx src/lib/mills.ts
git commit -m "feat: wire aggregator mill detail page to database"
```

---

## Task 8: Wire `/aggregator/regulation-profiles/page.tsx`

**Files:**
- Modify: `src/app/(aggregator)/aggregator/regulation-profiles/page.tsx`

**Step 1: Replace empty table with live data**

```typescript
import { getProfiles } from '@/lib/regulation-profiles'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function RegulationProfilesPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const profiles = await getProfiles()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Regulation Profiles</h1>
        <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
          New Profile
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Regulation profiles are versioned frameworks. Pinning a checklist to a specific version
        ensures the requirements don't change mid-cycle.
      </p>

      {profiles.length === 0 ? (
        <p className="text-gray-500">No regulation profiles yet.</p>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regulation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Published</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{profile.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{profile.regulation}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{profile.version}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {profile.publishedAt ? new Date(profile.publishedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      profile.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {profile.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify**

Navigate to `/aggregator/regulation-profiles`. Should show 4 profiles (ISCC EU, ISCC PLUS, RSPO PC, RSPO SCCS).

**Step 3: Commit**

```bash
git add src/app/(aggregator)/aggregator/regulation-profiles/page.tsx
git commit -m "feat: wire regulation profiles page to database"
```

---

## Task 9: Wire aggregator mass-balance review page

**Files:**
- Modify: `src/app/(aggregator)/aggregator/mills/[millId]/checklists/[checklistId]/mass-balance/page.tsx`

This page needs an "Override" action, so convert to a client component that fetches from API.

**Step 1: Replace static page with client component**

```typescript
'use client'

import { useState, useEffect } from 'react'

const MATERIAL_LABELS: Record<string, string> = {
  FFB: 'FFB (Fresh Fruit Bunches)',
  CRUDE_PALM_OIL: 'CPO (Crude Palm Oil)',
  PALM_KERNEL_EXPELLER: 'PKE (Palm Kernel Expeller)',
  PALM_KERNEL_OIL: 'PKO (Palm Kernel Oil)',
  POME_METHANE: 'POME (Palm Oil Mill Effluent)',
  EFB: 'EFB (Empty Fruit Bunches)',
}

export default function AggregatorMassBalancePage({
  params,
}: {
  params: { millId: string; checklistId: string }
}) {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [overrideId, setOverrideId] = useState<string | null>(null)
  const [overrideNotes, setOverrideNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/mass-balance?checklistId=${params.checklistId}`)
      .then((r) => r.json())
      .then((d) => {
        setEntries(d.data ?? [])
        setLoading(false)
      })
  }, [params.checklistId])

  const handleOverride = async (id: string) => {
    if (!overrideNotes.trim()) return alert('Please enter override notes.')
    setSaving(true)
    const res = await fetch(`/api/mass-balance/${id}/override-discrepancy`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: overrideNotes }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.error) {
      alert(data.error)
    } else {
      setOverrideId(null)
      setOverrideNotes('')
      // Refresh entries
      fetch(`/api/mass-balance?checklistId=${params.checklistId}`)
        .then((r) => r.json())
        .then((d) => setEntries(d.data ?? []))
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Checklist {params.checklistId}</p>
        <h1 className="text-2xl font-bold text-gray-900">Mass Balance Review</h1>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Opening</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cert In</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cert Out</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Closing</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry) => (
              <>
                <tr key={entry.id} className={entry.discrepancyFlag ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {MATERIAL_LABELS[entry.materialType] ?? entry.materialType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {Number(entry.openingStock).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {Number(entry.certifiedIn).toFixed(2)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${entry.discrepancyFlag ? 'text-red-600' : 'text-gray-500'}`}>
                    {Number(entry.certifiedOut).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 text-right">
                    {Number(entry.closingStock).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {entry.discrepancyFlag ? (
                      <div className="flex items-center gap-2">
                        {entry.discrepancyOverriddenAt ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Overridden
                          </span>
                        ) : (
                          <>
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Overscheduled
                            </span>
                            <button
                              onClick={() => setOverrideId(overrideId === entry.id ? null : entry.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Override
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Valid
                      </span>
                    )}
                  </td>
                </tr>
                {overrideId === entry.id && (
                  <tr key={`${entry.id}-override`}>
                    <td colSpan={6} className="px-6 py-4 bg-yellow-50 border-t border-yellow-100">
                      <div className="flex items-center gap-4">
                        <textarea
                          className="flex-1 text-sm border border-gray-300 rounded p-2"
                          rows={2}
                          placeholder="Override reason / notes..."
                          value={overrideNotes}
                          onChange={(e) => setOverrideNotes(e.target.value)}
                        />
                        <button
                          onClick={() => handleOverride(entry.id)}
                          disabled={saving || !overrideNotes.trim()}
                          className="px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50"
                        >
                          {saving ? 'Saving…' : 'Confirm Override'}
                        </button>
                        <button
                          onClick={() => { setOverrideId(null); setOverrideNotes('') }}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  No mass balance entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Step 2: Verify**

Navigate to a checklist's mass balance page from the aggregator view. Should show real entries.

**Step 3: Commit**

```bash
git add "src/app/(aggregator)/aggregator/mills/[millId]/checklists/[checklistId]/mass-balance/page.tsx"
git commit -m "feat: wire aggregator mass balance review page to database"
```

---

## Task 10: Wire mill mass-balance entry page

**Files:**
- Modify: `src/app/(mill)/mill/checklists/[checklistId]/mass-balance/page.tsx`

Convert from a static server component to a client component that fetches entries and allows editing.

**Step 1: Replace with interactive client component**

```typescript
'use client'

import { useState, useEffect } from 'react'

const MATERIAL_LABELS: Record<string, string> = {
  FFB: 'FFB (Fresh Fruit Bunches)',
  CRUDE_PALM_OIL: 'CPO (Crude Palm Oil)',
  PALM_KERNEL_EXPELLER: 'PKE (Palm Kernel Expeller)',
  PALM_KERNEL_OIL: 'PKO (Palm Kernel Oil)',
  POME_METHANE: 'POME (Palm Oil Mill Effluent)',
  EFB: 'EFB (Empty Fruit Bunches)',
}

type Entry = {
  id: string
  materialType: string
  openingStock: string | number
  certifiedIn: string | number
  nonCertifiedIn: string | number
  certifiedOut: string | number
  nonCertifiedOut: string | number
  closingStock: string | number
  openingStockConfirmed: boolean
  discrepancyFlag: boolean
}

type EditState = Record<string, {
  certifiedIn: string
  nonCertifiedIn: string
  certifiedOut: string
  nonCertifiedOut: string
}>

export default function MillMassBalancePage({
  params,
}: {
  params: { checklistId: string }
}) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [edits, setEdits] = useState<EditState>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmingStock, setConfirmingStock] = useState(false)

  useEffect(() => {
    fetch(`/api/mass-balance?checklistId=${params.checklistId}`)
      .then((r) => r.json())
      .then((d) => {
        const data: Entry[] = d.data ?? []
        setEntries(data)
        // Initialise edit state from fetched values
        const initial: EditState = {}
        for (const e of data) {
          initial[e.id] = {
            certifiedIn: String(Number(e.certifiedIn)),
            nonCertifiedIn: String(Number(e.nonCertifiedIn)),
            certifiedOut: String(Number(e.certifiedOut)),
            nonCertifiedOut: String(Number(e.nonCertifiedOut)),
          }
        }
        setEdits(initial)
        setLoading(false)
      })
  }, [params.checklistId])

  const handleChange = (entryId: string, field: keyof EditState[string], value: string) => {
    setEdits((prev) => ({
      ...prev,
      [entryId]: { ...prev[entryId], [field]: value },
    }))
  }

  const calcClosing = (entry: Entry): number => {
    const edit = edits[entry.id]
    if (!edit) return Number(entry.closingStock)
    const opening = Number(entry.openingStock)
    const certIn = parseFloat(edit.certifiedIn) || 0
    const certOut = parseFloat(edit.certifiedOut) || 0
    return opening + certIn - certOut
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      await Promise.all(
        entries.map((entry) => {
          const edit = edits[entry.id]
          if (!edit) return Promise.resolve()
          return fetch(`/api/mass-balance/${entry.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              certifiedIn: parseFloat(edit.certifiedIn) || 0,
              nonCertifiedIn: parseFloat(edit.nonCertifiedIn) || 0,
              certifiedOut: parseFloat(edit.certifiedOut) || 0,
              nonCertifiedOut: parseFloat(edit.nonCertifiedOut) || 0,
            }),
          })
        })
      )
      // Refresh from server
      const r = await fetch(`/api/mass-balance?checklistId=${params.checklistId}`)
      const d = await r.json()
      setEntries(d.data ?? [])
      alert('Saved successfully.')
    } catch {
      alert('Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmOpeningStock = async () => {
    setConfirmingStock(true)
    try {
      await Promise.all(
        entries
          .filter((e) => !e.openingStockConfirmed)
          .map((entry) =>
            fetch(`/api/mass-balance/${entry.id}/confirm-opening-stock`, {
              method: 'PATCH',
            })
          )
      )
      const r = await fetch(`/api/mass-balance?checklistId=${params.checklistId}`)
      const d = await r.json()
      setEntries(d.data ?? [])
      alert('Opening stock confirmed.')
    } catch {
      alert('Confirmation failed. Please try again.')
    } finally {
      setConfirmingStock(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  const allConfirmed = entries.every((e) => e.openingStockConfirmed)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Checklist {params.checklistId}</p>
          <h1 className="text-2xl font-bold text-gray-900">Mass Balance</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleConfirmOpeningStock}
            disabled={confirmingStock || allConfirmed}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {allConfirmed ? 'Opening Stock Confirmed' : confirmingStock ? 'Confirming…' : 'Confirm Opening Stock'}
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save All'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {entries.map((entry) => {
          const edit = edits[entry.id] ?? { certifiedIn: '0', nonCertifiedIn: '0', certifiedOut: '0', nonCertifiedOut: '0' }
          const closing = calcClosing(entry)
          return (
            <div key={entry.id} className={`bg-white shadow rounded-lg p-6 ${entry.discrepancyFlag ? 'ring-2 ring-red-400' : ''}`}>
              <h2 className="font-semibold text-gray-800 mb-4">
                {MATERIAL_LABELS[entry.materialType] ?? entry.materialType}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Opening Stock</label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-medium">{Number(entry.openingStock).toFixed(2)} MT</span>
                    <span className={`px-2 py-1 text-xs rounded ${entry.openingStockConfirmed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {entry.openingStockConfirmed ? 'Confirmed' : 'Unconfirmed'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase">Certified In</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm"
                      value={edit.certifiedIn}
                      onChange={(e) => handleChange(entry.id, 'certifiedIn', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase">Non-Cert In</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm"
                      value={edit.nonCertifiedIn}
                      onChange={(e) => handleChange(entry.id, 'nonCertifiedIn', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase">Certified Out</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm"
                      value={edit.certifiedOut}
                      onChange={(e) => handleChange(entry.id, 'certifiedOut', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase">Non-Cert Out</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm"
                      value={edit.nonCertifiedOut}
                      onChange={(e) => handleChange(entry.id, 'nonCertifiedOut', e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <label className="block text-sm font-medium text-gray-700">Closing Stock</label>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-lg font-medium ${closing < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      {closing.toFixed(2)} MT
                    </span>
                    <span className="text-xs text-gray-500">Auto-calculated</span>
                  </div>
                  {entry.discrepancyFlag && (
                    <p className="mt-1 text-xs text-red-600">⚠ Overscheduled — contact your aggregator manager</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 2: Verify**

Navigate to `/mill/checklists/{checklistId}/mass-balance`. Should show 6 material cards with real values from the database. Save All should PATCH successfully.

**Step 3: Commit**

```bash
git add "src/app/(mill)/mill/checklists/[checklistId]/mass-balance/page.tsx"
git commit -m "feat: wire mill mass balance page to database with save"
```

---

## Task 11: Fix review/page.tsx hardcoded auditor dropdown

**Files:**
- Modify: `src/app/(aggregator)/aggregator/mills/[millId]/checklists/[checklistId]/review/page.tsx`

**Step 1: Add auditor state and fetch**

In the existing `review/page.tsx`:

1. Add to the state declarations (after the existing `useState` calls):

```typescript
const [auditors, setAuditors] = useState<{ id: string; name: string }[]>([])
```

2. Add a second `useEffect` (after the existing one that fetches the checklist):

```typescript
useEffect(() => {
  fetch('/api/users?role=AUDITOR')
    .then((r) => r.json())
    .then((d) => setAuditors(d.data ?? []))
}, [])
```

3. Replace the hardcoded `<select>` options block:

```typescript
// BEFORE
<option value="">Select Auditor...</option>
<option value="test-auditor-uuid">Jane Doe (Test Auditor)</option>

// AFTER
<option value="">Select Auditor...</option>
{auditors.map((a) => (
  <option key={a.id} value={a.id}>{a.name}</option>
))}
```

**Step 2: Verify**

Navigate to a checklist review page. The "Send to Audit" auditor dropdown should show `auditor@greentrace.local` from the database instead of "Jane Doe (Test Auditor)".

**Step 3: Commit**

```bash
git add "src/app/(aggregator)/aggregator/mills/[millId]/checklists/[checklistId]/review/page.tsx"
git commit -m "fix: replace hardcoded test auditor with real users from database"
```

---

## Task 12: Final build verification

**Step 1: Run full build**

```bash
cd "D:\Claude Code" && bun run build 2>&1 | tail -30
```

Expected: build succeeds. ESLint errors are ignored per `next.config.mjs`.

**Step 2: Check all pages return 200**

Start dev server and verify each wired page loads without error:

```
/aggregator/mills              → table of mills
/aggregator/users              → table of users
/aggregator/checklists         → table of checklists with mill names
/mill/checklists               → table of checklists for current mill
/aggregator/mills/{millId}     → mill detail + checklists
/aggregator/regulation-profiles → table of profiles
/aggregator/mills/.../mass-balance → real mass balance entries
/mill/checklists/.../mass-balance  → real entries, editable
/aggregator/mills/.../review       → auditor dropdown shows DB users
```

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: verify all static pages wired to database"
```
