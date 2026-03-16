# Carbon Calculator (Climatiq) — Design Doc

**Date:** 2026-03-14
**Ticket:** #7 — Add a Carbon Calculator using Climatiq API
**Branch:** feat/carbon-calculator

---

## Summary

Embed a Climatiq-powered carbon calculator inline within the checklist item data entry form. It allows mill staff to estimate CO₂e for a given activity and write the result directly into `valueConverted`, bypassing the local emission factor system.

---

## Decisions

| Question | Decision |
|---|---|
| Where does it live? | Inline collapsible panel on checklist item data entry form |
| Which items show it? | Only items where `requirement.ghgScope` is non-null |
| How does the result flow in? | Populates `valueConverted` directly; `emissionFactorId` = null, `unitReference` = "tCO2e (Climatiq)" |
| Activity scope | Curated list of ~10 mill-relevant activities (editable later) |
| API key storage | Single `CLIMATIQ_API_KEY` in `.env`; all calls server-side |

---

## Architecture & Data Flow

1. User expands "Calculate with Climatiq" panel on a GHG-scoped checklist item
2. Selects activity, enters quantity and unit
3. Client POSTs to `/api/carbon-calculator/estimate` (new route)
4. Server calls `POST https://api.climatiq.io/data/v1/estimate` with `CLIMATIQ_API_KEY`
5. Server returns `{ co2e, co2e_unit }` to client
6. User clicks "Use this value"
7. Data entry form sets `valueConverted = co2e`, `emissionFactorId = null`, `unitReference = "tCO2e (Climatiq)"`

No schema changes required.

---

## Curated Activity List

Stored as a static config file (`src/lib/climatiq-activities.ts`), editable without touching API or UI code.

| Activity | Climatiq Activity ID | Parameter Type | Default Unit |
|---|---|---|---|
| Diesel combustion | `fuel_combustion-type_diesel-fuel_use` | Volume | L |
| Grid electricity | `electricity-supply_grid-source_residual_mix` | Energy | kWh |
| Natural gas combustion | `fuel_combustion-type_natural_gas-fuel_use` | Volume | m³ |
| Petrol / gasoline | `fuel_combustion-type_petrol-fuel_use` | Volume | L |
| Palm kernel shell (biomass) | `fuel_combustion-type_biomass-fuel_use` | Weight | t |
| Nitrogen fertilizer | `chemical_production-type_nitrogen_fertiliser` | Weight | kg |
| Road freight (CPO transport) | `freight_vehicle-vehicle_type_hgv-fuel_source_diesel-vehicle_weight_gt_17t-loading_half_load` | Weight×Distance | t·km |
| Wastewater treatment (POME) | `wastewater_treatment-type_anaerobic_lagoon` | Volume | m³ |
| Refrigerant leakage (R-410A) | `refrigerants-type_r410a` | Weight | kg |
| Coal combustion | `fuel_combustion-type_coal-fuel_use` | Weight | t |

---

## UI Design

Inline collapsible panel below existing form fields, visible only on GHG-scoped items.

**Collapsed:**
```
[Calculate with Climatiq ▾]
```

**Expanded:**
```
┌─ Calculate with Climatiq ──────────────────────────────────┐
│  Activity     [Diesel combustion              ▾]           │
│  Quantity     [___________]  Unit  [L ▾]                  │
│                                              [Calculate]   │
│                                                            │
│  Result: 0.264 tCO₂e                 [Use this value →]  │
└────────────────────────────────────────────────────────────┘
```

- Unit dropdown pre-set by selected activity, but editable
- "Calculate" shows spinner during API call
- Error: inline red message (e.g. "Climatiq API unavailable — check API key or try again")
- After "Use this value": panel collapses, green badge shown — "CO₂e set via Climatiq: 0.264 tCO₂e", local emission factor field hidden

---

## New Files

| File | Purpose |
|---|---|
| `src/lib/climatiq-activities.ts` | Static curated activity config |
| `src/app/api/carbon-calculator/estimate/route.ts` | Server-side Climatiq proxy |
| `src/components/carbon-calculator.tsx` | Client component — inline panel |

## Modified Files

| File | Change |
|---|---|
| `src/app/(mill)/mill/checklists/[checklistId]/items/[itemId]/page.tsx` | Embed `<CarbonCalculator>` when ghgScope is set |
| `.env.example` | Add `CLIMATIQ_API_KEY=` |

---

## Out of Scope

- Saving Climatiq calculation history
- Per-mill API keys
- Free-text activity search against Climatiq catalogue
- Aggregator-side calculator access
