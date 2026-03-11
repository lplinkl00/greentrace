# GreenTrace â€” Complete Implementation Plan

> **Version:** 1.0  
> **Date:** 2026-03-09  
> **Status:** Authoritative pre-build specification  
> **Audience:** AI coding agent and engineering team

---

## Table of Contents

0. [Local Development & Deployment](#0-local-development--deployment)
1. [What GreenTrace Is](#1-what-greentrace-is)
2. [Design Inheritance Patterns](#2-design-inheritance-patterns)
3. [Tech Stack](#3-tech-stack)
4. [User Roles and Permissions](#4-user-roles-and-permissions)
5. [Permission Matrix](#5-permission-matrix)
6. [Core Data Model (Prisma Schema)](#6-core-data-model-prisma-schema)
   - 6.1 [Organisation and Users](#61-organisation-and-users)
   - 6.2 [Regulation Framework](#62-regulation-framework)
   - 6.3 [Mill Checklists](#63-mill-checklists)
   - 6.4 [Data Entry and Calculations](#64-data-entry-and-calculations)
   - 6.5 [Document Management](#65-document-management)
   - 6.6 [Audit](#66-audit)
   - 6.7 [Imports](#67-imports)
   - 6.8 [Integration Placeholders](#68-integration-placeholders)
7. [Business Logic Rules](#7-business-logic-rules)
   - 7.1 [Period Locking](#71-period-locking)
   - 7.2 [Submission Flow](#72-submission-flow)
   - 7.3 [Mass Balance Rules](#73-mass-balance-rules)
   - 7.4 [GHG Calculations](#74-ghg-calculations)
   - 7.5 [Reconciliation Flags](#75-reconciliation-flags)
   - 7.6 [Double-Accounting Prevention](#76-double-accounting-prevention)
   - 7.7 [Audit Report Generation](#77-audit-report-generation)
8. [API Design](#8-api-design)
9. [Key Workflows (End-to-End)](#9-key-workflows-end-to-end)
10. [File and Folder Structure](#10-file-and-folder-structure)
11. [Phased Implementation Roadmap](#11-phased-implementation-roadmap)
12. [Open Questions](#12-open-questions)

---

## 0. Local Development & Deployment

This project uses **Bun** as the primary runtime, package manager, and test runner. The infrastructure is powered by **Supabase** (Local & Cloud) and **Prisma**.

### 0.1 Local Developer Setup

1.  **Project Initialization**:
    ```bash
    bun init
    ```
2.  **Supabase CLI**:
    - Ensure Supabase CLI is installed (`brew install supabase/tap/supabase` or equivalent).
    - Initialization: `supabase init`.
    - Start local instance: `supabase start`.
3.  **Configuring `.env.local`**:
    The system requires a complete environment configuration to function correctly.
    ```env
    # Database (Supabase Local Instance)
    DATABASE_URL="postgresql://postgres:postgres@localhost:54326/postgres"
    DIRECT_URL="postgresql://postgres:postgres@localhost:54326/postgres"

    # Supabase (Local/Cloud)
    NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
    SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

    # AI Providers (External APIs)
    ANTHROPIC_API_KEY="sk-ant-..."
    GOOGLE_AI_API_KEY="AIza..."

    # Application
    NEXT_PUBLIC_APP_URL="http://localhost:3000"
    ```
4.  **Prisma + Supabase Specifics**:
    - **Connection Pooling**: Use `DIRECT_URL` for migrations and `DATABASE_URL` for the client.
    - **RLS Migrations**: GreenTrace enforces RLS at the database level. Every SQL migration that creates a table MUST include:
      ```sql
      ALTER TABLE "TableName" ENABLE ROW LEVEL SECURITY;
      -- Followed by specific policies scoped to mill_id or user role
      ```
5.  **Local Startup Sequence**:
    Follow this sequence for every dev session:
    ```bash
    supabase start        # Start local Postgres/Auth/Storage
    bun install           # Install dependencies
    bunx prisma generate  # Maintain type safety
    bun run dev           # Start Next.js dev server
    ```
6.  **Recommended `package.json` Scripts**:
    ```json
    {
      "scripts": {
        "dev": "next dev",
        "build": "next build",
        "postinstall": "prisma generate",
        "db:migrate": "prisma migrate dev",
        "db:deploy": "prisma migrate deploy",
        "supabase:start": "supabase start"
      }
    }
    ```

### 0.2 Vercel Deployment Checklist

- **Runtime**: Bun must be enabled in the build environment.
- **Environment Variables**: Mirror all `.env.local` keys to Vercel Project Settings.
- **Build Command**: `bun run build`.
- **Install Command**: `bun install`.
- **Migration Policy**: **Deployment Step**: The Vercel build process should include `bunx prisma migrate deploy` to ensure the production database schema is updated before the new build is activated.

---

## 1. What GreenTrace Is

GreenTrace is a **compliance operations platform** for a single aggregator business that manages a portfolio of palm oil mills. It replaces manual spreadsheet workflows and fragmented document management with a structured, auditable system.

### 1.1 Supported Certification Frameworks

| Framework | Full Name | Scope |
|-----------|-----------|-------|
| ISCC EU | International Sustainability and Carbon Certification â€” European Union | GHG calculations, chain of custody, mass balance |
| ISCC PLUS | ISCC â€” PLUS variant (broader scope) | Same as ISCC EU, additional sustainability pillars |
| RSPO PC | Roundtable on Sustainable Palm Oil â€” Principles & Criteria | Social, environmental, governance criteria |
| RSPO SCCS | RSPO â€” Supply Chain Certification Standard | Chain of custody for supply chain actors |

### 1.2 Tenancy Model

GreenTrace is **single-tenant**. The aggregator is the apex entity. Mills and auditors are managed sub-entities. There is no self-service signup, no multi-aggregator support in v1 (though the schema is written to allow it later).

## 2. Design Inheritance Patterns

The following patterns are inherited from MyGreenLight and adapted for GreenTrace:

- **Three-stage review workflow**: Mill Staff â†’ Aggregator Manager â†’ Auditor, with immutable timestamped comment trails per checkpoint.
- **Regulation profiles as instantiatable templates**: ISCC/RSPO profiles are versioned. When a mill is onboarded, a Checklist is auto-generated from the active Requirements in the assigned profile version.
- **Admin-managed emission factor library**: Aggregator admins own the EmissionFactor table. Factors are applied automatically on DataEntry save.
- **Per-checklist progress statistics**: Surfaced at checklist level and portfolio level.
- **Colour-coded due date logic**: Red = overdue/today, Orange = within 7 days, Green = on track. Applied to checkpoint due dates, audit deadlines, certificate expiry dates. This is a **data contract** â€” the API returns due dates as ISO strings and a `due_date_status` enum (`overdue | due_soon | on_track | no_date`); the UI renders colour from this enum.
- **Hierarchical filtering**: Regulation â†’ Pillar â†’ Category â†’ Requirement, used in all checklist and audit list views.
- **Form type distinction**: `form01` = absolute quantity (e.g. tonnes of waste); `form02` = rate or percentage (e.g. OER). Logic and display differ; stored in DataEntry as `entry_type`.

---

## 3. Tech Stack

> **All choices are locked. Do not propose alternatives.**

| Layer | Technology |
|-------|-----------|
| **Primary Runtime** | **Bun** (Required: use `bun install`, `bun run`, and `bunx` throughout) |
| Framework | Next.js 14, App Router, TypeScript throughout |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | Supabase Auth (email/password); RLS enforced at DB level |
| File storage | Supabase Storage |
| UI | Design handled separately â€” plan specifies behaviour and data only |
| PDF generation | TBD at implementation time; noted where required |
| LLM | Model-agnostic abstraction layer; Claude (Anthropic) and Gemini (Google) initially |
| Deployment | Vercel (frontend + API routes), Supabase (DB + storage) |

> [!WARNING]
> **Agent Compatibility Notice**: Be aware of known compatibility considerations between Next.js 14, Prisma, and the Bun runtime. Ensure the Prisma client is generated targeting the correct engine for the Bun environment, and monitor for any edge cases in Next.js App Router performance under Bun. Reference the current [Bun documentation](https://bun.sh/docs/runtime/nextjs) and [Prisma Bun guide](https://www.prisma.io/docs/orm/overview/databases/bun) as needed.

---

## 4. User Roles and Permissions

A user belongs to **exactly one role**. Mill Manager and Mill Staff belong to **exactly one mill**. An Auditor may be assigned to multiple concurrent audits across different mills.

### Role Definitions

**Super Admin (Aggregator)**
- Full access to all data across all mills
- Can create/edit/delete mills, users, regulation profiles, emission factors
- Can assign auditors to mills
- Can lock and unlock reporting periods
- Can configure LLM provider settings
- Can force any status transition with a mandatory logged reason

**Aggregator Manager**
- Read access to all mills
- Can review and approve mill submissions before they go to audit
- Can return checklists to draft with comments
- Cannot modify regulation profiles or emission factors
- Cannot lock/unlock periods

**Mill Manager**
- Full access to their own mill's data only
- Can create and manage their mill's users
- Can submit periods for aggregator review
- Cannot see other mills
- Must acknowledge reconciliation flags before submission

**Mill Staff**
- Write access to their own mill's data entry only
- Cannot submit periods
- Cannot see audit findings until the audit is published

**Auditor**
- Read access to mills assigned to their current audit only
- Can create, edit, and publish audit findings
- Can request additional evidence from mill
- Cannot modify mill data

## 5. Permission Matrix

| Action | Super Admin | Agg. Manager | Mill Manager | Mill Staff | Auditor |
|--------|:-----------:|:------------:|:------------:|:----------:|:-------:|
| Create / delete mill | âœ… | âŒ | âŒ | âŒ | âŒ |
| Create / delete any user | âœ… | âŒ | own mill | âŒ | âŒ |
| Manage regulation profiles | âœ… | âŒ | âŒ | âŒ | âŒ |
| Manage emission factors | âœ… | âŒ | âŒ | âŒ | âŒ |
| Enter DataEntry (own mill) | âœ… | âŒ | âœ… | âœ… | âŒ |
| Submit checklist | âœ… | âŒ | âœ… | âŒ | âŒ |
| Aggregator review / approve | âœ… | âœ… | âŒ | âŒ | âŒ |
| Lock / unlock period | âœ… | âŒ | âŒ | âŒ | âŒ |
| Assign auditor | âœ… | âŒ | âŒ | âŒ | âŒ |
| Create audit findings | âœ… | âŒ | âŒ | âŒ | âœ… |
| Publish audit | âœ… | âŒ | âŒ | âŒ | âœ… |
| Generate LLM report | âœ… | âŒ | âŒ | âŒ | âœ… |
| Export PDF report | âœ… | âŒ | âŒ | âŒ | âœ… |
| View own mill data | âœ… | âœ… | âœ… | âœ… | assigned |
| View all mills | âœ… | âœ… | âŒ | âŒ | âŒ |
| Configure LLM settings | âœ… | âŒ | âŒ | âŒ | âŒ |
| Configure integrations | âœ… | âŒ | âŒ | âŒ | âŒ |
| Upload documents | âœ… | âœ… | âœ… | âœ… | âœ… (evidence only) |
| Soft delete documents | âœ… | own | own | own | own |

> **RLS Enforcement Note:** Supabase RLS policies must enforce mill-scoping at the row level for all tables that carry a `mill_id` foreign key. Application-level checks are a secondary guard, not the primary control.

---

## 6. Core Data Model (Prisma Schema)

The full Prisma schema is provided below as valid Prisma SDL. Comments on non-obvious fields are inline.

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Supabase requires both for connection pooling
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ENUMS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

enum UserRole {
  SUPER_ADMIN
  AGGREGATOR_MANAGER
  MILL_MANAGER
  MILL_STAFF
  AUDITOR
}

enum RegulationCode {
  ISCC_EU
  ISCC_PLUS
  RSPO_PC
  RSPO_SCCS
}

enum RequirementDataType {
  ABSOLUTE_QUANTITY   // form01: a measured volume, weight, count
  RATE                // form02: a ratio or percentage
  DOCUMENT_ONLY       // no quantitative entry; compliance proven by uploaded document
  TEXT_RESPONSE       // free-text answer is the primary evidence
}

enum RequirementCriticality {
  CRITICAL      // Maps to RSPO Major NC; non-conformance blocks certification
  NON_CRITICAL  // Maps to RSPO Minor NC; non-conformance requires corrective action
}

enum ChecklistStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  UNDER_AUDIT
  CERTIFIED
  LOCKED
}

enum ChecklistItemStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETE
  NOT_APPLICABLE
}

enum DataEntryType {
  FORM01_ABSOLUTE
  FORM02_RATE
  DOCUMENT_ONLY
  TEXT
}

enum GHGScope {
  SCOPE1
  SCOPE2
  SCOPE3
  NA
}

enum AuditType {
  INITIAL
  SURVEILLANCE
  RECERTIFICATION
}

enum AuditStatus {
  SCHEDULED
  IN_PROGRESS
  FINDINGS_REVIEW
  PUBLISHED
  WITHDRAWN
}

enum FindingType {
  CONFORMANT
  NON_CONFORMANT_MAJOR
  NON_CONFORMANT_MINOR
  OBSERVATION
  NOT_APPLICABLE
}

enum FindingStatus {
  OPEN
  CLOSED
  VERIFIED
}

enum AuditReportStatus {
  DRAFT
  FINAL
}

enum ImportStatus {
  PENDING
  PROCESSING
  NEEDS_MAPPING
  COMPLETED
  FAILED
}

enum ImportFileType {
  CSV
  XLSX
}

enum ShipmentDirection {
  INBOUND
  OUTBOUND
}

enum CertificationStatus {
  CERTIFIED
  NON_CERTIFIED
}

enum ShipmentSource {
  MANUAL
  CSV_IMPORT
  API
}

enum LinkedEntityType {
  CHECKLIST_ITEM
  AUDIT_FINDING
  MASS_BALANCE_ENTRY
  SHIPMENT
}

enum IntegrationSystemType {
  SAP
  WEIGHBRIDGE_GENERIC
  ERP_GENERIC
  CUSTOM_API
}

enum DueDateStatus {
  OVERDUE    // due_date <= today
  DUE_SOON   // due_date within 7 calendar days
  ON_TRACK   // due_date > 7 days away
  NO_DATE    // due_date is null
}

enum MaterialType {
  CRUDE_PALM_OIL
  PALM_KERNEL_OIL
  PALM_KERNEL_EXPELLER
  PALM_FATTY_ACID_DISTILLATE
  REFINED_BLEACHED_DEODORISED_OIL
  NATURAL_GAS
  GRID_ELECTRICITY
  DIESEL
  POME_METHANE
  BIOMASS
  OTHER
}

enum LLMProvider {
  ANTHROPIC_CLAUDE
  GOOGLE_GEMINI
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 6.1 ORGANISATION AND USERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

model Organisation {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique // URL-safe identifier
  country     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  mills       Mill[]
  users       User[]
}

model Mill {
  id                    String   @id @default(cuid())
  organisationId        String
  organisation          Organisation @relation(fields: [organisationId], references: [id])

  name                  String
  code                  String   @unique // Short internal code, e.g. "MY-ML-001"
  location              String   // Free-text address or GPS description
  country               String
  latitude              Decimal? @db.Decimal(10, 7)
  longitude             Decimal? @db.Decimal(10, 7)
  isActive              Boolean  @default(true)

  // Certification status per regulation â€” updated on Checklist status transitions
  isccEuCertStatus      String?  // e.g. "Certified", "In Progress", "Not Started"
  isccEuCertExpiry      DateTime?
  isccPlusCertStatus    String?
  isccPlusCertExpiry    DateTime?
  rspoPcCertStatus      String?
  rspoPcCertExpiry      DateTime?
  rspoSccsCertStatus    String?
  rspoSccsCertExpiry    DateTime?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  users                 User[]
  checklists            Checklist[]
  massBalanceEntries    MassBalanceEntry[]
  shipments             ShipmentRecord[]
  imports               ImportJob[]
  integrationConfigs    IntegrationConfig[]
  audits                Audit[]

  @@index([organisationId])
}

model User {
  id               String   @id @default(cuid())
  // supabaseUserId links to auth.users in Supabase; must be unique
  supabaseUserId   String   @unique
  email            String   @unique
  name             String
  role             UserRole
  isActive         Boolean  @default(true)

  // Exactly one of organisationId or millId must be set, enforced at app level.
  // Super Admin and Aggregator Manager belong to the Organisation; mill roles belong to a Mill.
  organisationId   String?
  organisation     Organisation? @relation(fields: [organisationId], references: [id])
  millId           String?
  mill             Mill?    @relation(fields: [millId], references: [id])

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // Relations
  assignedChecklistItems    ChecklistItem[]       @relation("AssignedStaff")
  reviewedChecklistItems    ChecklistItem[]       @relation("AggregatorReviewer")
  comments                  ChecklistItemComment[]
  dataEntries               DataEntry[]
  uploadedDocuments         Document[]
  auditsAsAuditor           Audit[]
  auditReportsReviewed      AuditReport[]
  imports                   ImportJob[]

  @@index([supabaseUserId])
  @@index([millId])
  @@index([organisationId])
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 6.2 REGULATION FRAMEWORK
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

model RegulationProfile {
  id             String         @id @default(cuid())
  regulation     RegulationCode
  version        String         // e.g. "2024-v1", "RSPO-PC-2023"
  name           String         // Human-readable, e.g. "ISCC EU 2024 v1"
  description    String?
  isActive       Boolean        @default(true) // Only one active profile per regulation enforced at app level
  publishedAt    DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  pillars        RequirementPillar[]
  checklists     Checklist[]

  @@unique([regulation, version])
  @@index([regulation, isActive])
}

model RequirementPillar {
  id                  String            @id @default(cuid())
  profileId           String
  profile             RegulationProfile @relation(fields: [profileId], references: [id])
  code                String            // e.g. "ENV", "SOC", "GOV"
  name                String            // e.g. "Environmental", "Social", "Governance"
  displayOrder        Int               @default(0)
  createdAt           DateTime          @default(now())

  categories          RequirementCategory[]

  @@unique([profileId, code])
  @@index([profileId])
}

model RequirementCategory {
  id           String            @id @default(cuid())
  pillarId     String
  pillar       RequirementPillar @relation(fields: [pillarId], references: [id])
  code         String            // e.g. "ENV-01"
  name         String            // e.g. "GHG Emissions"
  displayOrder Int               @default(0)
  createdAt    DateTime          @default(now())

  requirements Requirement[]

  @@unique([pillarId, code])
  @@index([pillarId])
}

model Requirement {
  id              String                 @id @default(cuid())
  categoryId      String
  category        RequirementCategory    @relation(fields: [categoryId], references: [id])

  code            String                 // e.g. "ENV-01-GHG-001" â€” unique within a profile
  name            String
  description     String                 // What this requirement measures or proves
  guidanceText    String?                // Guidance for mill staff on how to complete it
  dataType        RequirementDataType
  requiresForm    Boolean                @default(true)  // false for DOCUMENT_ONLY items
  isActive        Boolean                @default(true)  // Inactive requirements excluded from new checklists
  criticality     RequirementCriticality @default(NON_CRITICAL)
  ghgScope        GHGScope?              // Set when this requirement contributes to GHG aggregation
  displayOrder    Int                    @default(0)
  unit            String?                // Expected input unit for form01 types, e.g. "tonnes", "MWh"
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt

  checklistItems  ChecklistItem[]

  @@unique([categoryId, code])
  @@index([categoryId, isActive])
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 6.3 MILL CHECKLISTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

model Checklist {
  id                String            @id @default(cuid())
  millId            String
  mill              Mill              @relation(fields: [millId], references: [id])
  profileId         String
  profile           RegulationProfile @relation(fields: [profileId], references: [id])
  regulation        RegulationCode    // Denormalised for fast filtering without join

  // Reporting period: typically calendar year or half-year
  periodStart       DateTime
  periodEnd         DateTime

  status            ChecklistStatus   @default(DRAFT)
  submittedAt       DateTime?
  submittedById     String?           // User who submitted (Mill Manager)
  reviewStartedAt   DateTime?
  reviewedById      String?           // Aggregator Manager who took ownership of review
  lockedAt          DateTime?
  lockedById        String?           // Super Admin who locked

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  items             ChecklistItem[]
  massBalanceEntries MassBalanceEntry[]
  audits            Audit[]

  @@unique([millId, profileId, periodStart, periodEnd])
  @@index([millId, regulation, status])
}

model ChecklistItem {
  id                      String              @id @default(cuid())
  checklistId             String
  checklist               Checklist           @relation(fields: [checklistId], references: [id])
  requirementId           String
  requirement             Requirement         @relation(fields: [requirementId], references: [id])

  status                  ChecklistItemStatus @default(NOT_STARTED)

  // Mill staff assignee â€” optional; if null, the item is unassigned
  assigneeId              String?
  assignee                User?               @relation("AssignedStaff", fields: [assigneeId], references: [id])
  dueDate                 DateTime?
  // Computed and stored: overdue | due_soon | on_track | no_date
  // Recomputed by a scheduled job or on read via a DB function.
  dueDateStatus           DueDateStatus       @default(NO_DATE)

  completedAt             DateTime?

  // Aggregator review fields
  aggregatorReviewed      Boolean             @default(false)
  aggregatorReviewedAt    DateTime?
  aggregatorReviewerId    String?
  aggregatorReviewer      User?               @relation("AggregatorReviewer", fields: [aggregatorReviewerId], references: [id])

  createdAt               DateTime            @default(now())
  updatedAt               DateTime            @updatedAt

  comments                ChecklistItemComment[]
  dataEntries             DataEntry[]
  documents               Document[]          @relation("ChecklistItemDocuments")
  auditFindings           AuditFinding[]

  @@unique([checklistId, requirementId])
  @@index([checklistId, status])
  @@index([assigneeId])
}

model ChecklistItemComment {
  id                  String   @id @default(cuid())
  checklistItemId     String
  checklistItem       ChecklistItem @relation(fields: [checklistItemId], references: [id])
  authorId            String
  author              User     @relation(fields: [authorId], references: [id])
  // Snapshot of the author's role at the time of comment â€” immutable for auditability
  roleAtTimeOfComment UserRole
  body                String   @db.Text
  createdAt           DateTime @default(now())
  // NO updatedAt â€” comments are immutable. Application layer must block PUT/PATCH/DELETE.

  @@index([checklistItemId, createdAt])
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 6.4 DATA ENTRY AND CALCULATIONS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

model DataEntry {
  id                  String        @id @default(cuid())
  checklistItemId     String
  checklistItem       ChecklistItem @relation(fields: [checklistItemId], references: [id])
  enteredById         String
  enteredBy           User          @relation(fields: [enteredById], references: [id])

  entryType           DataEntryType

  // Raw value as entered by the user (stored as Decimal for numeric types)
  valueRaw            Decimal?      @db.Decimal(18, 6)
  unitInput           String?       // Unit as entered, e.g. "m3", "kWh"
  textValue           String?       @db.Text // Used when entryType = TEXT

  // Converted / reference value after emission factor application
  valueConverted      Decimal?      @db.Decimal(18, 6)
  unitReference       String?       // Reference unit, e.g. "kgCO2e"

  emissionFactorId    String?       // Nullable; set only for GHG entries
  emissionFactor      EmissionFactor? @relation(fields: [emissionFactorId], references: [id])

  // For monthly granularity within a checklist period
  reportingMonth      DateTime?     // First day of the month, e.g. 2024-01-01

  // Sub-mill location granularity (e.g. a specific processing unit within the mill)
  location            String?

  notes               String?       @db.Text

  // Reconciliation tracking (populated by import reconciliation job)
  reconciliationFlag  Boolean       @default(false)
  reconciliationAcknowledgedAt   DateTime?
  reconciliationAcknowledgedById String?

  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  @@index([checklistItemId])
  @@index([emissionFactorId])
}

model EmissionFactor {
  id             String       @id @default(cuid())
  name           String
  materialType   MaterialType
  scope          GHGScope
  unitInput      String       // e.g. "m3", "kWh", "tonne"
  unitReference  String       // Always "kgCO2e"
  factorValue    Decimal      @db.Decimal(18, 8) // The conversion multiplier
  source         String       // Citation, e.g. "IPCC 2021 AR6", "ISCC EU 202-5 v4.1"
  validFrom      DateTime
  validTo        DateTime?    // Null = no expiry. Expired factors cannot be selected for new entries.
  isDefault      Boolean      @default(false) // If true, auto-selected for matching materialType on new DataEntry
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  dataEntries    DataEntry[]

  @@index([materialType, isDefault])
  @@index([validFrom, validTo])
}

model MassBalanceEntry {
  id                  String         @id @default(cuid())
  millId              String
  mill                Mill           @relation(fields: [millId], references: [id])
  checklistId         String
  checklist           Checklist      @relation(fields: [checklistId], references: [id])
  regulation          RegulationCode
  // Period mirrors the parent Checklist period for fast querying
  periodStart         DateTime
  periodEnd           DateTime
  materialType        MaterialType

  // Volumes in metric tonnes
  certifiedIn         Decimal        @db.Decimal(18, 4)  @default(0)
  nonCertifiedIn      Decimal        @db.Decimal(18, 4)  @default(0)
  certifiedOut        Decimal        @db.Decimal(18, 4)  @default(0)
  nonCertifiedOut     Decimal        @db.Decimal(18, 4)  @default(0)
  openingStock        Decimal        @db.Decimal(18, 4)  @default(0)
  // closingStock = openingStock + certifiedIn - certifiedOut (computed on write, never entered)
  closingStock        Decimal        @db.Decimal(18, 4)  @default(0)

  isReconciled        Boolean        @default(false)
  discrepancyFlag     Boolean        @default(false)
  discrepancyNotes    String?        @db.Text  // Required when discrepancyFlag is true after override
  // Set by Aggregator Manager when overriding a discrepancy
  discrepancyOverriddenById  String?
  discrepancyOverriddenAt    DateTime?
  openingStockConfirmed      Boolean   @default(false)
  openingStockConfirmedAt    DateTime?
  openingStockConfirmedById  String?

  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  documents           Document[]     @relation("MassBalanceDocuments")

  @@unique([millId, checklistId, regulation, materialType])
  @@index([millId, regulation, periodStart])
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 6.5 DOCUMENT MANAGEMENT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

model Document {
  id                String           @id @default(cuid())
  displayName       String
  filePath          String           // Supabase Storage object key
  fileType          String           // MIME type
  fileSize          Int              // Bytes
  uploadedById      String
  uploadedBy        User             @relation(fields: [uploadedById], references: [id])
  uploadedAt        DateTime         @default(now())

  // Polymorphic link â€” exactly one of the relation fields below will be non-null
  linkedEntityType  LinkedEntityType
  // Using nullable FK fields for each possible parent type.
  // Only the field matching linkedEntityType should be non-null.
  checklistItemId   String?
  checklistItem     ChecklistItem?   @relation("ChecklistItemDocuments", fields: [checklistItemId], references: [id])
  massBalanceEntryId String?
  massBalanceEntry  MassBalanceEntry? @relation("MassBalanceDocuments", fields: [massBalanceEntryId], references: [id])
  auditFindingId    String?
  auditFinding      AuditFinding?    @relation("AuditFindingDocuments", fields: [auditFindingId], references: [id])
  shipmentId        String?
  shipment          ShipmentRecord?  @relation("ShipmentDocuments", fields: [shipmentId], references: [id])

  isDeleted         Boolean          @default(false) // Soft delete only; hard delete never permitted
  deletedAt         DateTime?
  deletedById       String?

  @@index([checklistItemId])
  @@index([auditFindingId])
  @@index([massBalanceEntryId])
  @@index([shipmentId])
}

model ShipmentRecord {
  id                            String              @id @default(cuid())
  millId                        String
  mill                          Mill                @relation(fields: [millId], references: [id])

  direction                     ShipmentDirection
  materialType                  MaterialType
  volumeMt                      Decimal             @db.Decimal(18, 4)
  certificationStatus           CertificationStatus
  counterpartyName              String
  // Bill of lading or weighbridge ticket number â€” used for deduplication on import
  referenceNumber               String
  shipmentDate                  DateTime

  // ISCC / RSPO traceability field
  sustainabilityDeclarationNumber String?

  // GHG value in kgCO2e â€” computed from volumeMt Ã— relevant emission factor if available
  ghgValueKgco2e                Decimal?            @db.Decimal(18, 4)

  source                        ShipmentSource      @default(MANUAL)
  // FK to the ImportJob that created this record, if source = CSV_IMPORT
  importJobId                   String?
  importJob                     ImportJob?          @relation(fields: [importJobId], references: [id])

  // Double-accounting split â€” populated when Mill Manager confirms allocation
  isccAllocationPct             Decimal?            @db.Decimal(5, 2) // 0.00â€“100.00
  rspoAllocationPct             Decimal?            @db.Decimal(5, 2)
  allocationConfirmedAt         DateTime?
  allocationConfirmedById       String?

  createdAt                     DateTime            @default(now())
  updatedAt                     DateTime            @updatedAt

  documents                     Document[]          @relation("ShipmentDocuments")

  @@unique([millId, referenceNumber, shipmentDate]) // Deduplication key
  @@index([millId, shipmentDate])
  @@index([importJobId])
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 6.6 AUDIT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

model Audit {
  id              String      @id @default(cuid())
  millId          String
  mill            Mill        @relation(fields: [millId], references: [id])
  checklistId     String
  checklist       Checklist   @relation(fields: [checklistId], references: [id])
  regulation      RegulationCode

  auditType       AuditType
  auditorId       String
  auditor         User        @relation(fields: [auditorId], references: [id])

  periodStart     DateTime
  periodEnd       DateTime

  status          AuditStatus @default(SCHEDULED)
  scheduledDate   DateTime?
  conductedDate   DateTime?
  publishedAt     DateTime?

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  findings        AuditFinding[]
  reports         AuditReport[]
  // Latest report version for quick access â€” updated transactionally
  latestReportId  String?     @unique

  @@index([millId, status])
  @@index([auditorId])
  @@index([checklistId])
}

model AuditFinding {
  id                        String        @id @default(cuid())
  auditId                   String
  audit                     Audit         @relation(fields: [auditId], references: [id])
  checklistItemId           String
  checklistItem             ChecklistItem @relation(fields: [checklistItemId], references: [id])

  findingType               FindingType
  evidenceReviewed          String        @db.Text  // Description of evidence the auditor reviewed
  correctiveActionRequired  String?       @db.Text  // Required for NON_CONFORMANT_* findings
  correctiveActionDeadline  DateTime?
  findingStatus             FindingStatus @default(OPEN)

  createdAt                 DateTime      @default(now())
  updatedAt                 DateTime      @updatedAt

  documents                 Document[]    @relation("AuditFindingDocuments")

  @@unique([auditId, checklistItemId])
  @@index([auditId, findingStatus])
}

model AuditReport {
  id            String            @id @default(cuid())
  auditId       String
  audit         Audit             @relation(fields: [auditId], references: [id])

  version       Int               // Increments with each generation or edit; starts at 1
  contentJson   Json              // Structured report content; schema defined in lib/report-generator.ts
  generatedBy   LLMProvider
  llmModel      String            // Specific model string, e.g. "claude-3-5-sonnet-20241022"
  generatedAt   DateTime
  reviewedById  String?
  reviewedBy    User?             @relation(fields: [reviewedById], references: [id])
  reviewedAt    DateTime?
  status        AuditReportStatus @default(DRAFT)
  pdfPath       String?           // Supabase Storage key; set on export

  createdAt     DateTime          @default(now())

  @@unique([auditId, version])
  @@index([auditId, status])
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 6.7 IMPORTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

model ImportJob {
  id               String         @id @default(cuid())
  millId           String
  mill             Mill           @relation(fields: [millId], references: [id])
  uploadedById     String
  uploadedBy       User           @relation(fields: [uploadedById], references: [id])

  fileName         String
  fileType         ImportFileType
  filePath         String         // Supabase Storage key for the uploaded file
  status           ImportStatus   @default(PENDING)

  rowCountTotal    Int            @default(0)
  rowCountImported Int            @default(0)
  rowCountFailed   Int            @default(0)
  errorLog         Json?          // Array of {row: number, error: string} objects

  // Applied column mapping (copied from ImportColumnMapping at submission time)
  appliedMappingJson Json?

  createdAt        DateTime       @default(now())
  completedAt      DateTime?

  columnMappings   ImportColumnMapping[]
  shipments        ShipmentRecord[]

  @@index([millId, status])
}

model ImportColumnMapping {
  id            String    @id @default(cuid())
  millId        String
  // importJobId is nullable â€” mappings can be saved as reusable templates without being tied to a job
  importJobId   String?
  importJob     ImportJob? @relation(fields: [importJobId], references: [id])
  templateName  String
  // JSON object: { sourceColumn: gtFieldName }
  // e.g. { "Shipment Date": "shipmentDate", "Volume (MT)": "volumeMt" }
  mappingJson   Json
  lastUsedAt    DateTime  @default(now())
  createdAt     DateTime  @default(now())

  @@unique([millId, templateName])
  @@index([millId])
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 6.8 INTEGRATION PLACEHOLDERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

model IntegrationConfig {
  id           String                @id @default(cuid())
  millId       String
  mill         Mill                  @relation(fields: [millId], references: [id])
  systemType   IntegrationSystemType
  displayName  String
  // isActive is always false in v1 â€” no live connections
  isActive     Boolean               @default(false)
  // Stores placeholder settings: { endpointUrl: string, authType: "api_key" | "oauth2" | "none" }
  configJson   Json
  createdAt    DateTime              @default(now())
  updatedAt    DateTime              @updatedAt

  @@unique([millId, systemType])
  @@index([millId])
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// AUDIT / ACTIVITY LOG
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Append-only log for critical state transitions (period lock/unlock, forced status changes)
model ActivityLog {
  id          String   @id @default(cuid())
  actorId     String   // User who performed the action
  action      String   // e.g. "CHECKLIST_LOCKED", "STATUS_FORCED", "PERIOD_UNLOCKED"
  entityType  String   // e.g. "Checklist", "Audit"
  entityId    String
  reason      String   @db.Text // Mandatory for forced transitions and lock/unlock
  metadata    Json?    // Additional context (old status, new status, etc.)
  createdAt   DateTime @default(now())

  @@index([entityType, entityId])
  @@index([actorId])
}
```

---

## 7. Business Logic Rules

> All rules are **service-layer invariants**. API routes call service functions; service functions enforce these rules before touching the database.

### 7.1 Period Locking

1. A `Checklist` with `status = LOCKED` is fully immutable. Any attempt to create, update, or delete a `DataEntry`, `ChecklistItem`, `MassBalanceEntry`, `ShipmentRecord`, or `Document` linked to it **must be rejected** with HTTP 409 and error code `PERIOD_LOCKED`.
2. Only `SUPER_ADMIN` may call the lock or unlock endpoints.
3. Locking: sets `lockedAt = now()`, `lockedById = actor.id`, `status = LOCKED`. Writes an `ActivityLog` row with action `CHECKLIST_LOCKED` and a mandatory `reason` string from the request body.
4. Unlocking: sets `lockedAt = null`, `lockedById = null`, `status = CERTIFIED`. Writes an `ActivityLog` row with action `CHECKLIST_UNLOCKED` and a mandatory `reason`.
5. A `Checklist` cannot be locked unless `status = CERTIFIED`. Attempting returns HTTP 422, error code `INVALID_STATUS_FOR_LOCK`.

### 7.2 Submission Flow State Machine

Valid `ChecklistStatus` transitions only (all others rejected with HTTP 422):

| From | To | Actor | Condition |
|------|----|-------|-----------|
| DRAFT | SUBMITTED | Mill Manager, Super Admin | Pre-submission validation passes |
| SUBMITTED | UNDER_REVIEW | Aggregator Manager, Super Admin | â€” |
| UNDER_REVIEW | DRAFT | Aggregator Manager, Super Admin | Comment required |
| UNDER_REVIEW | UNDER_AUDIT | Aggregator Manager, Super Admin | Audit record created atomically |
| UNDER_AUDIT | CERTIFIED | System only | Triggered by Audit PUBLISHED |
| CERTIFIED | LOCKED | Super Admin | Reason required |
| LOCKED | CERTIFIED | Super Admin | Reason required |
| Any | Any | Super Admin | Force transition; reason mandatory; ActivityLog entry |

**DRAFT â†’ SUBMITTED pre-flight checks (all must pass):**
- No `MassBalanceEntry` for this checklist has `discrepancyFlag = true` with no override.
- No `MassBalanceEntry` has `openingStockConfirmed = false`.
- No `DataEntry` has `reconciliationFlag = true` and `reconciliationAcknowledgedAt = null`.
- No `ShipmentRecord` is double-accounting-flagged without a confirmed allocation split.
- On failure: HTTP 422 with `SUBMISSION_BLOCKED` and a structured list of blocking record IDs.
- On success: send notification to all `AGGREGATOR_MANAGER` and `SUPER_ADMIN` users.

**UNDER_REVIEW â†’ DRAFT:** Service creates a `ChecklistItemComment` atomically on at least one item as part of the same transaction, authored by the Aggregator Manager.

**UNDER_REVIEW â†’ UNDER_AUDIT:** Service creates an `Audit` record with `status = SCHEDULED`. The `auditorId` from the request is required. Mill users' DataEntry rows become read-only (service checks checklist status before any write).

**UNDER_AUDIT â†’ CERTIFIED:** Only `lib/audit.ts` triggers this when an Auditor publishes the Audit. Updated atomically with the Mill's certification status fields for the relevant regulation.

### 7.3 Mass Balance Rules

**MB-1: Certified output cap**

```
certifiedOut <= (openingStock + certifiedIn)
```

If violated: set `discrepancyFlag = true`. Block save unless actor is Aggregator Manager+ AND `discrepancyNotes` is provided. Mill users receive HTTP 422 `MASS_BALANCE_OVERSCHEDULE`.

**MB-2: Closing stock computation (server-side always)**

```typescript
closingStock = openingStock + certifiedIn - certifiedOut
```

`closingStock` must never appear in the request body â€” if present, silently ignored.

**MB-3: Period continuity**

When a new Checklist is created, the service queries `MassBalanceEntry` for same (mill, regulation, materialType) where `periodEnd` immediately precedes the new `periodStart`. Pre-fills `openingStock` from that record's `closingStock`. If no prior period, pre-fills `openingStock = 0`. Mill Manager must call `confirm-opening-stock` before the checklist can be submitted.

**MB-4:** Submission blocked if any `MassBalanceEntry` for the checklist has `openingStockConfirmed = false`.

### 7.4 GHG Calculations

**GHG-1: Immediate computation on save.**
When `DataEntry` is saved with a non-null `emissionFactorId`:
1. Fetch `EmissionFactor`.
2. Compute `valueConverted = valueRaw Ã— factorValue` using Decimal arithmetic (never floating-point).
3. Set `unitReference = emissionFactor.unitReference`.
4. Store both in the same DB write. Never recompute on read.

**GHG-2: Expired factor rejection.**
```typescript
if (factor.validTo !== null && factor.validTo < new Date()) {
  throw ApiError(422, 'EMISSION_FACTOR_EXPIRED');
}
```
Existing records retaining expired factors are unaffected.

**GHG-3: Period aggregate.**
`lib/ghg-calculations.ts` exposes `computeChecklistGHGTotal(checklistId)`:
- Joins `ChecklistItem â†’ DataEntry â†’ Requirement` where `Requirement.ghgScope IS NOT NULL`.
- Returns `{ scope1: Decimal, scope2: Decimal, scope3: Decimal, total: Decimal }`.
- Read-only; does not mutate any record.

**GHG-4: Default factor auto-selection.**
On new `DataEntry` where `Requirement.ghgScope` is not null and no `emissionFactorId` supplied: look up `EmissionFactor` with `isDefault = true` and matching `materialType`. If found and not expired, auto-apply. If not found, save with `valueConverted = null`.

### 7.5 Reconciliation Flags

**REC-1: Post-import comparison.**
After `ImportJob` completes, `lib/imports.ts` groups new `ShipmentRecord` rows by `(millId, materialType, month)`. Compares `volumeMt` sum against `DataEntry` totals for the same scope. If difference > 2% of the larger value, sets `reconciliationFlag = true` on affected `DataEntry` records.

**REC-2: Acknowledgement gate.**
DRAFT â†’ SUBMITTED blocked if any `DataEntry` for this checklist has `reconciliationFlag = true` AND `reconciliationAcknowledgedAt = null`. Returns HTTP 422 `UNACKNOWLEDGED_RECONCILIATION_FLAGS` with a list of affected DataEntry IDs.

**REC-3: Acknowledgement mechanics.**
`PATCH /api/data-entries/:id/acknowledge-reconciliation` sets `reconciliationAcknowledgedAt = now()` and `reconciliationAcknowledgedById`. Permanent; cannot be reversed.

### 7.6 Double-Accounting Prevention

**DA-1: Detection.** At DRAFT â†’ SUBMITTED, query all certified `ShipmentRecord` rows for this mill and period. For each, check if it is referenced in both an ISCC and an RSPO mass balance entry.

**DA-2: Blocking.** If any such `ShipmentRecord` has `allocationConfirmedAt = null`, block transition with HTTP 422 `DOUBLE_ACCOUNTING_UNRESOLVED` and the list of offending IDs.

**DA-3: Allocation confirmation.**
`PATCH /api/shipments/:id/confirm-allocation` with `{ isccAllocationPct, rspoAllocationPct }`. Service validates `isccAllocationPct + rspoAllocationPct = 100.00`. Sets `allocationConfirmedAt`, `allocationConfirmedById`. Mass balance calculations use the allocated proportion per scheme, not the full volume.

### 7.7 Audit Report Generation

**AR-1: Payload isolation.**
`lib/report-generator.ts` exports `buildReportPayload(auditId)`. Returns a typed, serialisable JSON object. Raw Prisma objects must never be passed to LLM calls.

Payload schema:
```typescript
interface ReportPayload {
  audit: { id; millName; regulation; auditType; periodStart; periodEnd; conductedDate };
  mill: { name; code; country; location; certificationHistory };
  summary: { totalItems; conformant; nonConformantMajor; nonConformantMinor; observations; notApplicable };
  findings: Array<{
    requirementCode; requirementName; pillar; category; criticality;
    findingType; evidenceReviewed; correctiveActionRequired; correctiveActionDeadline; findingStatus;
  }>;
  ghgSummary: { scope1; scope2; scope3; total };
  massBalanceSummary: Array<{ materialType; certifiedIn; certifiedOut; openingStock; closingStock }>;
}
```

**AR-2: Draft-first.** Every report created by the generate endpoint starts as `status = DRAFT`.

**AR-3: Finalisation.** Only Auditor or Super Admin may call `PATCH /api/audit-reports/:id/finalise`. Sets `status = FINAL`, `reviewedById`, `reviewedAt`. Once final, the report row is immutable; regeneration creates a new version row.

**AR-4: Version history.** Each call to generate or manual edit creates a new `AuditReport` row with `version = max(existing) + 1`. `Audit.latestReportId` updated in the same transaction.

**AR-5: Persistent notice.** `GET /api/audit-reports/:id` returns `requiresHumanReview: boolean = (status === 'DRAFT')`. The UI must render a persistent banner when this is `true`. The notice cannot be dismissed.

**AR-6: PDF export.** Only permitted when `status = FINAL`. Stores the file in Supabase Storage; sets `pdfPath`. Subsequent calls return the existing signed URL unless `?regenerate=true` is passed.

---

## 8. API Design

All routes are Next.js App Router API routes (`app/api/...`). A shared `withAuth(handler, { roles })` wrapper validates the Supabase session and enforces role requirements before the handler runs. RLS is the database-level enforcement; the middleware is the application-level guard.

**Standard response envelope:**
```json
{ "data": { ... }, "error": null, "meta": { "page": 1, "pageSize": 50, "total": 200 } }
```
On error: `data` is null; `error` is `{ "code": "SCREAMING_SNAKE", "message": "Human-readable" }`.

**Pagination:** All list endpoints accept `?page=1&pageSize=50`. Default 50, max 200.

**`dueDateStatus`:** All endpoints returning `ChecklistItem` objects compute and return `dueDateStatus` live from server time (using the same thresholds: overdue â‰¤ today, due_soon â‰¤ 7 days, on_track > 7 days, no_date if null).

---

### 8.1 `/api/auth`

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| POST | `/api/auth/login` | Public | `{ email, password }` | `{ user, session }` | Delegates to `supabase.auth.signInWithPassword`. Sets httpOnly session cookie. |
| POST | `/api/auth/logout` | Authenticated | â€” | `{ success: true }` | Calls `supabase.auth.signOut`. Clears cookie. |
| GET | `/api/auth/session` | Authenticated | â€” | `{ id, email, name, role, millId, organisationId }` | Returns current user from session + User row join. |
| POST | `/api/auth/invite` | SUPER_ADMIN | `{ email, name, role, millId? }` | `{ user }` | Creates Supabase Auth invite + User row. Mill roles require `millId`. |
| POST | `/api/auth/reset-password` | Public | `{ email }` | `{ success: true }` | Delegates to Supabase Auth. |

---

### 8.2 `/api/mills`

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| GET | `/api/mills` | AGGREGATOR+ | `?isActive=` | `[Mill + certStatus + progressSnapshot]` | |
| POST | `/api/mills` | SUPER_ADMIN | `{ name, code, location, country, lat?, lng? }` | `{ mill }` | Does not auto-generate checklists. |
| GET | `/api/mills/:id` | AGGREGATOR+ or own mill | â€” | `{ mill, users[], checklists[], activeAudits[] }` | |
| PATCH | `/api/mills/:id` | SUPER_ADMIN | Partial mill fields | `{ mill }` | |
| DELETE | `/api/mills/:id` | SUPER_ADMIN | â€” | `{ success }` | Soft delete: `isActive = false`. |
| GET | `/api/mills/:id/stats` | AGGREGATOR+ or own mill | `?checklistId=` | Mill stats payload | See Â§8.17 for payload shape. |

---

### 8.3 `/api/users`

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| GET | `/api/users` | SUPER_ADMIN or MILL_MANAGER (own mill) | `?millId=&role=` | `[User]` | Mill Manager sees own mill only. |
| POST | `/api/users` | SUPER_ADMIN or MILL_MANAGER (own mill) | `{ email, name, role, millId? }` | `{ user }` | Mill Manager can only create MILL_STAFF for own mill. |
| GET | `/api/users/:id` | Self or SUPER_ADMIN | â€” | `{ user }` | |
| PATCH | `/api/users/:id` | SUPER_ADMIN or self (name only) | `{ name?, role?, isActive? }` | `{ user }` | Role changes by SUPER_ADMIN only. |
| DELETE | `/api/users/:id` | SUPER_ADMIN | â€” | `{ success }` | Sets `isActive = false`. |

---

### 8.4 `/api/regulation-profiles`

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| GET | `/api/regulation-profiles` | Authenticated | `?regulation=` | `[RegulationProfile]` | |
| POST | `/api/regulation-profiles` | SUPER_ADMIN | `{ regulation, version, name, description? }` | `{ profile }` | |
| GET | `/api/regulation-profiles/:id` | Authenticated | â€” | `{ profile, pillars[{ categories[{ requirements[] }] }] }` | Full nested tree. |
| PATCH | `/api/regulation-profiles/:id` | SUPER_ADMIN | `{ name?, description?, isActive? }` | `{ profile }` | Cannot change `regulation` or `version`. |
| POST | `/api/regulation-profiles/:id/pillars` | SUPER_ADMIN | `{ code, name, displayOrder }` | `{ pillar }` | |
| PATCH | `/api/regulation-profiles/:id/pillars/:pillarId` | SUPER_ADMIN | Partial | `{ pillar }` | |
| POST | `/api/regulation-profiles/:id/pillars/:pillarId/categories` | SUPER_ADMIN | `{ code, name, displayOrder }` | `{ category }` | |
| PATCH | `â€¦/categories/:catId` | SUPER_ADMIN | Partial | `{ category }` | |
| POST | `/api/regulation-profiles/:id/requirements` | SUPER_ADMIN | Full requirement fields | `{ requirement }` | `categoryId` must belong to this profile. |
| PATCH | `/api/regulation-profiles/:id/requirements/:reqId` | SUPER_ADMIN | Partial | `{ requirement }` | Deactivating does not affect existing ChecklistItems. |

---

### 8.5 `/api/checklists`

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| GET | `/api/checklists` | AGGREGATOR+ or own mill | `?millId=&regulation=&status=&year=` | `[Checklist + itemCounts]` | |
| POST | `/api/checklists` | SUPER_ADMIN | `{ millId, profileId, periodStart, periodEnd }` | `{ checklist, itemsCreated }` | Auto-generates one `ChecklistItem` per active `Requirement`. |
| GET | `/api/checklists/:id` | AGGREGATOR+ or own mill | â€” | `{ checklist, items[], stats, ghgTotal }` | |
| PATCH | `/api/checklists/:id/submit` | MILL_MANAGER, SUPER_ADMIN | `{ note? }` | `{ checklist }` | Runs all pre-submission validations. |
| PATCH | `/api/checklists/:id/start-review` | AGGREGATOR_MANAGER, SUPER_ADMIN | â€” | `{ checklist }` | SUBMITTED â†’ UNDER_REVIEW. |
| PATCH | `/api/checklists/:id/return-to-mill` | AGGREGATOR_MANAGER, SUPER_ADMIN | `{ checklistItemId, commentBody }` | `{ checklist }` | UNDER_REVIEW â†’ DRAFT; creates comment atomically. |
| PATCH | `/api/checklists/:id/send-to-audit` | AGGREGATOR_MANAGER, SUPER_ADMIN | `{ auditorId, scheduledDate?, auditType }` | `{ checklist, audit }` | UNDER_REVIEW â†’ UNDER_AUDIT; creates Audit atomically. |
| PATCH | `/api/checklists/:id/lock` | SUPER_ADMIN | `{ reason }` | `{ checklist }` | CERTIFIED â†’ LOCKED. |
| PATCH | `/api/checklists/:id/unlock` | SUPER_ADMIN | `{ reason }` | `{ checklist }` | LOCKED â†’ CERTIFIED. |
| PATCH | `/api/checklists/:id/force-status` | SUPER_ADMIN | `{ status, reason }` | `{ checklist }` | Bypasses state machine; logged to ActivityLog. |

---

### 8.6 `/api/checklist-items`

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| GET | `/api/checklist-items` | AGGREGATOR+ or own mill | `?checklistId=&status=&pillarId=&categoryId=&assigneeId=` | `[ChecklistItem + requirement + latestComment]` | Hierarchical filter support. |
| GET | `/api/checklist-items/:id` | AGGREGATOR+ or own mill | â€” | `{ item, requirement, comments[], dataEntries[], documents[], auditFinding? }` | |
| PATCH | `/api/checklist-items/:id` | MILL_STAFF+ or AGGREGATOR+ | `{ status?, assigneeId?, dueDate?, aggregatorReviewed? }` | `{ item }` | Blocked if LOCKED or UNDER_AUDIT (mill users). `aggregatorReviewed` only by AGGREGATOR_MANAGER+. |
| POST | `/api/checklist-items/:id/comments` | Authenticated | `{ body }` | `{ comment }` | Immutable. `roleAtTimeOfComment` populated from session. |
| GET | `/api/checklist-items/:id/comments` | Authenticated | â€” | `[ChecklistItemComment]` | Ordered by `createdAt` ASC. |

---

### 8.7 `/api/data-entries`

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| GET | `/api/data-entries` | Own mill or AGGREGATOR+ | `?checklistItemId=` | `[DataEntry]` | |
| POST | `/api/data-entries` | MILL_STAFF+ (own mill) | `{ checklistItemId, entryType, valueRaw?, unitInput?, textValue?, emissionFactorId?, reportingMonth?, location?, notes? }` | `{ dataEntry }` | Triggers GHG compute; blocked if LOCKED or UNDER_AUDIT. |
| GET | `/api/data-entries/:id` | Own mill or AGGREGATOR+ | â€” | `{ dataEntry, emissionFactor? }` | |
| PATCH | `/api/data-entries/:id` | MILL_STAFF+ (own mill) | Same optional fields | `{ dataEntry }` | Full GHG recompute if `emissionFactorId` changes; blocked if LOCKED or UNDER_AUDIT. |
| DELETE | `/api/data-entries/:id` | MILL_MANAGER+ (own mill) | â€” | `{ success }` | Hard delete only when `Checklist.status = DRAFT`. |
| PATCH | `/api/data-entries/:id/acknowledge-reconciliation` | MILL_MANAGER+ | â€” | `{ dataEntry }` | Sets acknowledgement fields. |

---

### 8.8 `/api/mass-balance`

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| GET | `/api/mass-balance` | Own mill or AGGREGATOR+ | `?checklistId=&materialType=` | `[MassBalanceEntry]` | |
| POST | `/api/mass-balance` | MILL_MANAGER+ (own mill) | `{ checklistId, regulation, materialType, certifiedIn, nonCertifiedIn, certifiedOut, nonCertifiedOut }` | `{ entry }` | Service computes `closingStock`; pre-fills `openingStock` from prior period; validates MB-1. |
| PATCH | `/api/mass-balance/:id` | MILL_MANAGER+ (own mill) | Updatable volume fields | `{ entry }` | Recomputes `closingStock`; validates MB-1; blocked if LOCKED. |
| PATCH | `/api/mass-balance/:id/confirm-opening-stock` | MILL_MANAGER+ | `{ confirmedValue }` | `{ entry }` | Sets `openingStock`, `openingStockConfirmed = true`. Only allowed when no prior period exists. |
| PATCH | `/api/mass-balance/:id/override-discrepancy` | AGGREGATOR_MANAGER+ | `{ discrepancyNotes }` | `{ entry }` | Saves override with discrepancy fields set. |

---

### 8.9 `/api/shipments`

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| GET | `/api/shipments` | Own mill or AGGREGATOR+ | `?millId=&direction=&materialType=&from=&to=` | `[ShipmentRecord]` | |
| POST | `/api/shipments` | MILL_STAFF+ (own mill) | Full shipment fields | `{ shipment }` | |
| GET | `/api/shipments/:id` | Own mill or AGGREGATOR+ | â€” | `{ shipment, documents[] }` | |
| PATCH | `/api/shipments/:id` | MILL_STAFF+ (own mill) | Partial fields | `{ shipment }` | Blocked if LOCKED. |
| DELETE | `/api/shipments/:id` | MILL_MANAGER+ (own mill) | â€” | `{ success }` | Blocked if LOCKED. Hard delete. |
| PATCH | `/api/shipments/:id/confirm-allocation` | MILL_MANAGER+ | `{ isccAllocationPct, rspoAllocationPct }` | `{ shipment }` | Validates sum = 100.00. |

---

### 8.10 `/api/imports`

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| POST | `/api/imports/upload` | MILL_STAFF+ (own mill) | `formData: { file, millId, checklistId }` | `{ importJob }` | Uploads to Supabase Storage; creates `ImportJob`. Auto-matches saved template if available â†’ `PROCESSING`; else â†’ `NEEDS_MAPPING`. |
| GET | `/api/imports/:jobId` | Own mill or AGGREGATOR+ | â€” | `{ importJob, previewRows[5], detectedHeaders[] }` | |
| POST | `/api/imports/:jobId/mapping` | MILL_STAFF+ (own mill) | `{ mappingJson, saveAsTemplate?, templateName? }` | `{ importJob }` | Sets `PROCESSING`; triggers async import. |
| GET | `/api/imports/:jobId/status` | Own mill or AGGREGATOR+ | â€” | `{ status, rowCounts, errorLog }` | Polling endpoint. |
| POST | `/api/imports/:jobId/confirm` | MILL_MANAGER+ | â€” | `{ importJob }` | Sets `COMPLETED`; triggers reconciliation check. |
| GET | `/api/imports/templates` | Own mill | `?millId=` | `[ImportColumnMapping]` | |
| DELETE | `/api/imports/templates/:id` | MILL_MANAGER+ | â€” | `{ success }` | |

---

### 8.11 `/api/emission-factors`

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| GET | `/api/emission-factors` | Authenticated | `?materialType=&scope=&activeOnly=true` | `[EmissionFactor]` | `activeOnly=true` filters `validTo < now()`. |
| POST | `/api/emission-factors` | SUPER_ADMIN | `{ name, materialType, scope, unitInput, unitReference, factorValue, source, validFrom, validTo?, isDefault }` | `{ factor }` | If `isDefault=true`, clears existing default for same `materialType`. |
| GET | `/api/emission-factors/:id` | Authenticated | â€” | `{ factor }` | |
| PATCH | `/api/emission-factors/:id` | SUPER_ADMIN | Partial | `{ factor }` | To change `factorValue`: create new factor, expire old one. Existing DataEntry records unaffected. |
| DELETE | `/api/emission-factors/:id` | SUPER_ADMIN | â€” | `{ success }` | 409 if any DataEntry references this factor. |

---

### 8.12 `/api/audits`

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| GET | `/api/audits` | AGGREGATOR+ or assigned AUDITOR | `?millId=&status=&regulation=` | `[Audit + findingStats]` | Auditors see only their assigned audits. |
| POST | `/api/audits` | SUPER_ADMIN, AGGREGATOR_MANAGER | `{ millId, checklistId, regulation, auditType, auditorId, scheduledDate? }` | `{ audit }` | Normally triggered via `send-to-audit` checklist endpoint. |
| GET | `/api/audits/:id` | AGGREGATOR+ or assigned AUDITOR | â€” | `{ audit, findings[], latestReport? }` | |
| PATCH | `/api/audits/:id` | AGGREGATOR_MANAGER+ | `{ status?, scheduledDate?, conductedDate? }` | `{ audit }` | SCHEDULEDâ†’IN_PROGRESS, IN_PROGRESSâ†’FINDINGS_REVIEW. |
| PATCH | `/api/audits/:id/publish` | AUDITOR, SUPER_ADMIN | â€” | `{ audit }` | FINDINGS_REVIEWâ†’PUBLISHED. Requires `latestReportId` â†’ FINAL report. Atomically sets `Checklist.status = CERTIFIED`. |
| PATCH | `/api/audits/:id/withdraw` | SUPER_ADMIN | `{ reason }` | `{ audit }` | Sets WITHDRAWN; logged to ActivityLog. |

---

### 8.13 `/api/audit-findings`

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| GET | `/api/audit-findings` | AGGREGATOR+ or assigned AUDITOR | `?auditId=&findingType=&findingStatus=` | `[AuditFinding]` | Mill users see findings only after Audit is PUBLISHED. |
| POST | `/api/audit-findings` | AUDITOR, SUPER_ADMIN | `{ auditId, checklistItemId, findingType, evidenceReviewed, correctiveActionRequired?, correctiveActionDeadline? }` | `{ finding }` | |
| GET | `/api/audit-findings/:id` | AGGREGATOR+ or assigned AUDITOR | â€” | `{ finding, documents[] }` | |
| PATCH | `/api/audit-findings/:id` | AUDITOR, SUPER_ADMIN | Partial | `{ finding }` | Blocked once Audit is PUBLISHED. |
| PATCH | `/api/audit-findings/bulk` | AUDITOR, SUPER_ADMIN | `{ findings: [{id, ...}] }` | `{ updated: number }` | All findings must belong to same audit. |
| DELETE | `/api/audit-findings/:id` | AUDITOR, SUPER_ADMIN | â€” | `{ success }` | Blocked once Audit is PUBLISHED. |

---

### 8.14 `/api/audit-reports`

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| GET | `/api/audit-reports` | AUDITOR or AGGREGATOR+ | `?auditId=` | `[AuditReport]` (version list, no `contentJson`) | |
| POST | `/api/audit-reports/generate` | AUDITOR, SUPER_ADMIN | `{ auditId, provider?, model? }` | `{ report }` | Calls `buildReportPayload`, sends to LLM layer, creates new version row. |
| GET | `/api/audit-reports/:id` | AUDITOR or AGGREGATOR+ | â€” | `{ report, requiresHumanReview }` | |
| PATCH | `/api/audit-reports/:id` | AUDITOR, SUPER_ADMIN | `{ contentJson }` | `{ report }` | Creates NEW version row; does not mutate existing. |
| PATCH | `/api/audit-reports/:id/finalise` | AUDITOR, SUPER_ADMIN | â€” | `{ report }` | Sets FINAL; immutable after. |
| POST | `/api/audit-reports/:id/export-pdf` | AUDITOR, SUPER_ADMIN | `?regenerate=false` | `{ pdfUrl }` | FINAL only. Returns existing signed URL unless `regenerate=true`. |

---

### 8.15 `/api/documents`

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| POST | `/api/documents/upload` | Authenticated | `formData: { file, linkedEntityType, linkedEntityId }` | `{ document }` | Uploads to Supabase Storage; creates Document row; validates actor write access to entity. |
| GET | `/api/documents` | Authenticated | `?linkedEntityType=&linkedEntityId=` | `[Document]` | Excludes soft-deleted. |
| GET | `/api/documents/:id/download` | Authenticated | â€” | Redirect to signed Supabase Storage URL (60 min) | Validates read access before signing. |
| DELETE | `/api/documents/:id` | Own uploader or SUPER_ADMIN | â€” | `{ success }` | Soft delete only. |

---

### 8.16 `/api/integration-configs`

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| GET | `/api/integration-configs` | SUPER_ADMIN or own MILL_MANAGER | `?millId=` | `[IntegrationConfig]` | |
| POST | `/api/integration-configs` | SUPER_ADMIN | `{ millId, systemType, displayName, configJson }` | `{ config }` | `isActive` forced to `false` in v1. |
| PATCH | `/api/integration-configs/:id` | SUPER_ADMIN | `{ displayName?, configJson? }` | `{ config }` | |
| DELETE | `/api/integration-configs/:id` | SUPER_ADMIN | â€” | `{ success }` | |

---

### 8.17 `/api/dashboard`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/dashboard/portfolio` | AGGREGATOR+ | Portfolio-level stats across all mills |
| GET | `/api/dashboard/mill/:millId` | Own mill or AGGREGATOR+ | Mill-level stats |
| GET | `/api/dashboard/auditor` | AUDITOR or AGGREGATOR+ | Auditor workload view |

**Portfolio response shape:**
```json
{
  "mills": { "total": 12, "active": 11, "certified": 8, "inProgress": 3, "notStarted": 0 },
  "checklistsByStatus": { "draft": 2, "submitted": 1, "underReview": 3, "underAudit": 2, "certified": 4, "locked": 10 },
  "certificationTimeline": [{ "millId", "millName", "regulation", "certExpiry", "dueDateStatus" }],
  "ghgTotals": { "scope1": 0, "scope2": 0, "scope3": 0, "total": 0 },
  "openFindings": { "major": 5, "minor": 12 }
}
```

**Mill stats response shape:**
```json
{
  "checklist": { "id", "status", "periodStart", "periodEnd" },
  "itemProgress": { "total": 80, "notStarted": 10, "inProgress": 30, "complete": 35, "notApplicable": 5 },
  "itemsByPillar": [{ "pillarName", "total", "complete" }],
  "ghgSummary": { "scope1", "scope2", "scope3", "total" },
  "massBalance": [{ "materialType", "certifiedIn", "certifiedOut", "closingStock" }],
  "openReconciliationFlags": 3,
  "unacknowledgedFlags": 1
}
```

**Auditor stats response shape:**
```json
{
  "activeAudits": [{ "auditId", "millName", "regulation", "status", "scheduledDate", "dueDateStatus" }],
  "findingsSummary": { "open": 14, "closed": 22, "verified": 18 },
  "reportsRequiringReview": [{ "reportId", "auditId", "version", "generatedAt" }]
}
```

---

## 9. Key Workflows (End-to-End)

Each workflow is numbered step-by-step, identifying the component responsible for each step.

---

### 9.1 Onboarding a New Mill

1. **UI** â€” Super Admin completes the "New Mill" form (name, code, location, country, coordinates).
2. **API** `POST /api/mills` â€” validates uniqueness of `code`; creates `Mill` row.
3. **UI** â€” Super Admin creates mill users via "Invite User" form (name, email, role).
4. **API** `POST /api/auth/invite` â€” creates Supabase Auth invite; creates `User` row linked to mill.
5. **UI** â€” Super Admin selects a regulation profile and reporting period via "Assign Regulation" form.
6. **API** `POST /api/checklists` â€” service function `lib/checklists.ts::createChecklist(millId, profileId, periodStart, periodEnd)`:
   a. Fetches all `Requirement` rows where `profileId = profile.id` and `isActive = true`, traversing Pillar â†’ Category â†’ Requirement.
   b. Creates one `ChecklistItem` per requirement in a single transaction (bulk insert).
   c. Sets all items to `status = NOT_STARTED`, `dueDateStatus = NO_DATE`.
   d. For each regulation with mass balance requirements, creates pre-populated `MassBalanceEntry` rows per `MaterialType` enum value (volume = 0, pre-filled opening stock from prior period or 0).
7. **API response** â€” returns `{ checklist, itemsCreated: N }`.
8. **DB** â€” `Checklist` and `ChecklistItem` rows committed.
9. **UI** â€” Super Admin sees the checklist dashboard for the new mill, showing N items with status NOT_STARTED.

---

### 9.2 Mill Data Entry Cycle

1. **UI** â€” Mill Staff opens the checklist and navigates to a `ChecklistItem` (filtered by pillar/category).
2. **UI** â€” Mill Staff opens the item detail view, which shows the requirement description, guidance text, data type, and any existing `DataEntry` rows.
3. **UI** â€” Mill Staff fills in the data entry form. For `FORM01_ABSOLUTE` types: `valueRaw`, `unitInput`, `reportingMonth`, optional `emissionFactorId` dropdown (filtered to non-expired factors of the matching `materialType`). For `FORM02_RATE`: `valueRaw` as a percentage or ratio. For `DOCUMENT_ONLY` and `TEXT`: no numeric fields.
4. **API** `POST /api/data-entries` â€” `lib/data-entries.ts`:
   a. Validates checklist is not LOCKED or UNDER_AUDIT.
   b. If `emissionFactorId` supplied, fetches factor, validates not expired, computes `valueConverted = valueRaw Ã— factorValue`.
   c. If no `emissionFactorId` and `Requirement.ghgScope` is set, attempts auto-selection of default factor.
   d. Creates `DataEntry` row.
5. **UI** â€” Mill Staff uploads a supporting document via the document upload panel on the same item.
6. **API** `POST /api/documents/upload` â€” `lib/documents.ts` uploads file to Supabase Storage under path `mills/{millId}/checklist-items/{checklistItemId}/{filename}`. Creates `Document` row.
7. **UI** â€” Mill Staff marks the `ChecklistItem` as `IN_PROGRESS` or `COMPLETE`.
8. **API** `PATCH /api/checklist-items/:id` â€” updates `status`, optionally sets `completedAt`.
9. **UI** â€” Mill Manager reviews the checklist progress dashboard (item counts by status, GHG total).
10. **API** `GET /api/dashboard/mill/:millId` â€” `lib/ghg-calculations.ts::computeChecklistGHGTotal` is called; result is included in the response.
11. **UI** â€” Mill Manager navigates to Mass Balance, enters certified/non-certified volumes.
12. **API** `POST /api/mass-balance` or `PATCH /api/mass-balance/:id` â€” service computes `closingStock`, validates MB-1, checks double-accounting.
13. **UI** â€” Mill Manager clicks "Submit for Review".
14. **API** `PATCH /api/checklists/:id/submit` â€” runs all pre-flight checks (Â§7.2), transitions status to SUBMITTED, sends notifications.

---

### 9.3 Aggregator Review

1. **UI** â€” Aggregator Manager sees a notification (or dashboard alert) that a checklist is SUBMITTED.
2. **API** `PATCH /api/checklists/:id/start-review` â€” transitions to UNDER_REVIEW; sets `reviewStartedAt`, `reviewedById`.
3. **UI** â€” Aggregator Manager navigates through checklist items (filtered by pillar/category). For each item, views data entries, documents, and existing comments.
4. **UI** â€” Aggregator Manager marks items as aggregator-reviewed (`aggregatorReviewed = true`) or leaves comments requesting changes.
5. **API** `PATCH /api/checklist-items/:id` â€” sets `aggregatorReviewed`, `aggregatorReviewedAt`, `aggregatorReviewerId`.
6. **API** `POST /api/checklist-items/:id/comments` â€” creates immutable comment with `roleAtTimeOfComment = AGGREGATOR_MANAGER`.
7. **Path A â€” Return to Mill:**
   a. **UI** â€” Aggregator Manager clicks "Return to Mill" and selects an item and types a return reason.
   b. **API** `PATCH /api/checklists/:id/return-to-mill` â€” creates comment atomically; transitions to DRAFT.
   c. **UI** â€” Mill Manager receives notification; reviews comments; makes changes; resubmits.
8. **Path B â€” Advance to Audit:**
   a. **UI** â€” Aggregator Manager clicks "Send to Audit", selects auditor, audit type, and scheduled date.
   b. **API** `PATCH /api/checklists/:id/send-to-audit` â€” creates `Audit` row atomically; transitions checklist to UNDER_AUDIT.
   c. **UI** â€” Auditor receives notification that they have been assigned to an audit.

---

### 9.4 CSV/XLSX Import

1. **UI** â€” Mill Staff navigates to the Import section and uploads a CSV or XLSX file.
2. **API** `POST /api/imports/upload` â€” uploads file to Supabase Storage at `mills/{millId}/imports/{jobId}/{filename}`; creates `ImportJob` row with `status = PENDING`. Service reads the file headers; if headers match a saved `ImportColumnMapping` template for this mill, applies the template and sets `status = PROCESSING`. Otherwise sets `status = NEEDS_MAPPING`.
3. **UI** â€” If `NEEDS_MAPPING`: renders a column mapping UI showing detected CSV headers alongside a dropdown for each mapped to a GreenTrace field name. Shows first 5 rows as preview.
4. **API** `POST /api/imports/:jobId/mapping` â€” saves mapping; optionally saves as named template to `ImportColumnMapping`; sets `status = PROCESSING`; triggers async processing.
5. **Service** `lib/imports.ts::processImportJob(jobId)` (runs as a background Next.js API call or edge function):
   a. Reads the file from Supabase Storage.
   b. Applies column mapping to each row.
   c. Validates required fields: `referenceNumber`, `shipmentDate`, `direction`, `volumeMt`, `materialType`, `certificationStatus`, `counterpartyName`.
   d. Deduplicates against existing `ShipmentRecord` rows using `(millId, referenceNumber, shipmentDate)` unique key.
   e. Bulk-inserts valid rows as `ShipmentRecord` records with `source = CSV_IMPORT`, `importJobId = jobId`.
   f. Records failures in `errorLog` as `[{ row: N, error: "..." }]`.
   g. Updates `ImportJob` with counts; sets `status = COMPLETED` (or `FAILED` if 0 rows succeeded).
6. **UI** â€” Mill Staff polls `GET /api/imports/:jobId/status` until `status` is COMPLETED or FAILED.
7. **UI** â€” Mill Staff confirms the import (or discards and re-uploads if failed).
8. **API** `POST /api/imports/:jobId/confirm` â€” transitions to COMPLETED; triggers reconciliation check.
9. **Service** `lib/imports.ts::runReconciliation(jobId)` â€” runs REC-1 logic; sets `reconciliationFlag` on mismatched `DataEntry` rows.
10. **UI** â€” Mill Manager sees reconciliation flag alerts on the affected checklist items.

---

### 9.5 Conducting an Audit

1. **UI** â€” Auditor logs in and sees their assigned audits on the auditor dashboard.
2. **API** `GET /api/audits` â€” returns audits where `auditorId = currentUser.id`.
3. **UI** â€” Auditor opens an audit and sees all `ChecklistItem` rows for the linked checklist, with associated `DataEntry` and `Document` records visible.
4. **API** `PATCH /api/audits/:id` â€” Auditor sets `status = IN_PROGRESS`, updates `conductedDate`.
5. **UI** â€” Auditor works through each `ChecklistItem`, recording a finding for each.
6. **API** `POST /api/audit-findings` â€” creates `AuditFinding` with `findingType`, `evidenceReviewed`. For non-conformances, sets `correctiveActionRequired` and `correctiveActionDeadline`.
7. **UI** â€” Auditor uploads supporting evidence documents to a finding.
8. **API** `POST /api/documents/upload` with `linkedEntityType = AUDIT_FINDING`.
9. **UI** â€” Auditor may request additional evidence via a comment on a `ChecklistItem`.
10. **API** `POST /api/checklist-items/:id/comments` â€” creates comment requesting evidence.
11. **UI** â€” Mill Staff sees the comment and uploads additional documents (Checklist is UNDER_AUDIT; data entry is blocked but document upload to existing items is permitted).
12. **UI** â€” Auditor advances audit to FINDINGS_REVIEW once all items have a finding.
13. **API** `PATCH /api/audits/:id` â€” sets `status = FINDINGS_REVIEW`.
14. **UI** â€” Auditor reviews all findings in summary view; uses bulk update to correct any findings.
15. **API** `PATCH /api/audit-findings/bulk` â€” bulk update.

---

### 9.6 Generating an Audit Report

1. **UI** â€” Auditor clicks "Generate Report" on the audit detail page. Optionally selects LLM provider and model.
2. **API** `POST /api/audit-reports/generate` â€” calls `lib/report-generator.ts::buildReportPayload(auditId)`:
   a. Queries audit, mill, checklist, all findings, GHG total, mass balance summary.
   b. Assembles typed `ReportPayload` object.
   c. Calls `lib/llm.ts::generateReport(payload, provider, model)`.
3. **Service** `lib/llm.ts` â€” dispatches to the appropriate provider adapter (`lib/llm/anthropic.ts` or `lib/llm/gemini.ts`). Sends a structured prompt + payload. Receives structured JSON report content.
4. **DB** â€” Creates `AuditReport` row: `version = 1` (or next), `status = DRAFT`, `contentJson` = LLM response, `generatedBy`, `llmModel`, `generatedAt`.
5. **DB** â€” Updates `Audit.latestReportId` atomically.
6. **API response** â€” returns `{ report, requiresHumanReview: true }`.
7. **UI** â€” Renders report content with a persistent "AI-generated draft â€” requires human review" banner. Banner cannot be dismissed.
8. **UI** â€” Auditor reviews the draft. May edit sections via an inline editor.
9. **API** `PATCH /api/audit-reports/:id` â€” edits create a **new version row** (version N+1). Updates `Audit.latestReportId`.
10. **UI** â€” Auditor clicks "Mark as Final".
11. **API** `PATCH /api/audit-reports/:id/finalise` â€” sets `status = FINAL`, `reviewedById`, `reviewedAt`. Banner disappears. Edit buttons disabled.
12. **UI** â€” Auditor clicks "Export PDF".
13. **API** `POST /api/audit-reports/:id/export-pdf` â€” calls PDF generation library; stores file in Supabase Storage at `reports/{auditId}/v{version}.pdf`; sets `pdfPath`. Returns a 60-minute signed URL.
14. **UI** â€” Browser downloads the PDF.

---

### 9.7 Period Locking

1. **Pre-condition**: Audit is PUBLISHED; `Checklist.status = CERTIFIED`.
2. **UI** â€” Super Admin navigates to the mill's checklist and clicks "Lock Period", entering a mandatory reason.
3. **API** `PATCH /api/checklists/:id/lock` â€” `lib/checklists.ts::lockChecklist(id, actorId, reason)`:
   a. Validates `status = CERTIFIED`.
   b. Sets `status = LOCKED`, `lockedAt`, `lockedById`.
   c. Writes `ActivityLog` entry.
4. **DB** â€” All subsequent writes to DataEntry, ChecklistItem, MassBalanceEntry, ShipmentRecord linked to this checklist are rejected at the service layer with `PERIOD_LOCKED`.
5. **UI** â€” Checklist is shown in read-only mode. All edit controls hidden. A "Period Locked" badge is displayed with the lock date and actor.

---

### 9.8 Mass Balance Reconciliation

1. **UI** â€” Mill Manager enters or updates `MassBalanceEntry` volumes (certifiedIn, certifiedOut, etc.).
2. **API** `POST /api/mass-balance` or `PATCH /api/mass-balance/:id`:
   a. Service computes `closingStock = openingStock + certifiedIn - certifiedOut`.
   b. Validates MB-1: if `certifiedOut > openingStock + certifiedIn`, sets `discrepancyFlag = true`.
   c. If mill user, rejects save with 422 `MASS_BALANCE_OVERSCHEDULE`.
   d. Checks period continuity: confirms `openingStock` matches prior period's `closingStock`.
3. **UI** â€” Mill Manager sees a discrepancy flag warning with the computed shortfall amount.
4. **UI** â€” Mill Manager either corrects `certifiedOut` or escalates to Aggregator Manager.
5. **API** `PATCH /api/mass-balance/:id/override-discrepancy` â€” Aggregator Manager provides `discrepancyNotes`; sets override fields.
6. **UI** â€” Mill Manager checks for double-accounting warnings (if certifiedOut credited under both ISCC and RSPO).
7. **API** `PATCH /api/shipments/:id/confirm-allocation` â€” Mill Manager splits allocation percentages.
8. **UI** â€” All flags resolved; "Submit" button becomes active.
9. **API** `PATCH /api/checklists/:id/submit` â€” runs DA-3 and MB-4 pre-flight checks; transitions to SUBMITTED.

---

## 10. File and Folder Structure

```
greentrace/
â”œâ”€â”€ .env.local                     # DATABASE_URL, DIRECT_URL, SUPABASE_*, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY
â”œâ”€â”€ .env.example                   # Template with all required variable names (no values)
â”œâ”€â”€ next.config.ts
â”œâ”€â”€ tsconfig.json
â”œâ”€â”€ prisma/
â”‚   â”œâ”€â”€ schema.prisma              # Full Prisma schema (see Â§6)
â”‚   â”œâ”€â”€ migrations/                # Auto-generated migration files (never edit manually)
â”‚   â””â”€â”€ seed.ts                    # Seed script: creates Organisation, default emission factors
â”‚
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app/                       # Next.js App Router
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ (auth)/                # Route group: unauthenticated pages
â”‚   â”‚   â”‚   â”œâ”€â”€ login/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â”‚   â””â”€â”€ reset-password/
â”‚   â”‚   â”‚       â””â”€â”€ page.tsx
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ (aggregator)/          # Route group: aggregator-facing pages (SUPER_ADMIN, AGGREGATOR_MANAGER)
â”‚   â”‚   â”‚   â”œâ”€â”€ layout.tsx         # Aggregator shell layout
â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ page.tsx       # Portfolio dashboard
â”‚   â”‚   â”‚   â”œâ”€â”€ mills/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx       # Mill list
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ new/
â”‚   â”‚   â”‚   â”‚   â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ [millId]/
â”‚   â”‚   â”‚   â”‚       â”œâ”€â”€ page.tsx
â”‚   â”‚   â”‚   â”‚       â”œâ”€â”€ users/
â”‚   â”‚   â”‚   â”‚       â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â”‚   â”‚       â””â”€â”€ checklists/
â”‚   â”‚   â”‚   â”‚           â””â”€â”€ [checklistId]/
â”‚   â”‚   â”‚   â”‚               â””â”€â”€ page.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ regulation-profiles/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ [profileId]/
â”‚   â”‚   â”‚   â”‚       â””â”€â”€ page.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ emission-factors/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ users/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â”‚   â””â”€â”€ settings/
â”‚   â”‚   â”‚       â””â”€â”€ page.tsx       # LLM config, org settings
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ (mill)/                # Route group: mill-facing pages (MILL_MANAGER, MILL_STAFF)
â”‚   â”‚   â”‚   â”œâ”€â”€ layout.tsx         # Mill shell layout
â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ page.tsx       # Mill dashboard
â”‚   â”‚   â”‚   â”œâ”€â”€ checklists/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ [checklistId]/
â”‚   â”‚   â”‚   â”‚       â”œâ”€â”€ page.tsx   # Checklist overview
â”‚   â”‚   â”‚   â”‚       â””â”€â”€ items/
â”‚   â”‚   â”‚   â”‚           â””â”€â”€ [itemId]/
â”‚   â”‚   â”‚   â”‚               â””â”€â”€ page.tsx  # Item detail: data entry, documents, comments
â”‚   â”‚   â”‚   â”œâ”€â”€ mass-balance/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ shipments/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ import/
â”‚   â”‚   â”‚   â”‚       â””â”€â”€ page.tsx
â”‚   â”‚   â”‚   â””â”€â”€ settings/
â”‚   â”‚   â”‚       â””â”€â”€ page.tsx       # Integration config, mill profile
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ (auditor)/             # Route group: auditor-facing pages (AUDITOR)
â”‚   â”‚   â”‚   â”œâ”€â”€ layout.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ audits/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ [auditId]/
â”‚   â”‚   â”‚   â”‚       â”œâ”€â”€ page.tsx   # Audit overview, finding entry
â”‚   â”‚   â”‚   â”‚       â”œâ”€â”€ findings/
â”‚   â”‚   â”‚   â”‚       â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â”‚   â”‚       â””â”€â”€ report/
â”‚   â”‚   â”‚   â”‚           â””â”€â”€ page.tsx  # Report generate / edit / finalise / export
â”‚   â”‚   â”‚   â””â”€â”€ layout.tsx
â”‚   â”‚   â”‚
â”‚   â”‚   â””â”€â”€ api/                   # API Route handlers (Next.js Route Handlers)
â”‚   â”‚       â”œâ”€â”€ auth/
â”‚   â”‚       â”‚   â”œâ”€â”€ login/route.ts
â”‚   â”‚       â”‚   â”œâ”€â”€ logout/route.ts
â”‚   â”‚       â”‚   â”œâ”€â”€ session/route.ts
â”‚   â”‚       â”‚   â”œâ”€â”€ invite/route.ts
â”‚   â”‚       â”‚   â””â”€â”€ reset-password/route.ts
â”‚   â”‚       â”œâ”€â”€ mills/
â”‚   â”‚       â”‚   â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚   â””â”€â”€ [id]/
â”‚   â”‚       â”‚       â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚       â””â”€â”€ stats/route.ts
â”‚   â”‚       â”œâ”€â”€ users/
â”‚   â”‚       â”‚   â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚   â””â”€â”€ [id]/route.ts
â”‚   â”‚       â”œâ”€â”€ regulation-profiles/
â”‚   â”‚       â”‚   â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚   â””â”€â”€ [id]/
â”‚   â”‚       â”‚       â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚       â”œâ”€â”€ pillars/
â”‚   â”‚       â”‚       â”‚   â””â”€â”€ [pillarId]/route.ts
â”‚   â”‚       â”‚       â””â”€â”€ requirements/
â”‚   â”‚       â”‚           â””â”€â”€ [reqId]/route.ts
â”‚   â”‚       â”œâ”€â”€ checklists/
â”‚   â”‚       â”‚   â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚   â””â”€â”€ [id]/
â”‚   â”‚       â”‚       â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚       â”œâ”€â”€ submit/route.ts
â”‚   â”‚       â”‚       â”œâ”€â”€ start-review/route.ts
â”‚   â”‚       â”‚       â”œâ”€â”€ return-to-mill/route.ts
â”‚   â”‚       â”‚       â”œâ”€â”€ send-to-audit/route.ts
â”‚   â”‚       â”‚       â”œâ”€â”€ lock/route.ts
â”‚   â”‚       â”‚       â”œâ”€â”€ unlock/route.ts
â”‚   â”‚       â”‚       â””â”€â”€ force-status/route.ts
â”‚   â”‚       â”œâ”€â”€ checklist-items/
â”‚   â”‚       â”‚   â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚   â””â”€â”€ [id]/
â”‚   â”‚       â”‚       â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚       â””â”€â”€ comments/route.ts
â”‚   â”‚       â”œâ”€â”€ data-entries/
â”‚   â”‚       â”‚   â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚   â””â”€â”€ [id]/
â”‚   â”‚       â”‚       â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚       â””â”€â”€ acknowledge-reconciliation/route.ts
â”‚   â”‚       â”œâ”€â”€ mass-balance/
â”‚   â”‚       â”‚   â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚   â””â”€â”€ [id]/
â”‚   â”‚       â”‚       â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚       â”œâ”€â”€ confirm-opening-stock/route.ts
â”‚   â”‚       â”‚       â””â”€â”€ override-discrepancy/route.ts
â”‚   â”‚       â”œâ”€â”€ shipments/
â”‚   â”‚       â”‚   â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚   â””â”€â”€ [id]/
â”‚   â”‚       â”‚       â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚       â””â”€â”€ confirm-allocation/route.ts
â”‚   â”‚       â”œâ”€â”€ imports/
â”‚   â”‚       â”‚   â”œâ”€â”€ upload/route.ts
â”‚   â”‚       â”‚   â”œâ”€â”€ templates/
â”‚   â”‚       â”‚   â”‚   â””â”€â”€ [id]/route.ts
â”‚   â”‚       â”‚   â””â”€â”€ [jobId]/
â”‚   â”‚       â”‚       â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚       â”œâ”€â”€ mapping/route.ts
â”‚   â”‚       â”‚       â”œâ”€â”€ status/route.ts
â”‚   â”‚       â”‚       â””â”€â”€ confirm/route.ts
â”‚   â”‚       â”œâ”€â”€ emission-factors/
â”‚   â”‚       â”‚   â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚   â””â”€â”€ [id]/route.ts
â”‚   â”‚       â”œâ”€â”€ audits/
â”‚   â”‚       â”‚   â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚   â””â”€â”€ [id]/
â”‚   â”‚       â”‚       â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚       â”œâ”€â”€ publish/route.ts
â”‚   â”‚       â”‚       â””â”€â”€ withdraw/route.ts
â”‚   â”‚       â”œâ”€â”€ audit-findings/
â”‚   â”‚       â”‚   â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚   â”œâ”€â”€ bulk/route.ts
â”‚   â”‚       â”‚   â””â”€â”€ [id]/route.ts
â”‚   â”‚       â”œâ”€â”€ audit-reports/
â”‚   â”‚       â”‚   â”œâ”€â”€ generate/route.ts
â”‚   â”‚       â”‚   â””â”€â”€ [id]/
â”‚   â”‚       â”‚       â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚       â”œâ”€â”€ finalise/route.ts
â”‚   â”‚       â”‚       â””â”€â”€ export-pdf/route.ts
â”‚   â”‚       â”œâ”€â”€ documents/
â”‚   â”‚       â”‚   â”œâ”€â”€ upload/route.ts
â”‚   â”‚       â”‚   â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚   â””â”€â”€ [id]/
â”‚   â”‚       â”‚       â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚       â””â”€â”€ download/route.ts
â”‚   â”‚       â”œâ”€â”€ integration-configs/
â”‚   â”‚       â”‚   â”œâ”€â”€ route.ts
â”‚   â”‚       â”‚   â””â”€â”€ [id]/route.ts
â”‚   â”‚       â””â”€â”€ dashboard/
â”‚   â”‚           â”œâ”€â”€ portfolio/route.ts
â”‚   â”‚           â”œâ”€â”€ mill/[millId]/route.ts
â”‚   â”‚           â””â”€â”€ auditor/route.ts
â”‚   â”‚
â”‚   â”œâ”€â”€ lib/                       # Service layer â€” one file per domain
â”‚   â”‚   â”œâ”€â”€ auth.ts                # Session helpers, withAuth middleware, role guards
â”‚   â”‚   â”œâ”€â”€ prisma.ts              # Singleton Prisma client
â”‚   â”‚   â”œâ”€â”€ supabase.ts            # Supabase server client factory
â”‚   â”‚   â”œâ”€â”€ supabase-server.ts     # Server-side Supabase client (for route handlers)
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ mills.ts               # Mill CRUD, certification status updates
â”‚   â”‚   â”œâ”€â”€ users.ts               # User CRUD, role management
â”‚   â”‚   â”œâ”€â”€ regulation-profiles.ts # Profile, pillar, category, requirement CRUD
â”‚   â”‚   â”œâ”€â”€ checklists.ts          # Checklist CRUD, createChecklist (auto-generation), state machine, pre-flight checks
â”‚   â”‚   â”œâ”€â”€ checklist-items.ts     # Item CRUD, due date status computation
â”‚   â”‚   â”œâ”€â”€ data-entries.ts        # DataEntry CRUD, GHG trigger
â”‚   â”‚   â”œâ”€â”€ ghg-calculations.ts    # computeChecklistGHGTotal, auto-factor selection
â”‚   â”‚   â”œâ”€â”€ mass-balance.ts        # MassBalanceEntry CRUD, closing stock, discrepancy logic, period continuity
â”‚   â”‚   â”œâ”€â”€ shipments.ts           # ShipmentRecord CRUD, allocation confirmation
â”‚   â”‚   â”œâ”€â”€ imports.ts             # ImportJob processing, column mapping, reconciliation check
â”‚   â”‚   â”œâ”€â”€ emission-factors.ts    # EmissionFactor CRUD, expiry guard, default management
â”‚   â”‚   â”œâ”€â”€ audits.ts              # Audit CRUD, state machine, publish flow
â”‚   â”‚   â”œâ”€â”€ audit-findings.ts      # AuditFinding CRUD, bulk update
â”‚   â”‚   â”œâ”€â”€ documents.ts           # Document upload, download URL, soft delete
â”‚   â”‚   â”œâ”€â”€ report-generator.ts    # buildReportPayload, version management
â”‚   â”‚   â”œâ”€â”€ dashboard.ts           # Portfolio stats, mill stats, auditor stats
â”‚   â”‚   â”œâ”€â”€ activity-log.ts        # ActivityLog append helper
â”‚   â”‚   â”œâ”€â”€ notifications.ts       # In-app/email notification dispatching
â”‚   â”‚   â”‚
â”‚   â”‚   â””â”€â”€ llm/                   # LLM abstraction layer
â”‚   â”‚       â”œâ”€â”€ index.ts           # generateReport(payload, provider, model) dispatcher
â”‚   â”‚       â”œâ”€â”€ types.ts           # ReportPayload type, LLM response types
â”‚   â”‚       â”œâ”€â”€ anthropic.ts       # Claude adapter
â”‚   â”‚       â””â”€â”€ gemini.ts          # Gemini adapter
â”‚   â”‚
â”‚   â”œâ”€â”€ types/                     # Shared TypeScript types
â”‚   â”‚   â”œâ”€â”€ api.ts                 # API response envelope types, pagination types
â”‚   â”‚   â”œâ”€â”€ auth.ts                # SessionUser type, role constants
â”‚   â”‚   â”œâ”€â”€ checklist.ts           # ChecklistWithStats, ChecklistItemWithDetails, etc.
â”‚   â”‚   â”œâ”€â”€ dashboard.ts           # PortfolioStats, MillStats, AuditorStats
â”‚   â”‚   â”œâ”€â”€ imports.ts             # ImportJob, ColumnMapping, PreviewRow types
â”‚   â”‚   â”œâ”€â”€ llm.ts                 # ReportPayload (re-exported from lib/llm/types.ts)
â”‚   â”‚   â””â”€â”€ index.ts               # Re-exports all types
â”‚   â”‚
â”‚   â”œâ”€â”€ middleware.ts              # Next.js middleware: redirects unauthenticated to /login; routes by role to correct route group
â”‚   â”‚
â”‚   â””â”€â”€ components/               # Reserved for UI layer (not specified in this plan)
â”‚       â””â”€â”€ .gitkeep
â”‚
â””â”€â”€ public/
    â””â”€â”€ .gitkeep
```

### Environment Variables

All secrets and configuration are stored in `.env.local` (not committed to source control). `.env.example` is committed with all variable names and placeholder values.

Required variables:
```
# Supabase
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[password]@[host]:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# LLM providers
ANTHROPIC_API_KEY=[key]
GOOGLE_AI_API_KEY=[key]

# App
NEXT_PUBLIC_APP_URL=https://greentrace.vercel.app
```

---

## 11. Phased Implementation Roadmap

Each phase is **independently deployable** â€” the application functions at the end of every phase, even if some features are incomplete. Schema migrations are additive within a phase; no phase requires a schema rewrite of a prior phase.

---

### Phase 1 â€” Foundation

**Goal:** A working authenticated application with user management, mill CRUD, and a verified Supabase + Prisma connection.

**Builds:**
- Full Prisma schema (all models, even if not yet used â€” migrations committed from day one)
- Supabase project setup: Auth, Storage buckets (`documents`, `imports`, `reports`), RLS policies skeleton
- `lib/prisma.ts`, `lib/supabase.ts`, `lib/auth.ts`, `lib/activity-log.ts`
- `withAuth` middleware wrapper and Next.js `middleware.ts` (role-based route group redirects)
- `/api/auth/*` â€” login, logout, session, invite, reset-password
- `/api/mills` â€” full CRUD
- `/api/users` â€” full CRUD
- `(auth)` route group: login and reset-password pages
- `(aggregator)` route group: mill list, mill detail, user management pages
- Seed script: creates the aggregator Organisation row and one Super Admin user
- Vercel deployment configured (environment variables set)

**Done when:**
- Super Admin can log in, create a mill, invite mill users, and log out
- Mill Manager can log in and see their own mill (and no others)
- All routes redirect to login if unauthenticated
- Supabase RLS blocks cross-mill row access when tested directly against the DB

**Depends on:** Supabase project created; Vercel project linked to repo

---

### Phase 2 â€” Regulation Profiles

**Goal:** Aggregator can define regulation profiles (pillars, categories, requirements) and trigger checklist auto-generation for a mill.

**Builds:**
- `lib/regulation-profiles.ts`, `lib/checklists.ts` (createChecklist auto-generation)
- `/api/regulation-profiles/*` â€” full CRUD including nested pillar/category/requirement management
- `/api/checklists` â€” POST (auto-generation) and GET
- `(aggregator)` pages: regulation profiles list, profile detail (requirement tree editor)
- `(aggregator)` pages: checklist creation flow (assign regulation to mill)
- Seed script extended: adds sample ISCC EU profile with 10 representative requirements across 2 pillars/4 categories

**Done when:**
- Super Admin can create a regulation profile with pillars, categories, and requirements
- Super Admin can create a checklist for a mill; the system auto-generates one `ChecklistItem` per active requirement
- Profile version field is set; existing checklists are pinned to the profile version they were created from

**Depends on:** Phase 1

---

### Phase 3 â€” Data Entry

**Goal:** Mill Staff can enter compliance data, upload documents, trigger GHG calculations, and track item progress.

**Builds:**
- `lib/data-entries.ts`, `lib/ghg-calculations.ts`, `lib/emission-factors.ts`, `lib/documents.ts`, `lib/checklist-items.ts`
- `/api/data-entries/*`, `/api/emission-factors/*`, `/api/documents/*`, `/api/checklist-items/*`
- Supabase Storage upload integration for documents
- `(mill)` route group: dashboard, checklist view, item detail page (data entry form, document upload panel, comment thread)
- `(aggregator)` page: checklist item detail view (read + aggregator review controls)
- Due date status computation in `lib/checklist-items.ts`
- Colour-coded due date status returned by all item list endpoints

**Done when:**
- Mill Staff can enter FORM01 and FORM02 data with correct unit display
- GHG is computed on save and stored; historical values preserved on factor update
- Mill Staff can upload documents linked to a checklist item
- Expired emission factors are rejected; default factors are auto-applied
- Checklist item status transitions are enforced

**Depends on:** Phase 2

---

### Phase 4 â€” Mass Balance

**Goal:** Mill can manage mass balance entries with automatic closing stock computation, discrepancy detection, and period continuity.

**Builds:**
- `lib/mass-balance.ts`
- `/api/mass-balance/*` â€” full CRUD including opening stock confirmation and discrepancy override
- `(mill)` page: mass balance entry UI per material type
- Period continuity: pre-fill opening stock from prior period on checklist creation (added to createChecklist)
- Opening stock confirmation workflow
- Discrepancy flag + override workflow (Aggregator Manager)

**Done when:**
- `closingStock` is always server-computed; never accepted from the client
- MB-1 (certified output cap) is enforced; mill users see a blocking error; aggregators can override with notes
- Period N+1's opening stock is pre-filled from period N's closing stock
- Opening stock confirmation gate blocks submission

**Depends on:** Phase 3

---

### Phase 5 â€” Imports

**Goal:** Mill can upload CSV/XLSX shipment files, map columns, import ShipmentRecord rows, and trigger reconciliation.

**Builds:**
- `lib/imports.ts` (upload, processing, reconciliation check)
- `/api/imports/*` â€” full import flow endpoints
- `/api/shipments/*` â€” manual shipment CRUD
- Supabase Storage integration for import file storage
- `(mill)` pages: shipment list, import wizard (upload â†’ column mapping â†’ preview â†’ confirm)
- Column mapping template save/load
- Import job status polling
- Post-import reconciliation flag logic (REC-1)

**Done when:**
- Mill Staff can upload a CSV, map columns (or reuse a saved template), and see a preview
- import job processes rows, deduplicates against existing records, and surfaces errors per row
- Reconciliation flags are set on DataEntry records when > 2% discrepancy detected
- Mill Manager is presented with unacknowledged flags on the dashboard

**Depends on:** Phase 4

---

### Phase 6 â€” Aggregator Review and Submission Flow

**Goal:** Full checklist status machine is operational, including submission, aggregator review, return-to-mill, all pre-flight validation checks, and notification triggers.

**Builds:**
- Full status machine in `lib/checklists.ts` (all transitions in Â§7.2)
- Pre-flight submission checks (MB-4, REC-2, DA-2)
- Double-accounting detection and allocation confirmation flow
- `lib/notifications.ts` (in-app notification model; email integration stubbed)
- `/api/checklists/:id/submit`, `/api/checklists/:id/start-review`, `/api/checklists/:id/return-to-mill`, `/api/checklists/:id/send-to-audit`, `/api/checklists/:id/force-status`
- `/api/shipments/:id/confirm-allocation`
- `(mill)` pages: submission flow UI (review flags, confirm submission)
- `(aggregator)` pages: review workflow UI (review queue, per-item review, send to audit)

**Done when:**
- Mill Manager can submit a checklist only when all blocking conditions are resolved
- Aggregator Manager can approve or return to mill with a mandatory comment
- `send-to-audit` creates an Audit record atomically and transitions the checklist
- Force-status transition by Super Admin is logged to ActivityLog

**Depends on:** Phase 5

---

### Phase 7 â€” Audit Workflow

**Goal:** Auditors can be assigned, conduct audits, record findings per checklist item, request evidence, and publish the audit.

**Builds:**
- `lib/audits.ts`, `lib/audit-findings.ts`
- `/api/audits/*`, `/api/audit-findings/*`
- `(auditor)` route group: auditor dashboard, audit detail page, finding entry per item, bulk update
- Evidence document upload linked to findings (`AUDIT_FINDING` entity type)
- Audit publish flow (FINDINGS_REVIEW â†’ PUBLISHED â†’ Checklist CERTIFIED atomically)
- Mill certification status update on publish
- Mill Staff audit finding visibility gate (findings hidden until PUBLISHED)

**Done when:**
- Auditor can see only their assigned audits
- Auditor can create, edit, and bulk-update findings per checklist item
- Publishing the audit atomically sets the checklist to CERTIFIED and updates the Mill cert status fields
- Mill Staff can see findings once the audit is published but not before

**Depends on:** Phase 6

---

### Phase 8 â€” LLM Report Generator

**Goal:** Auditor can generate a structured AI draft report, review and edit it, mark it final, and export a PDF.

**Builds:**
- `lib/report-generator.ts` (buildReportPayload)
- `lib/llm/` abstraction layer: `index.ts`, `types.ts`, `anthropic.ts`, `gemini.ts`
- `/api/audit-reports/*` â€” generate, version list, get, edit (new version), finalise, export-pdf
- PDF generation integration (library TBD; options: `@react-pdf/renderer`, `puppeteer`, or Supabase Edge Function wrapper)
- `(auditor)` page: report generate/edit/review/finalise/export UI
- "AI-generated draft" persistent banner (rendered when `requiresHumanReview = true`)
- Version history list

**Done when:**
- Auditor can click "Generate Report"; a draft is created from the LLM response within 60 seconds
- The persistent AI-generated banner is shown on all draft reports and cannot be dismissed
- Each edit to the report creates a new version row; prior versions are accessible
- Only FINAL reports can be exported to PDF
- PDF is stored in Supabase Storage; a signed URL is returned

**Depends on:** Phase 7

---

### Phase 9 â€” Dashboards

**Goal:** Portfolio dashboard, mill dashboard, and auditor dashboard are fully operational with live statistics.

**Builds:**
- `lib/dashboard.ts` â€” all three stats queries
- `/api/dashboard/portfolio`, `/api/dashboard/mill/:millId`, `/api/dashboard/auditor`
- `(aggregator)` dashboard page: mill portfolio grid, cert timeline with colour-coded expiry dates, GHG totals, open findings summary
- `(mill)` dashboard page: item progress bar by pillar, GHG chart, mass balance summary, reconciliation alerts
- `(auditor)` dashboard page: active audit list with due dates, findings summary, reports requiring review
- Certification timeline with `dueDateStatus` colour coding for cert expiry dates
- Period lock indicator on all relevant views

**Done when:**
- Portfolio dashboard shows correct counts across all mills in real time
- Cert expiry dates are colour-coded correctly (red/orange/green) based on `dueDateStatus`
- Mill dashboard reflects live GHG totals and item progress
- Auditor dashboard shows all assigned active audits with correct status

**Depends on:** Phase 8

---

### Phase 10 â€” Integration Placeholders

**Goal:** Integration settings UI is built and functional; placeholder connection cards are displayed per mill, with all fields saveable but no live connections activated.

**Builds:**
- `lib/integration-configs.ts` (trivial; isActive always false)
- `/api/integration-configs/*`
- `(mill)` settings page: integration configuration UI â€” one card per `IntegrationSystemType`, showing display name, system type, config fields (endpoint URL, auth type), and a disabled "Connect" button with a "Coming Soon" label
- `(aggregator)` mill settings page: same view accessible by Super Admin

**Done when:**
- Super Admin can create, edit, and delete integration configs per mill
- All `isActive` values are stored as `false`; no API calls are made to external systems
- The UI communicates clearly that live connections are not yet available

**Depends on:** Phase 9

---

## 12. Open Questions

Each question is listed with a **recommended default** and the reasoning behind it. These should be confirmed by a human before the coding agent begins implementation.

---

**Q1: Should `MassBalanceEntry` track monthly or period-level granularity?**
Currently modelled at period level (one row per mill/regulation/materialType per period). Some ISCC schemes require monthly mass balance reconciliation.
**Recommended default:** Period-level only in v1 (matches the `DataEntry.reportingMonth` approach, where monthly data is on DataEntry rows). Monthly mass balance is an enhancement for v2.
**Confirm if:** ISCC auditors require monthly `certifiedIn/certifiedOut` breakdowns during audit.

---

**Q2: Are auditors external users with their own login, or internal users temporarily assigned to an audit role?**
The brief says "third-party auditors" which implies external. The current model gives Auditors a `User` row and Supabase Auth account created via the invite flow.
**Recommended default:** Auditors are external users who receive an email invite, create their own password, and have `role = AUDITOR`. Their access is scoped to assigned audits by the application layer.
**Confirm if:** The aggregator prefers auditors to use SSO or a separate identity provider.

---

**Q3: Can a mill have multiple concurrent checklists for the same regulation and period?**
The schema enforces `@@unique([millId, profileId, periodStart, periodEnd])`, which prevents duplicates per profile version but allows two checklists if the profile version differs.
**Recommended default:** Block this at the service layer too â€” a mill may have at most one checklist per (regulation, periodStart, periodEnd) regardless of profile version. If a newer profile version is activated, the mill must complete or archive the existing checklist first.
**Confirm if:** There is a valid use case for parallel checklists under different profile versions.

---

**Q4: Can the same user hold the Aggregator Manager and Mill Manager roles simultaneously?**
The brief says "a user belongs to exactly one role." This should be enforced strictly.
**Recommended default:** Enforce one role per user. The `User.role` field is a single enum â€” no junction table.
**Confirm if:** There are edge cases where a person manages both the aggregator and a specific mill.

---

**Q5: Is emission factor scope (scope1/2/3) set at the Requirement level or the DataEntry level?**
Currently `Requirement.ghgScope` determines the scope, and `EmissionFactor.scope` must match. This means a requirement can only produce one scope of emissions.
**Recommended default:** Scope is fixed at the Requirement level. Mills entering data for a given requirement cannot override the scope.
**Confirm if:** There are requirements where the same measurement may produce both scope 1 and scope 2 emissions (e.g. on-site generation vs. grid consumption).

---

**Q6: What is the correct deduplication key for `ShipmentRecord` imports?**
Currently `@@unique([millId, referenceNumber, shipmentDate])`. This means two shipments on the same date with the same reference number are treated as one record.
**Recommended default:** Use `(millId, referenceNumber, shipmentDate)` as the dedup key. If a user re-imports the same file, rows are silently skipped (not duplicated) and a warning count is surfaced.
**Confirm if:** Reference numbers can legitimately repeat across different shipment dates (e.g. standing orders with recurring reference numbers).

---

**Q7: Should the `ActivityLog` be surfaced to Aggregator Managers, or only visible to Super Admins?**
The brief specifies Super Admin can force transitions with logged reasons, but does not specify who sees the logs.
**Recommended default:** ActivityLog is visible to Super Admin only. Aggregator Managers see the comment trail on individual ChecklistItems but not the system-level ActivityLog.
**Confirm if:** Aggregator Managers need an audit trail view for compliance or regulatory reasons.

---

**Q8: How should notifications be delivered in v1?**
The brief says "triggers a notification" on submission. The tech stack does not specify email or in-app.
**Recommended default:** v1 implements in-app notifications only â€” a `Notification` model (not in the schema above; add in Phase 6) that stores `userId`, `message`, `read`, `createdAt`, surfaced via a bell icon in the app header. Email delivery is stubbed in `lib/notifications.ts` with a `TODO` comment.
**Confirm if:** Email notifications are required for v1 (would require choosing an email provider such as Resend or Supabase's email sending feature).

---

**Q9: What happens to ChecklistItems created from requirements that are subsequently deactivated in the profile?**
If an admin deactivates a Requirement (`isActive = false`), existing ChecklistItems referencing it remain in the database and in their checklists.
**Recommended default:** Deactivation does not affect existing ChecklistItems. The item remains in the checklist, remains completable, and retains all its data. The deactivation only affects future checklist auto-generation (new checklists will not include the deactivated requirement).
**Confirm if:** Auditors or the certification body require that deactivated requirements are retroactively removed from in-progress checklists.

---

**Q10: Is a `ShipmentRecord` always linked to a specific `Checklist`, or is it linked only to a `Mill`?**
The current schema links `ShipmentRecord` to a `Mill` but not directly to a `Checklist`. The mass balance linkage is indirect (via period dates).
**Recommended default:** `ShipmentRecord` is linked to `Mill` + period dates, not directly to a Checklist. The mass balance service matches shipments to periods by date range. This allows a shipment to appear across reporting periods if it spans a boundary.
**Confirm if:** Shipments must be explicitly tagged to a specific checklist (e.g. a shipment cannot be claimed by two different periods).

---

**Q11: Should PDF export regenerate from `contentJson` or re-render from re-querying the database?**
**Recommended default:** PDF is generated from `contentJson` stored in the `AuditReport` row (the FINAL version). This preserves the exact content that was reviewed and approved, even if underlying data subsequently changes when the period is unlocked.
**Confirm if:** The aggregator or certification body requires that PDF always reflects the "current" live database state.

---

**Q12: What is the maximum file size for document uploads?**
Not specified in the brief. Supabase Storage default is 50 MB per file.
**Recommended default:** Enforce a 25 MB per-file limit at the API layer (before passing to Supabase). MIME type allowlist: PDF, JPEG, PNG, XLSX, CSV, DOCX.
**Confirm if:** Mill staff commonly upload video evidence or large CAD files that exceed 25 MB.
