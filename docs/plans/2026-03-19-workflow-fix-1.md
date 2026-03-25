# Workflow Fix 1 — Super Admin Workflow Bug Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all broken and missing super-admin flows discovered during live testing: commit the already-applied redirect fix, resolve a stale route name, add SUPER_ADMIN to action routes, wire real auditor data into the review page, expose the force-status escape hatch for DRAFT checklists, and implement the disabled "Add Company" button.

**Architecture:** All fixes are in the Next.js App Router layer — API route files under `src/app/api/` and page/component files under `src/app/(aggregator)/`. No schema changes. No new libraries. The `POST /api/companies` backend already exists; only the UI is wired up.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma v7 + PrismaPg, Supabase auth, Bun

---

## Bug Inventory (confirmed via live testing 2026-03-19)

| # | Bug | Location |
|---|-----|----------|
| B0 | Checklist creation redirects to `.../undefined/review` | `src/app/api/checklists/route.ts` **ALREADY FIXED** |
| B1 | `/api/checklists/[id]/return-to-company` returns 404 — route file is named `return-to-mill` | `src/app/api/checklists/[id]/return-to-mill/` |
| B2 | `send-to-audit` and `return-to-company` routes reject SUPER_ADMIN with 403 | Both route files |
| B3 | Auditor dropdown is hardcoded with a fake UUID; real auditors never fetched | Review page |
| B4 | Review page shows zero actions for DRAFT checklists — no way to advance to UNDER_REVIEW | Review page |
| B5 | "Add Company" button is `disabled` — `POST /api/companies` exists but UI is not wired | Companies list page |

---

## Task 0 — Commit the already-applied B0 fix

The `createChecklist` return value was already unwrapped in the previous session.

**Files:**
- Modified: `src/app/api/checklists/route.ts`

### Step 1: Verify the fix is in place

```bash
grep "result.checklist" src/app/api/checklists/route.ts
```

Expected output: `return NextResponse.json({ data: result.checklist, error: null, meta: null }, { status: 201 })`

### Step 2: Commit

```bash
git add src/app/api/checklists/route.ts
git commit -m "fix: unwrap checklist from createChecklist result so redirect ID is defined"
```

---

## Task 1 — Fix B1: Rename `return-to-mill` route to `return-to-company`

The review page calls `POST /api/checklists/{id}/return-to-company` but the route file lives at `return-to-mill/`. Since `return-to-mill` is an old name (mills were renamed to companies), the directory must be renamed to match the call site.

**Files:**
- Delete: `src/app/api/checklists/[id]/return-to-mill/route.ts`
- Create: `src/app/api/checklists/[id]/return-to-company/route.ts`

### Step 1: Create the correctly named route file

Create `src/app/api/checklists/[id]/return-to-company/route.ts` with this exact content:

```typescript
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { returnChecklistToCompany } from '@/lib/checklist-workflow'

export const POST = withAuth(
  [UserRole.AGGREGATOR_MANAGER, UserRole.SUPER_ADMIN],
  async (request: Request, context: any, user: any) => {
    const { id } = context.params
    const body = await request.json()

    if (!body.reason) {
      return NextResponse.json({ error: 'A reason is required.' }, { status: 400 })
    }

    try {
      const checklist = await returnChecklistToCompany(id, user.id, body.reason)
      return NextResponse.json({ data: checklist })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
  }
)
```

> Note: SUPER_ADMIN is added here directly (fixes B2 for this route at the same time).

### Step 2: Delete the old file

```bash
rm src/app/api/checklists/[id]/return-to-mill/route.ts
rmdir src/app/api/checklists/[id]/return-to-mill
```

### Step 3: Verify the route compiles

```bash
bun run build 2>&1 | grep -E "error TS|Error" | grep -v "node_modules" | head -20
```

Expected: no new TypeScript errors.

### Step 4: Commit

```bash
git add src/app/api/checklists/[id]/return-to-company/route.ts
git rm src/app/api/checklists/[id]/return-to-mill/route.ts
git commit -m "fix: rename return-to-mill route to return-to-company to match review page call site"
```

---

## Task 2 — Fix B2: Add SUPER_ADMIN to `send-to-audit` route

**Files:**
- Modify: `src/app/api/checklists/[id]/send-to-audit/route.ts`

### Step 1: Open the file and update the allowed roles array

In `src/app/api/checklists/[id]/send-to-audit/route.ts`, find:

```typescript
export const POST = withAuth([UserRole.AGGREGATOR_MANAGER], async (request: Request, context: any, user: any) => {
```

Replace with:

```typescript
export const POST = withAuth(
  [UserRole.AGGREGATOR_MANAGER, UserRole.SUPER_ADMIN],
  async (request: Request, context: any, user: any) => {
```

### Step 2: Verify build

```bash
bun run build 2>&1 | grep -E "error TS|Error" | grep -v "node_modules" | head -20
```

Expected: no new errors.

### Step 3: Commit

```bash
git add src/app/api/checklists/[id]/send-to-audit/route.ts
git commit -m "fix: allow SUPER_ADMIN to call send-to-audit route"
```

---

## Task 3 — Fix B3: Replace hardcoded auditor dropdown with real data

The review page has `<option value="test-auditor-uuid">Jane Doe (Test Auditor)</option>` hardcoded. Auditors must be fetched from `GET /api/users?role=AUDITOR`.

**Files:**
- Modify: `src/app/(aggregator)/aggregator/companies/[companyId]/checklists/[checklistId]/review/page.tsx`

### Step 1: Add auditors state and fetch them on mount

At the top of the file, find the existing state declarations:

```typescript
    const [auditorId, setAuditorId] = useState('')
```

Add a new state immediately after:

```typescript
    const [auditors, setAuditors] = useState<{ id: string; name: string; email: string }[]>([])
```

### Step 2: Add the fetch inside the existing `useEffect`

Find the existing `useEffect`:

```typescript
    useEffect(() => {
        fetch(`/api/checklists/${params.checklistId}`)
            .then(res => res.json())
            .then(data => {
                setChecklist(data.data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [params.checklistId])
```

Replace it with:

```typescript
    useEffect(() => {
        Promise.all([
            fetch(`/api/checklists/${params.checklistId}`).then(r => r.json()),
            fetch(`/api/users?role=AUDITOR`).then(r => r.json()),
        ]).then(([checklistData, auditorsData]) => {
            setChecklist(checklistData.data)
            setAuditors(auditorsData.data ?? [])
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [params.checklistId])
```

### Step 3: Replace the hardcoded `<select>` options

Find:

```tsx
                                <select
                                    className="w-full text-sm border border-green-200 rounded-lg p-2 mb-3 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
                                    value={auditorId}
                                    onChange={e => setAuditorId(e.target.value)}
                                >
                                    <option value="">Select Auditor...</option>
                                    <option value="test-auditor-uuid">Jane Doe (Test Auditor)</option>
                                </select>
```

Replace with:

```tsx
                                <select
                                    className="w-full text-sm border border-green-200 rounded-lg p-2 mb-3 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
                                    value={auditorId}
                                    onChange={e => setAuditorId(e.target.value)}
                                >
                                    <option value="">Select Auditor...</option>
                                    {auditors.length === 0 && (
                                        <option disabled value="">No auditors registered</option>
                                    )}
                                    {auditors.map(a => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} ({a.email})
                                        </option>
                                    ))}
                                </select>
```

### Step 4: Manual test

Navigate to the review page of the SUBMITTED checklist (Palm Star Mill 2024):
```
http://localhost:3000/aggregator/companies/cmmm87ywo0001mgpnupolfpbj/checklists/cmmm88nxp000amgpnovnnaec2/review
```

Open DevTools → Network. The page should fire `GET /api/users?role=AUDITOR`. The select should show real auditors (e.g. "Audit User (auditor@greentrace.local)").

### Step 5: Commit

```bash
git add src/app/(aggregator)/aggregator/companies/\[companyId\]/checklists/\[checklistId\]/review/page.tsx
git commit -m "fix: fetch real auditors from DB instead of hardcoded test UUID in review page"
```

---

## Task 4 — Fix B4: Add force-to-review panel for DRAFT checklists

The review page shows `Aggregator Actions` only when `checklist.status === 'UNDER_REVIEW'`. A freshly created checklist is `DRAFT`. SUPER_ADMIN should be able to force it to `UNDER_REVIEW` directly using the existing `POST /api/checklists/{id}/force-status` endpoint (already SUPER_ADMIN-only).

**Files:**
- Modify: `src/app/(aggregator)/aggregator/companies/[companyId]/checklists/[checklistId]/review/page.tsx`

### Step 1: Add force-status state variables

After the existing state declarations, add:

```typescript
    const [forceReason, setForceReason] = useState('')
```

### Step 2: Add `handleForceToReview` handler

After the `handleSendToAudit` function, add:

```typescript
    const handleForceToReview = async () => {
        if (!forceReason) {
            setActionError('Please enter a reason.')
            return
        }
        setActionError(null)
        setActionLoading(true)
        const res = await fetch(`/api/checklists/${params.checklistId}/force-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'UNDER_REVIEW', reason: forceReason })
        })
        const data = await res.json()
        setActionLoading(false)
        if (data.error) {
            setActionError(data.error)
        } else {
            setActionSuccess('Checklist forced to UNDER REVIEW.')
            window.location.reload()
        }
    }
```

### Step 3: Add the DRAFT admin panel to the JSX

Find the closing of the items list section and the existing `{checklist.status === 'UNDER_REVIEW' && ...}` block:

```tsx
                {checklist.status === 'UNDER_REVIEW' && (
```

Add a new block directly before it:

```tsx
                {checklist.status === 'DRAFT' && (
                    <div className="border-t border-zinc-100 pt-6">
                        <h3 className="text-sm font-semibold text-zinc-700 mb-1">Super Admin — Force Status</h3>
                        <p className="text-xs text-zinc-400 mb-4">Bypass normal submission validation and move this checklist directly to UNDER REVIEW.</p>
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                            <textarea
                                className="w-full text-sm border border-amber-200 rounded-lg p-2 mb-3 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                                rows={2}
                                placeholder="Reason for forcing status change..."
                                value={forceReason}
                                onChange={e => setForceReason(e.target.value)}
                            />
                            <button
                                onClick={handleForceToReview}
                                disabled={actionLoading || !forceReason}
                                className="w-full text-sm font-semibold text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                                style={{ background: '#d97706' }}
                            >
                                Force to UNDER REVIEW
                            </button>
                        </div>
                    </div>
                )}

                {checklist.status === 'UNDER_REVIEW' && (
```

### Step 4: Manual test

1. Navigate to the 2025 Palm Star Mill checklist review page (status: DRAFT):
   ```
   http://localhost:3000/aggregator/companies/cmmm87ywo0001mgpnupolfpbj/checklists/cmmxbcu8t0002ygpn8g6m755x/review
   ```
2. The amber "Force to UNDER REVIEW" panel should appear.
3. Enter reason: `"Admin bypass for testing"` → click button.
4. Network: `POST /api/checklists/.../force-status` → 200.
5. Page reloads → status badge should change to `UNDER_REVIEW`.
6. The "Return to Company" and "Send to Audit" panels should now appear.

### Step 5: Commit

```bash
git add src/app/(aggregator)/aggregator/companies/\[companyId\]/checklists/\[checklistId\]/review/page.tsx
git commit -m "fix: add super admin force-status panel to review page for DRAFT checklists"
```

---

## Task 5 — Fix B5: Wire up "Add Company" button

The `POST /api/companies` API already exists and requires only `name`, `code`, `location`, `country`, `latitude`, `longitude`. The button needs an inline modal form.

**Files:**
- Modify: `src/app/(aggregator)/aggregator/companies/page.tsx`

### Step 1: Add modal state

In `CompanyListPage`, after the existing state variables, add:

```typescript
    const [showModal, setShowModal] = useState(false)
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)
    const [form, setForm] = useState({ name: '', code: '', location: '', country: '' })
```

### Step 2: Add `handleCreate` function

After the existing `useEffect`, add:

```typescript
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim() || !form.code.trim()) {
            setCreateError('Company name and code are required.')
            return
        }
        setCreating(true)
        setCreateError(null)
        const res = await fetch('/api/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        })
        const data = await res.json()
        setCreating(false)
        if (!res.ok) {
            setCreateError(data.error?.message ?? 'Failed to create company.')
            return
        }
        setCompanies(prev => [data.data, ...prev])
        setShowModal(false)
        setForm({ name: '', code: '', location: '', country: '' })
    }
```

### Step 3: Enable the "Add Company" button

Find the disabled button:

```tsx
                <button
                    disabled
                    title="Coming soon"
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white opacity-50 cursor-not-allowed transition"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                >
                    <Plus size={14} /> Add Company
                </button>
```

Replace with:

```tsx
                <button
                    onClick={() => { setShowModal(true); setCreateError(null) }}
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white transition hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                >
                    <Plus size={14} /> Add Company
                </button>
```

### Step 4: Add the modal JSX

At the very end of the returned JSX, just before the closing `</div>` of the root `space-y-6` div, add:

```tsx
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold text-zinc-900 mb-4">Add Company</h2>
                        {createError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
                                {createError}
                            </div>
                        )}
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Company Name *</label>
                                <input
                                    required
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                                    placeholder="e.g. Sunrise Palm Mill"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Company Code *</label>
                                <input
                                    required
                                    type="text"
                                    value={form.code}
                                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-300"
                                    placeholder="e.g. MY-SR-003"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Location</label>
                                <input
                                    type="text"
                                    value={form.location}
                                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                                    placeholder="e.g. Jalan Sawit 1, Kuala Lumpur"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Country</label>
                                <input
                                    type="text"
                                    value={form.country}
                                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                                    placeholder="e.g. Malaysia"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 text-sm font-medium px-4 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 text-sm font-semibold px-4 py-2 rounded-lg text-white transition disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                                >
                                    {creating ? 'Creating…' : 'Create Company'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
```

### Step 5: Manual test

1. Navigate to `http://localhost:3000/aggregator/companies`
2. Click **Add Company** — modal should open.
3. Fill: Name = `Sunrise Palm Mill`, Code = `MY-SR-003`, Location = `Kuala Lumpur`, Country = `Malaysia`
4. Click **Create Company** → `POST /api/companies` → 200
5. Modal closes, new company appears at top of the list without page reload.
6. Click **Cancel** — modal closes with no changes.
7. Submit empty form — browser validation blocks it.

### Step 6: Commit

```bash
git add src/app/(aggregator)/aggregator/companies/page.tsx
git commit -m "feat: wire Add Company button to existing POST /api/companies — inline modal form"
```

---

## Task 6 — End-to-end smoke test: full 3-workflow run

Run through all three workflows in the browser as super admin and confirm each one works end to end.

### 6.1 Create new company

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/aggregator/companies` → click **Add Company** | Modal opens |
| 2 | Fill name + code + country → **Create Company** | POST 200, company appears in list |
| 3 | Reload page | Company still listed |

### 6.2 Create new checklist

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/aggregator/checklists/new` | Form loads with real companies + profiles |
| 2 | Select company, profile, dates → **Create Checklist** | POST 201 |
| 3 | Redirect lands on `.../checklists/{real-id}/review` (not `undefined`) | ✓ |
| 4 | Review page shows checklist with all items listed | ✓ |

### 6.3 Create new audit

| Step | Action | Expected |
|------|--------|----------|
| 1 | On review page (DRAFT) — amber panel visible | ✓ |
| 2 | Enter reason → **Force to UNDER REVIEW** | POST force-status 200, page reloads |
| 3 | Status badge = UNDER REVIEW, audit action panels appear | ✓ |
| 4 | Auditor select shows real auditors from DB | ✓ |
| 5 | Select auditor → **Send to Audit** | POST send-to-audit 200 |
| 6 | Page reloads, status = UNDER AUDIT | ✓ |
| 7 | Auditor panel: Return to Company — enter reason → click | POST return-to-company 200 (not 404) |

### Final commit

```bash
git add -A
git commit -m "test: confirm all 3 super admin workflows pass end-to-end"
```

---

## Notion Tickets to Create After Plan is Approved

| Title | Type | Bug # |
|-------|------|-------|
| `return-to-company` API route returns 404 (named return-to-mill) | Bug | B1 |
| send-to-audit and return-to-company block SUPER_ADMIN with 403 | Bug | B2 |
| Auditor dropdown in review page uses hardcoded fake UUID | Bug | B3 |
| No way to advance DRAFT checklist to UNDER_REVIEW in review page | Bug | B4 |
| "Add Company" button is disabled — POST /api/companies exists but UI not wired | Bug | B5 |
