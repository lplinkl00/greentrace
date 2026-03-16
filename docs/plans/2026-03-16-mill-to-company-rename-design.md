# Design: Rename Mill → Company

**Date:** 2026-03-16
**Ticket:** #12 — Change Mills to Companies
**Branch:** feature/mill-to-company-rename

## Background

GreenTrace initially modelled its certified-entity concept as a "Mill" (palm oil mill). The platform is now expanding to cover other company types that collect and report sustainability data. The `Mill` concept is being generalised to `Company` across all layers: database schema, API, and UI.

The workflow is unchanged — only the naming changes.

## Approach: Layer-by-Layer (Option B)

Three sequential commits, each independently buildable and testable.

---

## Layer 1: Schema + Migration

### Prisma model
- `model Mill` → `model Company`
- All relation fields: `mill` → `company`, `mills` → `companies`
- All FK columns across every model: `millId` → `companyId`

### UserRole enum
- `MILL_MANAGER` → `COMPANY_MANAGER`
- `MILL_STAFF` → `COMPANY_STAFF`

### Migration (raw SQL — not auto-generated)
Prisma cannot auto-detect renames; it treats them as delete + create. Write a raw SQL migration:

```sql
-- Rename table
ALTER TABLE "Mill" RENAME TO "Company";

-- Rename millId FK columns on every related table
ALTER TABLE "User"              RENAME COLUMN "millId" TO "companyId";
ALTER TABLE "Checklist"         RENAME COLUMN "millId" TO "companyId";
ALTER TABLE "MassBalanceEntry"  RENAME COLUMN "millId" TO "companyId";
ALTER TABLE "ShipmentRecord"    RENAME COLUMN "millId" TO "companyId";
ALTER TABLE "ImportJob"         RENAME COLUMN "millId" TO "companyId";
ALTER TABLE "IntegrationConfig" RENAME COLUMN "millId" TO "companyId";
ALTER TABLE "Audit"             RENAME COLUMN "millId" TO "companyId";
ALTER TABLE "ProductionRecord"  RENAME COLUMN "millId" TO "companyId";

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

### Seed (`prisma/seed.ts`)
- All `prisma.mill.*` calls → `prisma.company.*`
- Role string literals `'MILL_MANAGER'` → `'COMPANY_MANAGER'`, `'MILL_STAFF'` → `'COMPANY_STAFF'`

### Test checkpoint
- `bun run db:migrate` applies cleanly
- `bun run db:seed` runs without errors
- `bun run build` passes (TypeScript driven by new Prisma client types)

---

## Layer 2: API + Lib

### API route renames (file moves)
| Old path | New path |
|---|---|
| `src/app/api/mills/route.ts` | `src/app/api/companies/route.ts` |
| `src/app/api/dashboard/mill/[millId]/route.ts` | `src/app/api/dashboard/company/[companyId]/route.ts` |

### Auth context (`src/lib/auth.ts`)
- Field `millId` → `companyId`
- Cookie name `activeMillId` → `activeCompanyId`

### Middleware (`src/middleware.ts`)
- Route protection: `/mill/` → `/company/`
- `activeView === 'mill'` → `activeView === 'company'`
- Redirect `/mill/dashboard` → `/company/dashboard`

### Lib files (all files in `src/lib/`)
- Variable names: `mill` → `company`, `mills` → `companies`, `millId` → `companyId`
- Function names: e.g. `getConfigsForMill` → `getConfigsForCompany`
- LLM prompt strings in `src/lib/llm/anthropic.ts` and `src/lib/llm/gemini.ts`:
  - `Mill: ${payload.millName}` → `Company: ${payload.companyName}`
  - `millCode` → `companyCode`, `millName` → `companyName`
- All route handler files: `millId` query params and body fields → `companyId`

### Test checkpoint
- `bun run build` passes with zero TypeScript errors

---

## Layer 3: UI + Routes

### Next.js route group + URL paths
| Old | New |
|---|---|
| `src/app/(mill)/` | `src/app/(company)/` |
| `/mill/*` | `/company/*` |
| `/aggregator/mills/` | `/aggregator/companies/` |
| `[millId]` param folders | `[companyId]` param folders |
| `/auditor/mills` | `/auditor/companies` |

### Sidebar (`src/components/AppSidebar.tsx`)
- Role key `mill` → `company`
- `roleLabel: 'Mill Staff'` → `'Company Staff'`
- Nav labels: "Mill Portfolio" → "Company Portfolio", "Mill Directory" → "Company Directory"
- hrefs updated to new URL paths

### RoleSwitcher (`src/components/RoleSwitcher.tsx`)
- `View` type literal `'mill'` → `'company'`
- Cookie `activeView: 'mill'` → `'company'`
- State variables: `mills` → `companies`, `selectedMill` → `selectedCompany`, `showMillPicker` → `showCompanyPicker`
- API call `/api/mills` → `/api/companies`
- Display label `Mill` → `Company`

### Page UI strings (all `.tsx` files)
- Headings, descriptions, button labels, table headers, empty states:
  - "Mill" → "Company", "Mills" → "Companies"
  - "mill" → "company" (lowercase references)

### Test checkpoint
- `bun run build` passes
- All pages load (200) and navigation works end-to-end
- Role switcher correctly sets `activeView=company` and `activeCompanyId` cookies
