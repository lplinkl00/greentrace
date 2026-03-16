# Full App Testing Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Systematically test every page and major user flow in GreenTrace, capture all bugs, then fix them.

**Architecture:** Browser-based functional testing using the browse skill against the local dev server (port 3000). Tests cover auth, role-based routing, page rendering, API calls, and interactive features.

**Tech Stack:** Next.js 14, Supabase auth, Prisma v7, bun dev server on port 3000

---

## Phase 1: Environment Setup

### Task 1: Start dev server

**Step 1: Start server**
```bash
cd "D:\Claude Code" && bun run dev
```
Expected: "Ready on http://localhost:3000"

**Step 2: Verify server is up**

Navigate to `http://localhost:3000` — expect landing page to load.

---

## Phase 2: Auth Flow Testing

### Task 2: Test landing page (`/`)

- Visit `http://localhost:3000`
- Verify: Hero, features section, CTA buttons visible
- Verify: "Login" and "Sign Up" buttons/links present

### Task 3: Test login page (`/login`)

- Visit `http://localhost:3000/login`
- Verify: Form renders with email + password fields
- Test empty submit → expect validation error
- Test invalid credentials → expect error message
- Test valid login (admin@greentrace.local / admin123) → expect redirect to `/aggregator/dashboard`

### Task 4: Test role-based login redirects

| Email | Expected redirect |
|---|---|
| admin@greentrace.local | /aggregator/dashboard |
| manager@greentrace.local | /aggregator/dashboard |
| ps.manager@greentrace.local | /mill/dashboard |
| ps.staff@greentrace.local | /mill/dashboard |
| auditor@greentrace.local | /auditor/dashboard |

### Task 5: Test signup page (`/signup`)

- Visit `/signup`
- Verify form renders
- Verify submit with empty fields shows validation

### Task 6: Test reset password page (`/reset-password`)

- Visit `/reset-password`
- Verify form renders with email field

### Task 7: Test logout

- Login as admin, then trigger logout
- Verify redirect to `/login`
- Verify protected pages redirect to `/login` after logout

---

## Phase 3: Aggregator Section Testing

### Task 8: Aggregator dashboard (`/aggregator/dashboard`)

**Login as:** admin@greentrace.local / admin123

- Visit `/aggregator/dashboard`
- Verify stats cards load: Total Compliance %, Pending Audits, High-Risk Suppliers, Total GHG
- Verify certification expiry table renders with rows
- Verify no console errors

### Task 9: Mills list page (`/aggregator/mills`)

- Visit `/aggregator/mills`
- Verify: Table with mill rows (Palm Star Mill, Green Valley Mill)
- Verify: Add Mill button visible
- Click a mill row → verify navigation to `/aggregator/mills/[millId]`

### Task 10: Mill detail page (`/aggregator/mills/[millId]`)

- Visit the mill detail page for Palm Star Mill
- Verify: Mill info displayed (name, code, location)
- Verify: Checklists listed

### Task 11: Checklist view from aggregator

- Navigate to a checklist from mill detail
- Verify checklist items render
- Verify mass-balance link works

### Task 12: Users management (`/aggregator/users`)

- Visit `/aggregator/users`
- Verify: Users table renders
- Verify: Invite/Add User button visible

### Task 13: Regulation profiles (`/aggregator/regulation-profiles`)

- Visit `/aggregator/regulation-profiles`
- Verify: List of regulation profiles (RSPO, MSPO, ISPO) renders
- Click a profile → verify detail page loads

### Task 14: Aggregator checklists (`/aggregator/checklists`)

- Visit `/aggregator/checklists`
- Verify: Checklists table renders across all mills

### Task 15: Aggregator settings (`/aggregator/settings`)

- Visit `/aggregator/settings`
- Verify page loads without error

---

## Phase 4: Mill Section Testing

### Task 16: Mill dashboard (`/mill/dashboard`)

**Login as:** ps.manager@greentrace.local / manager123

- Visit `/mill/dashboard`
- Verify: Stats cards render (Traceability Score, Pending Data Points, GHG Intensity, Action Items)
- Verify: Pillar completion progress bars visible
- Verify: No console errors

### Task 17: Mill checklists list (`/mill/checklists`)

- Visit `/mill/checklists`
- Verify: Checklists table with regulation, period, status columns
- Click a checklist → verify navigation to detail page

### Task 18: Mill checklist detail (`/mill/checklists/[checklistId]`)

- Visit a checklist detail page
- Verify: Items listed with status indicators
- Click an item → verify navigation to item detail

### Task 19: Checklist item detail (`/mill/checklists/[checklistId]/items/[itemId]`)

- Visit a checklist item
- Verify: Data entry fields rendered
- Verify: Comment submission works (or shows error if not implemented)

### Task 20: Mass balance (`/mill/checklists/[checklistId]/mass-balance`)

- Visit mass balance page
- Verify: CPO, PKO, PKE entries render
- Verify: Discrepancy flag visible on PKE (as seeded)

### Task 21: Imports list (`/mill/imports`)

- Visit `/mill/imports`
- Verify: Import jobs table renders (2 jobs: COMPLETED, PARTIAL_SUCCESS)
- Verify: Success rate progress bars show
- Verify: "New Import" button visible

### Task 22: New import (`/mill/imports/new`)

- Visit `/mill/imports/new`
- Verify: Upload form/wizard renders

### Task 23: Shipments (`/mill/shipments`)

- Visit `/mill/shipments`
- Verify: Shipment table renders (11 shipments seeded)
- Verify: Filters visible (Material type, year, month)
- Verify: Certified/Non-Certified status shown
- Test material type filter

### Task 24: Production (`/mill/production`)

- Visit `/mill/production`
- Verify page loads without error

### Task 25: Mill settings (`/mill/settings`)

- Visit `/mill/settings`
- Verify page loads without error

---

## Phase 5: Auditor Section Testing

### Task 26: Auditor dashboard (`/auditor/dashboard`)

**Login as:** auditor@greentrace.local / auditor123

- Visit `/auditor/dashboard`
- Verify: Stats (Audits Completed, Pending Reviews, Avg Completion Time / Total Findings)
- Verify: Audit Queue renders
- Verify: Draft Reports section renders

### Task 27: Auditor audits list (`/auditor/audits`)

- Visit `/auditor/audits`
- Verify: Audits table (PS 2023 PUBLISHED, PS 2024 SCHEDULED)
- Verify: Status badges correct colors/labels
- Click an audit → verify detail page loads

### Task 28: Audit detail (`/auditor/audits/[auditId]`)

- Visit PS 2023 audit detail
- Verify: Audit info (mill, regulation, period, status)
- Verify: Findings listed (5 findings seeded)

### Task 29: Audit report (`/auditor/audits/[auditId]/report`)

- Visit the audit report page for PS 2023
- Verify: Report content renders
- Verify: Export PDF button visible

### Task 30: Auditor mills (`/auditor/mills`)

- Visit `/auditor/mills`
- Verify page loads with mills list

### Task 31: Auditor reports (`/auditor/reports`)

- Visit `/auditor/reports`
- Verify: Reports list renders

### Task 32: Auditor settings (`/auditor/settings`)

- Visit `/auditor/settings`
- Verify page loads

---

## Phase 6: Role-Based Access Control Testing

### Task 33: Test unauthorized access

- While logged in as MILL_MANAGER, try to visit `/aggregator/dashboard`
- Expect: Redirect to `/mill/dashboard` or 403 error
- While logged in as AUDITOR, try to visit `/mill/dashboard`
- Expect: Redirect or 403

### Task 34: Test unauthenticated access

- Log out, then visit `/aggregator/dashboard`
- Expect: Redirect to `/login`

---

## Phase 7: API Endpoint Spot-Checks

### Task 35: Key API endpoints

Test via browser network tab or direct navigation:
- `GET /api/mills` → expect JSON array
- `GET /api/checklists` → expect JSON array
- `GET /api/audits` → expect JSON array
- `GET /api/shipments` → expect JSON array
- `GET /api/imports` → expect JSON array

---

## Phase 8: Cross-Cutting Concerns

### Task 36: Sidebar navigation

- Verify sidebar renders correct links for each role
- Verify active state highlights current page
- Verify no broken links

### Task 37: Error states

- Visit non-existent route e.g. `/aggregator/mills/nonexistent`
- Expect: 404 page or graceful error

---

## Bug Reporting

**Output file:** `docs/bugs/2026-03-16-bug-report.md`

Format each bug as:
```markdown
## BUG-XXX: [Title]
**Severity:** Critical / High / Medium / Low
**Page:** /path/to/page
**Steps to reproduce:**
1. ...
**Expected:** ...
**Actual:** ...
**Notes:** ...
```

---

## Fix Plan

After bug report is complete, create fix plan at: `docs/plans/2026-03-16-bug-fixes.md`
