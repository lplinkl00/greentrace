# Production Records — Design Doc

**Date:** 2026-03-13
**Branch:** feat/production-records
**Ticket:** #3 Change Imports to Production for Mills

## Context

Mills produce palm oil (FFB → CPO/PKO) rather than import it. GreenTrace needs a dedicated production tracking module separate from the existing shipments/trade module. Both production and trade will coexist as distinct sections in the mill UI.

## Data Model

New `ProductionRecord` table:

| Field | Type | Notes |
|---|---|---|
| `id` | cuid | PK |
| `millId` | String | FK → Mill |
| `recordedById` | String | FK → User |
| `productionDate` | DateTime | Date only |
| `ffbReceivedMt` | Decimal(18,4) | Fresh Fruit Bunches received |
| `cpoProducedMt` | Decimal(18,4) | Crude Palm Oil produced |
| `pkoProducedMt` | Decimal(18,4) | Palm Kernel Oil produced |
| `notes` | String? | Optional free text |
| `source` | enum | `MANUAL` \| `CSV_IMPORT` |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

**Unique constraint:** `(millId, productionDate)` — one record per mill per day.

**Derived metrics (computed at query time, not stored):**
- OER (Oil Extraction Rate) = `cpoProducedMt / ffbReceivedMt × 100`
- KER (Kernel Extraction Rate) = `pkoProducedMt / ffbReceivedMt × 100`

## Routes & API

**Pages:**
- `/mill/production` — list of production records with summary stats
- `/mill/production/new` — form to add a new production record

**API:**
- `GET /api/production` — list records for the authenticated mill
- `POST /api/production` — create a new production record

## UI

### `/mill/production`
- 3 summary stat cards: Total FFB Received (MT), Average OER (%), Average KER (%)
- Table: Date | FFB (MT) | CPO (MT) | PKO (MT) | OER | KER | Notes
- "New Record" button → `/mill/production/new`
- Empty state with Factory icon

### `/mill/production/new`
- Form fields: Production Date, FFB Received (MT), CPO Produced (MT), PKO Produced (MT), Notes (optional)
- Submit → `POST /api/production` → redirect to `/mill/production`

### Sidebar
- New "Production" nav item using `Factory` icon, between Shipments and Imports

## What Is Not Changed
- `/mill/imports` and all import job logic remains untouched
- `ShipmentRecord` model unchanged
- No existing migrations modified
