# Design: Regulation Profile Creation — Two Tabs + JSON Import + Prompt Template

**Date:** 2026-03-19
**Branch:** workflow-fix-1
**Ticket:** #16 — No 'Create' button on Regulation Profiles page

---

## Overview

Enhance `/aggregator/regulation-profiles/new` with two creation modes:

1. **Manual tab** — existing shell form (regulation, version, name, description)
2. **Import JSON tab** — upload/paste a full fixture-format JSON to create a profile with all pillars, categories, and requirements in one shot; includes a collapsible AI prompt template to help users generate a JSON from scratch

---

## Page Layout

Two tabs at the top of the card on `/aggregator/regulation-profiles/new`:

### Manual Tab (unchanged)
Existing form with fields: regulation select, version, name, description → POSTs to `POST /api/regulation-profiles` → redirects to list.

### Import JSON Tab

Three stacked zones:

**1. Upload / Paste Zone**
- Drag-and-drop `.json` file OR `<textarea>` to paste JSON
- Both inputs populate the same parsed-JSON state variable
- Live client-side parse: malformed JSON or missing required fields (`regulation`, `version`, `name`, `pillars`) shows an inline error immediately

**2. Preview Panel** (visible once valid JSON is loaded)
- Regulation badge, version, name, description
- Pill counts: `N pillars · M categories · K requirements`
- Collapsed pillar tree (pillar name → category name list) for visual sanity-check

**3. Prompt Template Drawer** (collapsible, default closed)
Title: "Don't have a JSON? Generate one with AI ↓"

Contains:
- Read-only code block with a copy button containing a ready-to-paste AI prompt (see below)
- **Download blank template** button that downloads a minimal scaffold JSON

#### AI Prompt Template
```
You are a compliance data engineer. Generate a GreenTrace regulation profile
JSON for [REGULATION] version [VERSION].

Follow this exact schema:
{
  "regulation": "ISCC_EU|ISCC_PLUS|RSPO_PC|RSPO_SCCS",
  "version": "string (e.g. '2024-v1')",
  "name": "string",
  "description": "string",
  "pillars": [
    {
      "code": "string (e.g. 'ENV')",
      "name": "string",
      "displayOrder": 1,
      "categories": [
        {
          "code": "string (e.g. 'ENV-01')",
          "name": "string",
          "displayOrder": 1,
          "requirements": [
            {
              "code": "string (e.g. 'ENV-01-001')",
              "name": "string",
              "description": "string",
              "guidanceText": "string",
              "dataType": "ABSOLUTE_QUANTITY|RATE|DOCUMENT_ONLY|TEXT_RESPONSE",
              "criticality": "CRITICAL|NON_CRITICAL",
              "ghgScope": "SCOPE1|SCOPE2|SCOPE3|null",
              "unit": "string or null",
              "requiresForm": true,
              "displayOrder": 1
            }
          ]
        }
      ]
    }
  ]
}
Output only valid JSON. No explanation.
```

#### Blank Template JSON
```json
{
  "regulation": "ISCC_EU",
  "version": "1.0",
  "name": "My Profile",
  "description": "",
  "pillars": [
    {
      "code": "PIL",
      "name": "Pillar Name",
      "displayOrder": 1,
      "categories": [
        {
          "code": "PIL-01",
          "name": "Category Name",
          "displayOrder": 1,
          "requirements": [
            {
              "code": "PIL-01-001",
              "name": "Requirement Name",
              "description": "What must be demonstrated.",
              "guidanceText": "How to collect the evidence.",
              "dataType": "DOCUMENT_ONLY",
              "criticality": "CRITICAL",
              "ghgScope": null,
              "unit": null,
              "requiresForm": false,
              "displayOrder": 1
            }
          ]
        }
      ]
    }
  ]
}
```

---

## API

### `POST /api/regulation-profiles/import`

- **Auth:** SUPER_ADMIN only
- **Body:** Full fixture-format JSON (same shape as `prisma/fixtures/iscc-eu.json`)
- **Validation:**
  - `regulation` must be a valid `RegulationCode` enum value
  - `version` and `name` must be non-empty strings
  - `pillars` must be a non-empty array
- **Duplicate check:** Return `409` if `regulation + version` already exists
- **Create:** Full nested Prisma `create()` — profile → pillars → categories → requirements in one call (same pattern as seed)
- **Response:** `{ data: { id, name, regulation, version, _count: { pillars } } }`

---

## Library

### `importProfile()` in `src/lib/regulation-profiles.ts`

New function alongside `createProfile()`. Accepts the parsed fixture JSON object, runs the full nested Prisma create. Keeps the API route thin.

```typescript
export async function importProfile(fixture: RegulationProfileFixture) {
  return prisma.regulationProfile.create({
    data: {
      regulation: fixture.regulation,
      version: fixture.version,
      name: fixture.name,
      description: fixture.description ?? null,
      pillars: {
        create: fixture.pillars.map((pillar, pi) => ({
          code: pillar.code,
          name: pillar.name,
          displayOrder: pillar.displayOrder ?? pi,
          categories: {
            create: pillar.categories.map((cat, ci) => ({
              code: cat.code,
              name: cat.name,
              displayOrder: cat.displayOrder ?? ci,
              requirements: {
                create: cat.requirements.map((req, ri) => ({
                  code: req.code,
                  name: req.name,
                  description: req.description,
                  guidanceText: req.guidanceText ?? null,
                  dataType: req.dataType,
                  criticality: req.criticality,
                  ghgScope: req.ghgScope ?? null,
                  unit: req.unit ?? null,
                  requiresForm: req.requiresForm ?? false,
                  displayOrder: req.displayOrder ?? ri,
                })),
              },
            })),
          },
        })),
      },
    },
    include: { _count: { select: { pillars: true } } },
  })
}
```

---

## What Does NOT Change

- Manual tab form and `POST /api/regulation-profiles` endpoint — untouched
- List page (`/regulation-profiles`) — untouched
- Detail page (`/regulation-profiles/[profileId]`) — untouched
- No Prisma schema migration needed

---

## Files Touched

| File | Action |
|------|--------|
| `src/app/(aggregator)/aggregator/regulation-profiles/new/page.tsx` | Replace — add two-tab layout, import flow, prompt template drawer |
| `src/app/api/regulation-profiles/import/route.ts` | Create — new import endpoint |
| `src/lib/regulation-profiles.ts` | Add `importProfile()` and `RegulationProfileFixture` type |
