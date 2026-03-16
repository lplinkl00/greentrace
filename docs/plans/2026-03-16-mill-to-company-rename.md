# Mill → Company Rename Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename the `Mill` concept to `Company` across database schema, API/lib layer, and UI/routes — three independently testable layers.

**Architecture:** Layer-by-layer rename (schema first → API/lib second → UI/routes third). Each layer is committed and build-verified before moving to the next. Prisma model rename uses a hand-authored SQL migration (ALTER TABLE RENAME) to preserve all data.

**Tech Stack:** Next.js 14, Prisma v7 + PrismaPg adapter, Supabase, TypeScript, Bun

---

## Context

- Prisma schema lives at `prisma/schema.prisma`
- Migrations: `prisma/migrations/` — run with `bun run db:migrate` (`prisma migrate dev`)
- Seed: `bun run db:seed` (idempotent, safe to re-run)
- Build check: `bun run build` (TypeScript + Next.js compile — no separate test suite)
- The `UserRole` enum has `MILL_MANAGER` and `MILL_STAFF` — these are stored in both the DB and in Supabase `auth.users.raw_user_meta_data.role`
- `SUPER_ADMIN` users pick a company to impersonate via cookies: `activeView=company` and `activeCompanyId=<id>`

---

## LAYER 1 — Schema + Migration

### Task 1: Update `prisma/schema.prisma`

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Rename the UserRole enum values**

Find:
```prisma
enum UserRole {
  SUPER_ADMIN
  AGGREGATOR_MANAGER
  MILL_MANAGER
  MILL_STAFF
  AUDITOR
}
```
Replace with:
```prisma
enum UserRole {
  SUPER_ADMIN
  AGGREGATOR_MANAGER
  COMPANY_MANAGER
  COMPANY_STAFF
  AUDITOR
}
```

**Step 2: Rename `model Mill` to `model Company`**

Find: `model Mill {`
Replace with: `model Company {`

**Step 3: Update the `Organisation` model's back-relation**

Find: `mills       Mill[]`
Replace with: `companies   Company[]`

**Step 4: Update the `User` model**

Find:
```prisma
  // Exactly one of organisationId or millId must be set, enforced at app level.
  // Super Admin and Aggregator Manager belong to the Organisation; mill roles belong to a Mill.
  organisationId   String?
  organisation     Organisation? @relation(fields: [organisationId], references: [id])
  millId           String?
  mill             Mill?    @relation(fields: [millId], references: [id])
```
Replace with:
```prisma
  // Exactly one of organisationId or companyId must be set, enforced at app level.
  // Super Admin and Aggregator Manager belong to the Organisation; company roles belong to a Company.
  organisationId   String?
  organisation     Organisation? @relation(fields: [organisationId], references: [id])
  companyId        String?
  company          Company? @relation(fields: [companyId], references: [id])
```

Find: `@@index([millId])`  (in the User model — line ~262)
Replace with: `@@index([companyId])`

**Step 5: Update the `Checklist` model**

Replace every occurrence of:
- `millId            String` → `companyId         String`
- `mill              Mill` → `company           Company`
- `@@unique([millId,` → `@@unique([companyId,`
- `@@index([millId,` → `@@index([companyId,`

**Step 6: Repeat Step 5 for these models** (same find/replace pattern):
- `MassBalanceEntry` (line ~491)
- `ShipmentRecord` (line ~566)
- `Audit` (line ~609)
- `ImportJob` (line ~688)
- `ImportColumnMapping` (line ~717) — only has `millId String`, no relation
- `IntegrationConfig` (line ~736)
- `ProductionRecord` (line ~789)

**Step 7: Update schema comments that mention "mill"**

Search schema for remaining lowercase `mill` references in comments and update them:
- `// Guidance for mill staff on how to complete it` → `// Guidance for company staff on how to complete it`
- `// User who submitted (Mill Manager)` → `// User who submitted (Company Manager)`
- `// Sub-mill location granularity` → `// Sub-company location granularity`
- `// mill roles belong to a Mill` → already updated in Step 4

**Step 8: Verify the schema compiles**

Run: `bunx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid`

---

### Task 2: Create the data migration

**Files:**
- Create: `prisma/migrations/20260316120000_mill_to_company/migration.sql`

**Step 1: Generate the migration stub**

Run:
```bash
bun run db:migrate --create-only --name mill_to_company
```
This creates `prisma/migrations/<timestamp>_mill_to_company/migration.sql` with Prisma's auto-generated SQL (which will be DROP+CREATE — **do not apply it yet**).

**Step 2: Replace the generated SQL entirely**

Open the generated `migration.sql` and replace its entire contents with:

```sql
-- Rename Mill table to Company
ALTER TABLE "Mill" RENAME TO "Company";

-- Rename millId FK columns on all related tables
ALTER TABLE "User"                RENAME COLUMN "millId" TO "companyId";
ALTER TABLE "Checklist"           RENAME COLUMN "millId" TO "companyId";
ALTER TABLE "MassBalanceEntry"    RENAME COLUMN "millId" TO "companyId";
ALTER TABLE "ShipmentRecord"      RENAME COLUMN "millId" TO "companyId";
ALTER TABLE "ImportJob"           RENAME COLUMN "millId" TO "companyId";
ALTER TABLE "ImportColumnMapping" RENAME COLUMN "millId" TO "companyId";
ALTER TABLE "IntegrationConfig"   RENAME COLUMN "millId" TO "companyId";
ALTER TABLE "Audit"               RENAME COLUMN "millId" TO "companyId";
ALTER TABLE "ProductionRecord"    RENAME COLUMN "millId" TO "companyId";

-- Rename UserRole enum values
ALTER TYPE "UserRole" RENAME VALUE 'MILL_MANAGER' TO 'COMPANY_MANAGER';
ALTER TYPE "UserRole" RENAME VALUE 'MILL_STAFF'   TO 'COMPANY_STAFF';

-- Update Supabase auth user_metadata for existing users
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"COMPANY_MANAGER"')
WHERE raw_user_meta_data->>'role' = 'MILL_MANAGER';

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"COMPANY_STAFF"')
WHERE raw_user_meta_data->>'role' = 'MILL_STAFF';
```

**Step 3: Apply the migration**

Run: `bun run db:migrate`
Expected: `The following migration(s) have been applied: mill_to_company`

If Prisma complains about schema drift, run:
```bash
bunx prisma migrate resolve --applied 20260316120000_mill_to_company
```
Then re-run `bun run db:migrate`.

---

### Task 3: Update `prisma/seed.ts`

**Files:**
- Modify: `prisma/seed.ts`

**Step 1: Update Prisma client calls**

Find and replace all occurrences (case-sensitive):
- `prisma.mill.` → `prisma.company.`
- `UserRole.MILL_MANAGER` → `UserRole.COMPANY_MANAGER`
- `UserRole.MILL_STAFF` → `UserRole.COMPANY_STAFF`
- `millId:` → `companyId:`
- `millId_` (in compound unique key names like `millId_profileId_periodStart_periodEnd`) → `companyId_`

**Step 2: Update variable names for readability** (optional but recommended)

- `const palmStar = await prisma.mill.upsert(` → `const palmStar = await prisma.company.upsert(`
- Step 3 comment: `// STEP 3 — Mills` → `// STEP 3 — Companies`
- `console.log('─── Step 3: Mills ─')` → `console.log('─── Step 3: Companies ─')`
- `console.log(\`  ✓ Mills: ${palmStar.name}...`)` → `console.log(\`  ✓ Companies: ...`)`

**Step 3: Run seed to verify**

Run: `bun run db:seed`
Expected: No errors, all ✓ lines printed

---

### Task 4: Regenerate Prisma client and verify Layer 1 build

**Step 1: Regenerate the Prisma client**

Run: `bunx prisma generate`
Expected: `Generated Prisma Client`

**Step 2: Verify build compiles**

Run: `bun run build`
Expected: Build succeeds (or only pre-existing lint errors, no new TypeScript errors from the schema changes)

Note: After the schema rename, TypeScript will surface every remaining `mill`/`Mill` reference in the codebase as a type error. This is expected — Layers 2 and 3 will resolve them all.

**Step 3: Commit Layer 1**

```bash
git add prisma/schema.prisma prisma/migrations/ prisma/seed.ts
git commit -m "feat: rename Mill → Company in Prisma schema and migration"
```

---

## LAYER 2 — API + Lib

### Task 5: Update `src/lib/auth.ts`

**Files:**
- Modify: `src/lib/auth.ts`

**Step 1: Replace the full file content**

```typescript
import { UserRole } from '@prisma/client'
import { prisma } from './prisma'
import { createClient } from './supabase-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export type SessionUser = {
    id: string
    email: string
    name: string
    role: UserRole
    companyId: string | null
    organisationId: string | null
}

export async function getSessionUser(): Promise<SessionUser | null> {
    const supabase = createClient(cookies())
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

    if (error || !supabaseUser) return null

    const user = await prisma.user.findUnique({
        where: { supabaseUserId: supabaseUser.id }
    })

    if (!user || !user.isActive) return null

    let resolvedCompanyId = user.companyId

    if (user.role === 'SUPER_ADMIN') {
        const cookieStore = cookies()
        const activeCompanyId = cookieStore.get('activeCompanyId')?.value
        if (activeCompanyId) resolvedCompanyId = activeCompanyId
    }

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: resolvedCompanyId,
        organisationId: user.organisationId,
    }
}

/**
 * Higher-order function to protect API routes with role-based access control.
 */
export function withAuth(
    roles: UserRole[],
    handler: (request: Request, context: any, user: SessionUser) => Promise<NextResponse> | NextResponse
) {
    return async (request: Request, context: any) => {
        const user = await getSessionUser()
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        if (!roles.includes(user.role)) {
            return new NextResponse('Forbidden', { status: 403 })
        }

        return handler(request, context, user)
    }
}
```

---

### Task 6: Update `src/middleware.ts`

**Files:**
- Modify: `src/middleware.ts`

**Step 1: Replace all mill references**

Find: `activeView === 'mill'`  (2 occurrences)
Replace with: `activeView === 'company'`

Find: `return NextResponse.redirect(new URL('/mill/dashboard', request.url))` (2 occurrences)
Replace with: `return NextResponse.redirect(new URL('/company/dashboard', request.url))`

---

### Task 7: Move the `/api/mills` route

**Files:**
- Create: `src/app/api/companies/route.ts` (copy of `src/app/api/mills/route.ts`)
- Delete: `src/app/api/mills/route.ts`

**Step 1: Move the file**

```bash
mv "src/app/api/mills/route.ts" "src/app/api/companies/route.ts"
```
(Create the `companies/` directory first if needed)

**Step 2: Update the content of `src/app/api/companies/route.ts`**

Replace all occurrences of:
- `prisma.mill.` → `prisma.company.`
- `millId` → `companyId`
- `mill` (variable names) → `company`

---

### Task 8: Move the `/api/dashboard/mill/[millId]` route

**Files:**
- Create: `src/app/api/dashboard/company/[companyId]/route.ts`
- Delete: `src/app/api/dashboard/mill/[millId]/route.ts`

**Step 1: Move the file**

```bash
mkdir -p "src/app/api/dashboard/company/[companyId]"
mv "src/app/api/dashboard/mill/[millId]/route.ts" "src/app/api/dashboard/company/[companyId]/route.ts"
```

**Step 2: Update references inside the file**

Replace all occurrences of:
- `millId` → `companyId` (params, variables, Prisma calls)
- `mill` (variable names and Prisma relations) → `company`
- `prisma.mill.` → `prisma.company.`

---

### Task 9: Update all `src/lib/` files

**Files to modify** (find every file using `millId`, `mill`, `Mill`, `MILL_`):
- `src/lib/dashboard.ts`
- `src/lib/audits.ts`
- `src/lib/checklist-workflow.ts`
- `src/lib/integration-configs.ts`
- `src/lib/imports.ts`
- `src/lib/shipments.ts`
- `src/lib/production.ts`
- `src/lib/checklists.ts`
- `src/lib/report-generator.ts`
- `src/lib/llm/anthropic.ts`
- `src/lib/llm/gemini.ts`

**Step 1: For each file, apply these find-and-replace rules**

| Find | Replace |
|------|---------|
| `prisma.mill.` | `prisma.company.` |
| `millId` | `companyId` |
| `: mill` (relation includes) | `: company` |
| `mill: {` (relation includes) | `company: {` |
| `mill: true` | `company: true` |
| `.mill.` (chained access) | `.company.` |
| `mill.name` | `company.name` |
| `mill.code` | `company.code` |
| `mill.organisationId` | `company.organisationId` |
| `millName` | `companyName` |
| `millCode` | `companyCode` |
| `getConfigsForMill` | `getConfigsForCompany` |
| `Mill ${` (string literals) | `Company ${` |
| `your mill` | `your company` |
| `Mill Manager` | `Company Manager` |
| `Mill:` (LLM prompt labels) | `Company:` |

**Step 2: Specific change in `src/lib/checklist-workflow.ts`**

Also update the function name:
- `returnChecklistToMill` → `returnChecklistToCompany`
- `// Notify Mill Managers` → `// Notify Company Managers`

**Step 3: Specific change in `src/lib/dashboard.ts`**

- `totalMills` variable → `totalCompanies`
- `certifiedMills` variable → `certifiedCompanies`
- `millId:` in returned objects → `companyId:`
- `millName:` → `companyName:`

---

### Task 10: Update remaining API route handlers

**Files:** All route files that reference `millId` as a query param, request body field, or `user.millId`:

Run this grep to find all affected files:
```bash
grep -rl "millId\|user\.millId\|MILL_MANAGER\|MILL_STAFF" src/app/api/
```

For each file found, apply the same find-and-replace rules from Task 9.

Key replacements in route handlers:
- `user.millId` → `user.companyId`
- `millId: user.millId` → `companyId: user.companyId`
- `const { millId }` (from searchParams) → `const { companyId }`
- `searchParams.get('millId')` → `searchParams.get('companyId')`
- `'MILL_MANAGER'` → `'COMPANY_MANAGER'`
- `'MILL_STAFF'` → `'COMPANY_STAFF'`
- `UserRole.MILL_MANAGER` → `UserRole.COMPANY_MANAGER`
- `UserRole.MILL_STAFF` → `UserRole.COMPANY_STAFF`

---

### Task 11: Build check and commit Layer 2

**Step 1: Run build**

Run: `bun run build`
Expected: Build succeeds with no TypeScript errors related to mill/company naming. If errors remain, fix them before committing.

**Step 2: Commit Layer 2**

```bash
git add src/lib/ src/app/api/ src/middleware.ts
git commit -m "feat: rename mill → company in API routes and lib layer"
```

---

## LAYER 3 — UI + Routes

### Task 12: Move the `(mill)` route group to `(company)`

**Files:**
- Move: `src/app/(mill)/` → `src/app/(company)/`

**Step 1: Rename the route group folder**

```bash
mv "src/app/(mill)" "src/app/(company)"
```

This renames the route group. Route groups (`(name)`) don't affect URLs, but the folder name change is needed for consistency.

**Step 2: Rename the URL path segments inside `src/app/(company)/`**

The folder currently has `src/app/(company)/mill/`. Rename it:
```bash
mv "src/app/(company)/mill" "src/app/(company)/company"
```

This changes all `/mill/*` URLs to `/company/*`.

---

### Task 13: Rename `/aggregator/mills/` to `/aggregator/companies/`

**Files:**
- Move: `src/app/(aggregator)/aggregator/mills/` → `src/app/(aggregator)/aggregator/companies/`

**Step 1: Rename the folder**

```bash
mv "src/app/(aggregator)/aggregator/mills" "src/app/(aggregator)/aggregator/companies"
```

**Step 2: Rename the `[millId]` dynamic segment folder**

```bash
mv "src/app/(aggregator)/aggregator/companies/[millId]" "src/app/(aggregator)/aggregator/companies/[companyId]"
```

---

### Task 14: Rename `/auditor/mills` to `/auditor/companies`

**Files:**
- Move: `src/app/(auditor)/auditor/mills/` → `src/app/(auditor)/auditor/companies/`

**Step 1: Rename the folder**

```bash
mv "src/app/(auditor)/auditor/mills" "src/app/(auditor)/auditor/companies"
```

---

### Task 15: Update `src/components/AppSidebar.tsx`

**Files:**
- Modify: `src/components/AppSidebar.tsx`

**Step 1: Update sidebar config**

Find: `{ href: '/aggregator/mills', label: 'Mill Portfolio', icon: Building2 }`
Replace with: `{ href: '/aggregator/companies', label: 'Company Portfolio', icon: Building2 }`

Find: `{ href: '/auditor/mills', label: 'Mill Directory', icon: Building2 }`
Replace with: `{ href: '/auditor/companies', label: 'Company Directory', icon: Building2 }`

Find:
```typescript
    mill: {
        roleLabel: 'Mill Staff',
```
Replace with:
```typescript
    company: {
        roleLabel: 'Company Staff',
```

Find: `{ href: '/mill/dashboard',`
Replace with: `{ href: '/company/dashboard',`

Find: `{ href: '/mill/checklists',` (all `/mill/` hrefs in the nav array)
Replace all `/mill/` prefixes with `/company/`.

Find: `role: 'aggregator' | 'mill' | 'auditor'`
Replace with: `role: 'aggregator' | 'company' | 'auditor'`

---

### Task 16: Update `src/components/RoleSwitcher.tsx`

**Files:**
- Modify: `src/components/RoleSwitcher.tsx`

**Step 1: Replace the full file content**

Apply these find-and-replace rules:
- `type Mill = ` → `type Company = `
- `type View = 'aggregator' | 'mill' | 'auditor'` → `type View = 'aggregator' | 'company' | 'auditor'`
- `mill: 'Mill',` → `company: 'Company',`
- `const [showMillPicker, setShowMillPicker]` → `const [showCompanyPicker, setShowCompanyPicker]`
- `const [mills, setMills]` → `const [companies, setCompanies]`
- `const [selectedMill, setSelectedMill]` → `const [selectedCompany, setSelectedCompany]`
- `const [loadingMills, setLoadingMills]` → `const [loadingCompanies, setLoadingCompanies]`
- `if (view === 'mill')` → `if (view === 'company')`
- `setShowMillPicker(true)` → `setShowCompanyPicker(true)`
- `if (mills.length === 0)` → `if (companies.length === 0)`
- `setLoadingMills(true/false)` → `setLoadingCompanies(true/false)`
- `fetch('/api/mills')` → `fetch('/api/companies')`
- `setMills(data.data ?? [])` → `setCompanies(data.data ?? [])`
- `function confirmMillSelection` → `function confirmCompanySelection`
- `if (!selectedMill)` → `if (!selectedCompany)`
- `setCookie('activeView', 'mill')` → `setCookie('activeView', 'company')`
- `setCookie('activeMillId', selectedMill.id)` → `setCookie('activeCompanyId', selectedCompany.id)`
- `setActiveView('mill')` → `setActiveView('company')`
- `setShowMillPicker(false)` → `setShowCompanyPicker(false)`
- `router.push('/mill/dashboard')` → `router.push('/company/dashboard')`
- `const views: View[] = ['aggregator', 'mill', 'auditor']` → `const views: View[] = ['aggregator', 'company', 'auditor']`
- `{showMillPicker && (` → `{showCompanyPicker && (`
- `<h3 ...>Select Mill</h3>` → `<h3 ...>Select Company</h3>`
- `setShowMillPicker(false)` → `setShowCompanyPicker(false)` (close button)
- `{loadingMills ?` → `{loadingCompanies ?`
- `{mills.map(mill =>` → `{companies.map(company =>`
- `key={mill.id}` → `key={company.id}`
- `onClick={() => setSelectedMill(mill)}` → `onClick={() => setSelectedCompany(company)}`
- `selectedMill?.id === mill.id` → `selectedCompany?.id === company.id`

---

### Task 17: Update all page `.tsx` files — UI strings and route params

**Step 1: Find all page files with mill references**

```bash
grep -rl "mill\|Mill" src/app/ --include="*.tsx"
```

**Step 2: For each file, update UI strings**

Common patterns to replace:
- `"Mills"` → `"Companies"`
- `"Mill"` → `"Company"`
- `"mills"` → `"companies"`
- `"mill"` → `"company"` (in labels, descriptions, placeholders)
- `Add Mill` → `Add Company`
- `No mills` → `No companies`
- `Manage all registered palm oil mills` → `Manage all registered companies`
- `[millId]` route param destructuring in `params` → `[companyId]`
- `params.millId` → `params.companyId`
- `/aggregator/mills/` → `/aggregator/companies/` (in `router.push` and `href` links)
- `/mill/` → `/company/` (in `router.push` and `href` links)

**Step 3: Update API fetch URLs in page files**

- `fetch('/api/mills')` → `fetch('/api/companies')`
- `fetch(\`/api/dashboard/mill/${...}\`)` → `fetch(\`/api/dashboard/company/${...}\`)`

---

### Task 18: Final build check and commit Layer 3

**Step 1: Run build**

Run: `bun run build`
Expected: Clean build, no TypeScript errors.

If errors appear, grep for any remaining `mill` references:
```bash
grep -rn "millId\|'/mill/\|\"/mill/\|activeMillId\|MILL_MANAGER\|MILL_STAFF" src/ --include="*.ts" --include="*.tsx"
```
Fix any remaining instances, then re-run build.

**Step 2: Smoke test**

- Start dev server: `bun run dev`
- Navigate to `/aggregator/companies` — should show company list
- Navigate to `/company/dashboard` — should load mill dashboard
- Navigate to `/auditor/companies` — should show company directory
- Use RoleSwitcher to switch to company view as SUPER_ADMIN — should set `activeCompanyId` cookie and redirect to `/company/dashboard`

**Step 3: Commit Layer 3**

```bash
git add src/app/ src/components/
git commit -m "feat: rename mill → company in UI routes and components"
```

---

## Post-Implementation Checklist

- [ ] `bun run build` passes
- [ ] `bun run db:seed` runs without errors
- [ ] All navigation links work (`/aggregator/companies`, `/company/*`, `/auditor/companies`)
- [ ] RoleSwitcher correctly sets `activeView=company` and `activeCompanyId` cookies
- [ ] No remaining `millId`, `MILL_MANAGER`, `MILL_STAFF`, `/mill/`, `/mills` references in `src/` (run the grep from Task 18 Step 1 to verify)
- [ ] Update Notion ticket #12 status to **Done**
