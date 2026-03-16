# Regulation Profiles Design

**Date:** 2026-03-14
**Ticket:** #8 — Create Regulation Profiles for ISCC EU and RSPO
**Branch:** feat/regulation-profiles

## Overview

Seed the database with full regulation profile templates for all four supported standards (ISCC EU, ISCC PLUS, RSPO PC, RSPO SCCS), wire up the regulation profiles UI pages, and connect the checklist creation form to real profile data.

## Goals

- Seed accurate, fully-structured regulation profiles (pillars → categories → requirements) for ISCC_EU, ISCC_PLUS, RSPO_PC, RSPO_SCCS
- Wire up `/aggregator/regulation-profiles` list and detail pages to real data
- Wire up `/aggregator/checklists/new` profile dropdown to real data

## Data: JSON Fixtures

Store each regulation as a JSON fixture file under `prisma/fixtures/`. This keeps requirement data readable, maintainable, and independently updatable when standards change.

```
prisma/fixtures/
  iscc-eu.json
  iscc-plus.json
  rspo-pc.json
  rspo-sccs.json
```

### Fixture Shape

```json
{
  "regulation": "ISCC_EU",
  "version": "2024-v1",
  "name": "ISCC EU 2024 v1",
  "description": "...",
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
              "name": "Total GHG Emissions",
              "description": "...",
              "dataType": "ABSOLUTE_QUANTITY",
              "criticality": "CRITICAL",
              "ghgScope": "SCOPE1",
              "unit": "tCO2e",
              "requiresForm": true,
              "guidanceText": "..."
            }
          ]
        }
      ]
    }
  ]
}
```

### Regulation Structures

**ISCC EU / ISCC PLUS** — three pillars:
- Environmental (GHG emissions, land use change, water & biodiversity)
- Social (labour rights, health & safety, community)
- Governance (legal compliance, traceability, management practices)

ISCC PLUS mirrors ISCC EU but applies to non-food/feed biomass with adjusted GHG methodology and land criteria.

**RSPO PC** — based on the 2018 Principles & Criteria, three pillars:
- Environmental (biodiversity & HCV, GHG & carbon stocks, water, waste, fire prevention)
- Social (community & land rights, workers' rights, smallholder inclusion, grievance mechanism)
- Governance (legal compliance, transparency & reporting, best management practices)

**RSPO SCCS** — focused on supply chain integrity:
- Supply Chain (certified volume tracking, mass balance, chain of custody)
- Governance (documentation, auditing, claims)

> **Implementation note:** The implementing agent must perform web research to obtain the accurate and current pillar/category/requirement structure for each standard before writing the fixture files. Do not invent requirement codes or descriptions.

## API Routes

Both routes use `withAuth([SUPER_ADMIN, AGGREGATOR_MANAGER])`.

### `GET /api/regulation-profiles`

Returns all profiles:
```json
{
  "data": [
    {
      "id": "...",
      "regulation": "ISCC_EU",
      "version": "2024-v1",
      "name": "ISCC EU 2024 v1",
      "isActive": true,
      "_count": { "pillars": 3 }
    }
  ]
}
```

### `GET /api/regulation-profiles/[profileId]`

Returns full profile with nested tree:
```json
{
  "data": {
    "id": "...",
    "name": "ISCC EU 2024 v1",
    "pillars": [
      {
        "code": "ENV",
        "name": "Environmental",
        "categories": [
          {
            "code": "ENV-01",
            "name": "GHG Emissions",
            "requirements": [...]
          }
        ]
      }
    ]
  }
}
```

Uses existing `getProfileById` from `src/lib/regulation-profiles.ts`.

## Frontend

All pages follow the existing `'use client'` + `fetch('/api/...')` pattern.

### List Page — `/aggregator/regulation-profiles`

- Fetches `GET /api/regulation-profiles`
- Table with columns: Name, Regulation, Version, Active, Pillars, link to detail
- "Active" shown as a green/grey badge

### Detail Page — `/aggregator/regulation-profiles/[profileId]`

- Fetches `GET /api/regulation-profiles/[profileId]`
- Accordion tree: pillars expand to show categories, categories expand to show requirements
- Each requirement shows: name, code, data type, criticality badge, unit (if set)

### Checklist Creation — `/aggregator/checklists/new`

- On mount, fetches `GET /api/regulation-profiles` and filters to `isActive: true`
- Populates the "Regulation Profile" `<select>` with `{ value: profile.id, label: profile.name }`

## Out of Scope

- Creating or editing profiles via UI (super admin only, CLI/seed for now)
- Activating/deactivating profiles via UI
- Checklist creation form submission (separate ticket)
