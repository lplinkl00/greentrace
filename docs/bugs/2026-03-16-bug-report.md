# GreenTrace Bug Report — 2026-03-16

**Tested by:** Claude Code automated review + API testing
**Test date:** 2026-03-16
**Scope:** All pages and API endpoints across aggregator, mill, and auditor sections
**Method:** Source code review, HTTP API testing with each role's session cookie, functional review

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 4 |
| High | 7 |
| Medium | 4 |
| Low | 1 |
| **Total** | **16** |

---

## Critical Bugs

### BUG-001: ChecklistItemDataEntry component is completely disconnected from real data

**Severity:** Critical
**Page:** `/mill/checklists/[checklistId]/items/[itemId]`
**Files:**
- `src/app/(mill)/mill/checklists/[checklistId]/items/[itemId]/page.tsx:20`
- `src/components/checklist-item-data-entry.tsx`

**Steps to reproduce:**
1. Login as ps.manager@greentrace.local
2. Navigate to `/mill/checklists`
3. Click a checklist → click any item

**Expected:** Form shows the item's actual requirement name, current value, status — and can save data to the API.
**Actual:** `<ChecklistItemDataEntry />` is rendered with **zero props**. The component has hardcoded static dropdowns (e.g., "FORM01 — Absolute Quantity"), a blank number input, and no submit logic. It never fetches the item's data (`/api/checklist-items/[id]`) and never saves anything.

**Notes:** The item `id` and `checklistId` are available in `params` but neither is passed to the component. This page is completely non-functional for data entry.

---

### BUG-002: `/aggregator/mills/[millId]` is a stub page

**Severity:** Critical
**Page:** `/aggregator/mills/[millId]`
**File:** `src/app/(aggregator)/aggregator/mills/[millId]/page.tsx`

**Steps to reproduce:**
1. Login as admin@greentrace.local
2. Navigate to `/aggregator/mills/cmmm87ywo0001mgpnupolfpbj`

**Expected:** Mill detail page with mill name, code, location, checklists, certification status, etc.
**Actual:** Page renders "Mill [millId]" and the string "Mill details" — hardcoded placeholder. No API calls, no real data.

---

### BUG-003: Mill rows in `/aggregator/mills` have no navigation

**Severity:** Critical
**Page:** `/aggregator/mills`
**File:** `src/app/(aggregator)/aggregator/mills/page.tsx:65-103`

**Steps to reproduce:**
1. Login as admin@greentrace.local
2. Navigate to `/aggregator/mills`
3. Click any mill row

**Expected:** Navigate to `/aggregator/mills/[millId]` to see mill details.
**Actual:** Nothing happens. Mill rows are `<tr>` elements with no `onClick` or `<Link>` wrapper. The mill detail page exists but is completely unreachable from the UI.

---

### BUG-004: `/mill/imports/new` is a non-functional mockup

**Severity:** Critical
**Page:** `/mill/imports/new`
**File:** `src/app/(mill)/mill/imports/new/page.tsx`

**Steps to reproduce:**
1. Login as ps.manager@greentrace.local
2. Navigate to `/mill/imports/new`

**Expected:** A working file upload wizard — select file, upload to `/api/imports/upload`, map columns, process.
**Actual:** Completely static hardcoded mockup with fake select dropdowns and no real form submission. No API calls whatsoever. Dropdown options are hardcoded strings ("Delivery Date", "Ticket No") that don't come from the actual uploaded file.

---

## High Severity Bugs

### BUG-005: Action buttons are non-functional stubs (3 locations)

**Severity:** High
**Pages:** `/aggregator/mills`, `/aggregator/users`, `/mill/shipments`
**Files:**
- `src/app/(aggregator)/aggregator/mills/page.tsx:39-44` — "Add Mill" button
- `src/app/(aggregator)/aggregator/users/page.tsx:54-59` — "Invite User" button
- `src/app/(mill)/mill/shipments/page.tsx:59-64` — "Add New Record" button

**Steps to reproduce:**
1. Navigate to any of the above pages
2. Click the respective action button

**Expected:** Opens a form/modal to perform the action.
**Actual:** Buttons are plain `<button>` elements with no `onClick` handlers, no routing, no modals. Clicks are silently swallowed.

---

### BUG-006: "New Import" button on `/mill/imports` not linked to the import page

**Severity:** High
**Page:** `/mill/imports`
**File:** `src/app/(mill)/mill/imports/page.tsx:32-36`

**Steps to reproduce:**
1. Login as ps.manager@greentrace.local
2. Navigate to `/mill/imports`
3. Click "New Import" button

**Expected:** Navigate to `/mill/imports/new`.
**Actual:** Button is a plain `<button>` with no `onClick` or `href`. Nothing happens. The `/mill/imports/new` page exists but is unreachable from the UI.

---

### BUG-007: Missing `.catch()` on fetch calls — pages hang on API failure

**Severity:** High
**Pages:** 6+ pages affected

| Page | File | Line |
|------|------|------|
| `/aggregator/dashboard` | `src/app/(aggregator)/aggregator/dashboard/page.tsx` | 52-56 |
| `/aggregator/mills` | `src/app/(aggregator)/aggregator/mills/page.tsx` | 20-24 |
| `/aggregator/users` | `src/app/(aggregator)/aggregator/users/page.tsx` | 35-39 |
| `/aggregator/checklists` | `src/app/(aggregator)/aggregator/checklists/page.tsx` | 28-35 |
| `/aggregator/regulation-profiles` | `src/app/(aggregator)/aggregator/regulation-profiles/page.tsx` | 25-32 |
| `/mill/checklists` | `src/app/(mill)/mill/checklists/page.tsx` | 28-32 |
| `/auditor/dashboard` | `src/app/(auditor)/auditor/dashboard/page.tsx` | 38-42 |

**Steps to reproduce:**
1. Kill the dev server or block network requests
2. Load any of the above pages

**Expected:** Error state shown to user.
**Actual:** Page shows the loading spinner indefinitely. The fetch Promise rejects but there's no `.catch()` to set `loading = false` or show an error. The spinner never stops.

---

### BUG-008: `/api/checklists/[id]/validate` returns 403 for SUPER_ADMIN/AGGREGATOR_MANAGER

**Severity:** High
**File:** `src/app/api/checklists/[id]/validate/route.ts:6`

**Steps to reproduce:**
1. Login as admin@greentrace.local (SUPER_ADMIN)
2. `GET /api/checklists/cmmm88oyd000bmgpnnmbo5cme/validate`

**Expected:** Returns validation result (is checklist ready to submit).
**Actual:** Returns `403 Forbidden`. The route only allows `MILL_MANAGER` and `MILL_STAFF`. Any aggregator admin viewing a DRAFT checklist cannot validate it — and any future aggregator-facing checklist detail page that calls validate would silently fail.

---

### BUG-009: Validate fetch in checklist detail has no error handling

**Severity:** High
**Page:** `/mill/checklists/[checklistId]`
**File:** `src/app/(mill)/mill/checklists/[checklistId]/page.tsx:24-34`

```js
// Lines 24-34 — no .catch()
if (data.data?.status === 'DRAFT') {
    fetch(`/api/checklists/${params.checklistId}/validate`)
        .then(res => res.json())
        .then(valData => {
            if (!valData.data.isValid) { ... }  // crashes if data is null
        })
    // no .catch() here
}
```

**Expected:** Gracefully handles API failure during validation.
**Actual:** If the validate API fails or returns an error, `valData.data.isValid` will throw a TypeError (cannot read property of null). The submit button will also remain disabled due to `validation` staying null.

---

### BUG-010: `alert()` used for submission feedback in checklist detail

**Severity:** High
**Page:** `/mill/checklists/[checklistId]`
**File:** `src/app/(mill)/mill/checklists/[checklistId]/page.tsx:44,50`

**Steps to reproduce:**
1. Login as ps.manager@greentrace.local
2. Navigate to a DRAFT checklist
3. Click "Submit to Aggregator"

**Expected:** Toast notification or in-page success/error message.
**Actual:** Native browser `alert()` popups. These block the UI, look unprofessional, are not dismissable via Escape on all browsers, and break the app's visual design system.

---

### BUG-011: `alert()` also used in aggregator checklist review page

**Severity:** High
**Page:** `/aggregator/mills/[millId]/checklists/[checklistId]/review`
**File:** `src/app/(aggregator)/aggregator/mills/[millId]/checklists/[checklistId]/review/page.tsx:28`

**Steps to reproduce:** Trigger the "Return to Mill" action with an empty reason field.
**Actual:** `alert('Please enter a reason.')` — same native alert issue as BUG-010.

---

## Medium Severity Bugs

### BUG-012: Inconsistent UI styling — old Tailwind vs design system

**Severity:** Medium
**Pages affected:**
- `/aggregator/checklists` — uses `bg-gray-50`, `divide-gray-200`, `text-gray-900` etc.
- `/aggregator/regulation-profiles` — uses `bg-gray-50`, `shadow`, old heading styles
- `/mill/checklists/[checklistId]` — old `bg-blue-100`, `bg-green-600`, `bg-red-50` classes
- `/auditor/audits/[auditId]` — status colors use `bg-blue-100 text-blue-800` Tailwind classes
- `/mill/checklists/[checklistId]/items/[itemId]` — old `bg-white shadow rounded-lg` pattern

**Expected:** All pages use the design system (inline `style={}` with zinc/orange palette, `shadow-card`, `rounded-xl`, `border-zinc-100`).
**Actual:** About 5-6 pages still use an older Tailwind class-based design, making the UI visually inconsistent across roles and pages.

---

### BUG-013: Unstyled loading/error states in checklist detail

**Severity:** Medium
**Page:** `/mill/checklists/[checklistId]`
**File:** `src/app/(mill)/mill/checklists/[checklistId]/page.tsx:54-55`

```jsx
if (loading) return <div>Loading...</div>
if (!checklist) return <div>Not found.</div>
```

**Expected:** Styled spinner matching the rest of the app (orange animated ring, centered in page).
**Actual:** Raw unstyled text. No spinner, no icon, no padding — just bare text in the top-left corner.

---

### BUG-014: Missing `MSPO` in `REGULATION_LABELS` on mill checklists page

**Severity:** Medium
**Page:** `/mill/checklists`
**File:** `src/app/(mill)/mill/checklists/page.tsx:16-22`

The `STATUS` map is defined but `REGULATION_LABELS` is absent — regulations are displayed raw (e.g. "ISCC_EU" instead of "ISCC EU"). While the page does call `.replace(/_/g, ' ')`, specific label mappings like "RSPO PC" vs "RSPO_PC" would display differently depending on implementation. The aggregator checklists page also doesn't have a regulation label map.

---

### BUG-015: GHG total always shows 0 on portfolio dashboard

**Severity:** Medium
**Page:** `/aggregator/dashboard`
**API:** `GET /api/dashboard/portfolio`

**Steps to reproduce:**
1. Login as admin@greentrace.local
2. View `/aggregator/dashboard`

**Expected:** Total GHG shown across all certified mills (same data as mill dashboard shows 3,812,660 kg CO₂e).
**Actual:** "Total GHG" stat card shows 0. The `getPortfolioStats()` function in `src/lib/dashboard.ts:48-55` only sums `valueConverted` from CERTIFIED checklists, but none of the certified checklist items in seed data have `valueConverted` populated — GHG data exists only in the SUBMITTED checklist.

---

## Low Severity Bugs

### BUG-016: Regulation profiles page has no "Create" button

**Severity:** Low
**Page:** `/aggregator/regulation-profiles`
**File:** `src/app/(aggregator)/aggregator/regulation-profiles/page.tsx`

**Expected:** A button to create a new regulation profile (since the aggregator manages these).
**Actual:** No create/add button anywhere on the page. The header only shows "Regulation Profiles" with no actions. Creating new profiles requires direct API calls.

---

## Bugs Intentionally Excluded

The following were noted but not filed as they are likely out of scope or are design decisions:

- `any` TypeScript types in several pages (typing issue, not functional bug)
- Stub pages for `/auditor/mills`, `/auditor/reports`, `/auditor/settings`, `/aggregator/settings`, `/mill/settings` — these appear to be in-progress placeholder pages, content is appropriate for their state
- Missing `NEEDS_MAPPING` status handler in checklist detail (import status, not checklist status)

---

## API Health Summary

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /api/auth/login` | ✅ 200 | Works for all roles |
| `GET /api/mills` | ✅ 200 | Returns 2 mills |
| `GET /api/checklists` | ✅ 200 | Returns all checklists |
| `GET /api/audits` | ✅ 200 | Returns both audits |
| `GET /api/shipments` | ⚠️ 422 without `millId` | Requires millId param |
| `GET /api/imports` | ⚠️ 422 without `millId` | Requires millId param |
| `GET /api/production` | ⚠️ 422 without `millId` | Requires millId param |
| `GET /api/mass-balance` | ⚠️ 422 without `checklistId` | Requires checklistId param |
| `GET /api/dashboard/portfolio` | ✅ 200 | Data correct (GHG is 0 per BUG-015) |
| `GET /api/dashboard/auditor` | ✅ 200 | Returns stats correctly |
| `GET /api/dashboard/mill/current` | ✅ 200 | Returns mill stats correctly |
| `GET /api/checklists/[id]/validate` | ⚠️ 403 for SUPER_ADMIN | BUG-008 |
| `GET /api/regulation-profiles` | ✅ 200 | Returns profiles |
| `GET /api/users` | ✅ 200 | Returns all users |
| `GET /api/emission-factors` | ✅ 200 | Returns seeded factors |
| `GET /api/audit-findings` | ⚠️ 400 without `auditId` | Requires auditId param |
