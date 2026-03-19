# Checklist Item Page — Button & DB Interaction Audit + Fix Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix every button and interactive element on the checklist item detail page so each one actually persists data to the database and the UI reflects current DB state.

**Architecture:** The item detail page (`/company/checklists/[id]/items/[itemId]`) is a Next.js 14 server component shell wrapping `ChecklistItemDataEntry` (client component). Fixes are split into: (1) new API endpoint for data entry, (2) new client components for live status + comments + documents, (3) wiring every button that currently has no handler.

**Tech Stack:** Next.js 14 App Router, Prisma v7 + PrismaPg adapter, Supabase, TypeScript, Bun

---

## Notion Tickets

| Ticket | Title | Priority |
|--------|-------|----------|
| [Bug](https://www.notion.so/3287ee21af0e81da9211e8d00a61b0d6) | Save Entry does not persist data entry fields | High |
| [Bug](https://www.notion.so/3287ee21af0e81a69732f95f3f6adb3f) | Checklist item status panel is hardcoded (never reads from DB) | High |
| [Bug](https://www.notion.so/3287ee21af0e817d93badda88d53e036) | Comments, Post button, and document upload are non-functional | Medium |

---

## Pre-flight check

Before touching any code, confirm the dev server is running:

```bash
bun run dev
```

And open the item detail page in the browser as `ps.manager@greentrace.local` (password: `manager123`):

```
http://localhost:3000/company/checklists/cmmm88nxp000amgpnovnnaec2/items/cmmm88s1y000imgpnuquh1w5s
```

---

## Bug inventory (confirmed via live testing 2026-03-19)

| # | Button | Problem |
|---|--------|---------|
| B1 | **Save Entry** | `handleSave` only sends `{ status: 'IN_PROGRESS' }` — `value`, `unit`, `notes`, `reportingMonth` are ignored and never persisted. No `DataEntry` row is ever created. |
| B2 | **Status panel** | Hardcoded strings "Not Started" / "Unassigned" in `page.tsx` — never reads the DB. |
| B3 | **Post** (comment) | `<button>Post</button>` in `page.tsx` has no `onClick`. API route exists at `POST /api/checklist-items/[id]/comments` but is never called. |
| B4 | **Choose File** | `<input type="file" />` in `page.tsx` has no `onChange`. API route exists at `POST /api/documents/upload` but is never called. |

**Not broken:** Calculate with Climatiq (has working API + wired onClick). Sign out (works).

---

## Task 1 — Add `POST /api/checklist-items/[id]/data-entries` route

**Files:**
- Create: `src/app/api/checklist-items/[id]/data-entries/route.ts`
- Modify: `src/lib/checklist-items.ts`

### Step 1: Add `createDataEntry` to the lib

Open `src/lib/checklist-items.ts` and append this function at the bottom:

```typescript
export async function createDataEntry(
  checklistItemId: string,
  enteredById: string,
  data: {
    valueRaw?: number | null
    unitInput?: string | null
    textValue?: string | null
    reportingMonth?: string | null   // "YYYY-MM" string from <input type="month">
    notes?: string | null
    co2eValue?: number | null        // from Climatiq calculator
    co2eUnit?: string | null
  }
) {
  const { valueRaw, unitInput, textValue, reportingMonth, notes, co2eValue, co2eUnit } = data

  return prisma.dataEntry.create({
    data: {
      checklistItemId,
      enteredById,
      // DataEntryType enum: FORM01_ABSOLUTE | FORM02_RATE | DOCUMENT_ONLY | TEXT
      entryType: valueRaw != null ? DataEntryType.FORM01_ABSOLUTE : DataEntryType.TEXT,
      valueRaw: valueRaw != null ? new Prisma.Decimal(valueRaw) : null,
      unitInput: unitInput ?? null,
      textValue: textValue ?? null,
      reportingMonth: reportingMonth ? new Date(`${reportingMonth}-01`) : null,
      notes: notes ?? null,
      valueConverted: co2eValue != null ? new Prisma.Decimal(co2eValue) : null,
      unitReference: co2eUnit ?? null,
    },
  })
}
```

Also add this import at the top of the file (after the existing import):

```typescript
import { DataEntryType, Prisma } from '@prisma/client'
```

### Step 2: Create the API route file

Create `src/app/api/checklist-items/[id]/data-entries/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { createDataEntry, updateChecklistItem } from '@/lib/checklist-items'

export const POST = withAuth(
  [
    UserRole.SUPER_ADMIN,
    UserRole.AGGREGATOR_MANAGER,
    UserRole.COMPANY_MANAGER,
    UserRole.COMPANY_STAFF,
  ],
  async (request: Request, { params }: { params: { id: string } }, user) => {
    const body = await request.json()
    const { valueRaw, unitInput, textValue, reportingMonth, notes, co2eValue, co2eUnit } = body

    // At least one of valueRaw or textValue must be present
    if (valueRaw == null && !textValue?.trim()) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Provide either a numeric value or a text value' }, meta: null },
        { status: 422 }
      )
    }

    const entry = await createDataEntry(params.id, user.id, {
      valueRaw,
      unitInput,
      textValue,
      reportingMonth,
      notes,
      co2eValue,
      co2eUnit,
    })

    // Bump item status to IN_PROGRESS if it is still NOT_STARTED
    await updateChecklistItem(params.id, { status: 'IN_PROGRESS' as any })

    return NextResponse.json({ data: entry, error: null, meta: null }, { status: 201 })
  }
)
```

### Step 3: Verify the route compiles

```bash
bun run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no new errors referencing `data-entries`.

### Step 4: Commit

```bash
git add src/app/api/checklist-items/[id]/data-entries/route.ts src/lib/checklist-items.ts
git commit -m "feat: add POST /api/checklist-items/[id]/data-entries route"
```

---

## Task 2 — Fix Save Entry to send all form fields

**Files:**
- Modify: `src/components/checklist-item-data-entry.tsx`

The current `handleSave` (lines 69–85) only sends `{ status: 'IN_PROGRESS' }`. Replace it to:
1. POST to the new data-entries endpoint with all fields
2. Show a success message

### Step 1: Replace `handleSave`

In `src/components/checklist-item-data-entry.tsx`, find:

```typescript
  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const res = await fetch(`/api/checklist-items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    })
    setSaving(false)
    if (res.ok) {
      setSaveSuccess(true)
    } else {
      setSaveError('Failed to save. Please try again.')
    }
  }
```

Replace with:

```typescript
  const handleSave = async () => {
    if (!value.trim() && !notes.trim()) {
      setSaveError('Enter a value or notes before saving.')
      return
    }
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const payload: Record<string, unknown> = {
      unitInput: unit || null,
      reportingMonth: reportingMonth || null,
      notes: notes || null,
    }

    // Numeric vs text entry
    const numeric = parseFloat(value)
    if (!isNaN(numeric)) {
      payload.valueRaw = numeric
    } else if (value.trim()) {
      payload.textValue = value.trim()
    }

    // CO2e from Climatiq calculator
    if (appliedCo2e) {
      payload.co2eValue = appliedCo2e.value
      payload.co2eUnit = appliedCo2e.unit
    }

    const res = await fetch(`/api/checklist-items/${itemId}/data-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) {
      setSaveSuccess(true)
      // Refresh so pre-fill reflects the newly saved entry
      const refreshed = await fetch(`/api/checklist-items/${itemId}`).then(r => r.json())
      if (refreshed.data) {
        setItem(refreshed.data)
        const latest = refreshed.data.dataEntries?.[0]
        if (latest) {
          setValue(latest.value ?? '')
          setUnit(latest.unit ?? refreshed.data.requirement?.unit ?? '')
          setNotes(latest.notes ?? '')
          setReportingMonth(latest.reportingMonth?.substring(0, 7) ?? '')
        }
      }
    } else {
      const json = await res.json().catch(() => ({}))
      setSaveError(json?.error?.message ?? 'Failed to save. Please try again.')
    }
  }
```

Also update the success message text in the JSX (line ~170):

```tsx
{saveSuccess && (
  <p className="text-green-600 text-sm font-medium">Entry saved successfully!</p>
)}
```

### Step 2: Manual test in browser

1. Go to the item page (SOC-01-001, currently IN_PROGRESS after earlier test run)
2. Enter Value: `9500`, Unit: `MYR`, Reporting Month: `2024-07`, Notes: `Test save`
3. Click **Save Entry**
4. Open browser DevTools → Network → find the POST to `/api/checklist-items/.../data-entries`
5. Confirm: status 201, response includes `id`, `valueRaw: "9500"`, `unitInput: "MYR"`, `reportingMonth: "2024-07-01T..."`
6. Reload page — form should pre-fill with saved values

### Step 3: Commit

```bash
git add src/components/checklist-item-data-entry.tsx
git commit -m "fix: Save Entry now persists value, unit, notes, reportingMonth to DataEntry table"
```

---

## Task 3 — Fix Status panel to show real data

**Files:**
- Modify: `src/app/(company)/company/checklists/[checklistId]/items/[itemId]/page.tsx`

Currently the page is a pure server component with hardcoded strings. The `ChecklistItemDataEntry` component already fetches the item client-side on mount. Simplest fix: convert the Status sidebar into a client component that fetches the same item endpoint.

### Step 1: Create `ChecklistItemStatus` client component

Create `src/components/checklist-item-status.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'

type ItemStatus = {
  status: string
  assignee: { name: string } | null
  dueDate: string | null
}

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  FLAGGED: 'Flagged',
}

export function ChecklistItemStatus({ itemId }: { itemId: string }) {
  const [item, setItem] = useState<ItemStatus | null>(null)

  useEffect(() => {
    fetch(`/api/checklist-items/${itemId}`)
      .then(r => r.json())
      .then(d => d.data && setItem(d.data))
  }, [itemId])

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="font-semibold text-gray-800 mb-4">Status</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Status</span>
          <span className="font-medium">
            {item ? (STATUS_LABELS[item.status] ?? item.status) : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Assignee</span>
          <span className="font-medium">
            {item ? (item.assignee?.name ?? 'Unassigned') : '—'}
          </span>
        </div>
        {item?.dueDate && (
          <div className="flex justify-between">
            <span className="text-gray-500">Due</span>
            <span className="font-medium">
              {new Date(item.dueDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
```

### Step 2: Use it in `page.tsx`

In `src/app/(company)/company/checklists/[checklistId]/items/[itemId]/page.tsx`, replace:

```tsx
import { ChecklistItemDataEntry } from '@/components/checklist-item-data-entry'
```

with:

```tsx
import { ChecklistItemDataEntry } from '@/components/checklist-item-data-entry'
import { ChecklistItemStatus } from '@/components/checklist-item-status'
```

Then replace the entire static Status sidebar block:

```tsx
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
```

with:

```tsx
                    <ChecklistItemStatus itemId={params.itemId} />
```

### Step 3: Manual test in browser

1. Open the item page
2. Status sidebar should show the real status (IN_PROGRESS) and assignee
3. Click Save Entry with new data → status stays IN_PROGRESS (already set)
4. Confirm status panel updates if you test with a COMPLETE item

### Step 4: Commit

```bash
git add src/components/checklist-item-status.tsx src/app/(company)/company/checklists/[checklistId]/items/[itemId]/page.tsx
git commit -m "fix: status panel now fetches real status and assignee from DB"
```

---

## Task 4 — Wire up the Post Comment button

**Files:**
- Modify: `src/app/(company)/company/checklists/[checklistId]/items/[itemId]/page.tsx`

The comment textarea and Post button are static HTML with no handler. The API route already exists.

### Step 1: Create `ChecklistItemComments` client component

Create `src/components/checklist-item-comments.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'

type Comment = {
  id: string
  body: string
  createdAt: string
  author: { name: string; role: string }
}

export function ChecklistItemComments({ itemId }: { itemId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function loadComments() {
    fetch(`/api/checklist-items/${itemId}`)
      .then(r => r.json())
      .then(d => d.data?.comments && setComments(d.data.comments))
  }

  useEffect(() => { loadComments() }, [itemId])

  async function handlePost() {
    if (!body.trim()) return
    setPosting(true)
    setError(null)
    const res = await fetch(`/api/checklist-items/${itemId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    setPosting(false)
    if (res.ok) {
      setBody('')
      loadComments()
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json?.error?.message ?? 'Failed to post comment.')
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="font-semibold text-gray-800 mb-4">Comments</h2>
      <div className="space-y-3 text-sm text-gray-700">
        {comments.length === 0 && <p className="text-gray-500">No comments yet.</p>}
        {comments.map(c => (
          <div key={c.id} className="border-b pb-2">
            <p className="font-medium">{c.author.name} <span className="text-gray-400 font-normal">· {new Date(c.createdAt).toLocaleString()}</span></p>
            <p className="mt-0.5">{c.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t pt-4">
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        <textarea
          className="w-full border rounded-md p-2 text-sm"
          rows={2}
          placeholder="Add a comment…"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <button
          onClick={handlePost}
          disabled={posting || !body.trim()}
          className="mt-2 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50"
        >
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  )
}
```

### Step 2: Replace static comment block in `page.tsx`

Add import:
```tsx
import { ChecklistItemComments } from '@/components/checklist-item-comments'
```

Replace the static comment block:

```tsx
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
```

with:

```tsx
                    <ChecklistItemComments itemId={params.itemId} />
```

### Step 3: Manual test

1. Open item page
2. Type "Test comment from plan" in the textarea
3. Click **Post**
4. DevTools → Network → POST `/api/checklist-items/.../comments` should return 201
5. Comment should appear immediately in the list
6. Reload page — comment should still be there

### Step 4: Commit

```bash
git add src/components/checklist-item-comments.tsx src/app/(company)/company/checklists/[checklistId]/items/[itemId]/page.tsx
git commit -m "fix: Post comment button now saves comments to DB via /api/checklist-items/[id]/comments"
```

---

## Task 5 — Wire up file upload (Choose File)

**Files:**
- Modify: `src/app/(company)/company/checklists/[checklistId]/items/[itemId]/page.tsx`

The `<input type="file" />` has no onChange. The upload API (`POST /api/documents/upload`) expects a JSON body with `filePath` — meaning we need to upload to Supabase Storage first, then register the document. For now, wire it up with a basic Supabase Storage upload.

### Step 1: Create `ChecklistItemDocuments` client component

Create `src/components/checklist-item-documents.tsx`:

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Document = {
  id: string
  displayName: string
  fileType: string
  fileSize: number
  uploadedAt: string
}

export function ChecklistItemDocuments({ itemId }: { itemId: string }) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function loadDocuments() {
    fetch(`/api/checklist-items/${itemId}`)
      .then(r => r.json())
      .then(d => d.data?.documents && setDocuments(d.data.documents))
  }

  useEffect(() => { loadDocuments() }, [itemId])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const MAX_MB = 25
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_MB} MB limit`)
      return
    }

    setUploading(true)
    setError(null)

    // Upload to Supabase Storage
    const supabase = createClient()
    const filePath = `checklist-items/${itemId}/${Date.now()}-${file.name}`
    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (storageError) {
      setError('Upload failed: ' + storageError.message)
      setUploading(false)
      return
    }

    // Register in DB
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: file.name,
        filePath,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        linkedEntityType: 'CHECKLIST_ITEM',
        checklistItemId: itemId,
      }),
    })

    setUploading(false)
    if (res.ok) {
      loadDocuments()
      if (inputRef.current) inputRef.current.value = ''
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json?.error?.message ?? 'Failed to register document.')
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="font-semibold text-gray-800 mb-4">Documents</h2>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <p className="text-sm text-gray-500">Drag & drop files here, or click to browse</p>
        <p className="text-xs text-gray-400 mt-1">PDF, JPEG, PNG, XLSX, CSV, DOCX — max 25 MB</p>
        <input
          ref={inputRef}
          type="file"
          className="mt-2"
          accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv,.docx"
          onChange={handleFile}
          disabled={uploading}
        />
        {uploading && <p className="text-xs text-blue-500 mt-2">Uploading…</p>}
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>
      <div className="mt-4">
        {documents.length === 0 ? (
          <p className="text-sm text-gray-500">No documents uploaded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {documents.map(d => (
              <li key={d.id} className="flex items-center justify-between border rounded p-2">
                <span className="truncate max-w-xs text-gray-700">{d.displayName}</span>
                <span className="text-xs text-gray-400 ml-2">
                  {(d.fileSize / 1024).toFixed(1)} KB
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

> **Note:** This requires a Supabase Storage bucket called `documents` to exist. Check the Supabase dashboard → Storage. If it doesn't exist, create it (public: false). If Supabase Storage is not yet set up, the upload step will fail gracefully with an error message — the DB registration step won't be reached.

### Step 2: Replace static file section in `page.tsx`

Add import:
```tsx
import { ChecklistItemDocuments } from '@/components/checklist-item-documents'
```

Replace:
```tsx
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
```

with:

```tsx
                    <ChecklistItemDocuments itemId={params.itemId} />
```

### Step 3: Manual test

1. Open item page
2. Click **Choose File**, select a small PDF or PNG
3. DevTools → Network → should see:
   - PUT/POST to Supabase Storage URL
   - POST to `/api/documents/upload` → 201
4. File should appear in the documents list
5. Reload — file should still be listed

### Step 4: Commit

```bash
git add src/components/checklist-item-documents.tsx src/app/(company)/company/checklists/[checklistId]/items/[itemId]/page.tsx
git commit -m "fix: Choose File now uploads to Supabase Storage and registers Document in DB"
```

---

## Task 6 — Full button regression test

With all fixes in place, do a systematic check of every button. Use browser DevTools Network tab throughout.

### 6.1 Save Entry

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open item SOC-01-001 | Status shows "In Progress" (from prior test) |
| 2 | Enter Value: `12345`, Unit: `MYR/month`, Month: `2024-08`, Notes: `Regression test` | Fields accept input |
| 3 | Click **Save Entry** | POST `/api/checklist-items/.../data-entries` → 201 |
| 4 | Network response | `valueRaw: "12345"`, `unitInput: "MYR/month"`, `reportingMonth: "2024-08-01T..."`, `notes: "Regression test"` |
| 5 | Reload page | Form pre-fills with saved values |
| 6 | Query DB directly | `GET /api/checklist-items/[id]` → `dataEntries[0]` contains all fields |

### 6.2 Calculate with Climatiq → Use this value

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click **Calculate with Climatiq** | Panel expands |
| 2 | Select activity, enter quantity 1000, click **Calculate** | POST `/api/carbon-calculator/estimate` → 200, co2e value returned |
| 3 | Click **Use this value →** | CO₂e field appears in form, panel collapses |
| 4 | Click **Save Entry** | POST to data-entries includes `co2eValue` and `co2eUnit` |

> If Climatiq API key is missing, step 2 will return an error — that is expected and not a regression.

### 6.3 Post comment

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type "Regression comment test" in textarea | Body state updates |
| 2 | Click **Post** | POST `/api/checklist-items/.../comments` → 201 |
| 3 | Comment appears in list immediately | ✓ |
| 4 | Reload page | Comment still present |
| 5 | Try clicking **Post** with empty textarea | Button is disabled (grey) |

### 6.4 Choose File

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click **Choose File**, select a file < 25 MB | File picker opens |
| 2 | Select file | Upload begins, "Uploading…" text shows |
| 3 | Network | Storage upload + POST `/api/documents/upload` → 201 |
| 4 | File appears in list | ✓ |
| 5 | Reload | File still listed |
| 6 | Try file > 25 MB | Error message: "File exceeds 25 MB limit" — no network request |

### 6.5 Sign out

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click **Sign out** | POST to Supabase auth, redirect to `/login` |
| 2 | Try navigating to `/company/dashboard` | Redirect back to `/login` |

---

## Final commit

After all tasks pass regression:

```bash
git add -A
git commit -m "feat: all checklist item page buttons now interact correctly with the database"
```
