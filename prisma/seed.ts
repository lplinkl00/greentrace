import { config } from 'dotenv'
import path from 'path'
import fs from 'fs/promises'
config({ path: path.resolve(process.cwd(), '.env.local') })

import {
    PrismaClient, Prisma,
    UserRole, RequirementDataType, RequirementCriticality, GHGScope,
    ChecklistStatus, ChecklistItemStatus, DueDateStatus,
    MaterialType, ShipmentDirection, CertificationStatus, ShipmentSource,
    AuditType, AuditStatus, FindingType, FindingStatus, AuditReportStatus,
    DataEntryType, ImportFileType, ImportStatus, LLMProvider,
} from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { createClient } from '@supabase/supabase-js'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

// ─── Helper: idempotent Supabase user upsert ─────────────────────────────────
async function upsertSupabaseUser(email: string, password: string, role: string): Promise<string> {
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = list?.users?.find(u => u.email === email)

    if (existing) {
        await supabase.auth.admin.updateUserById(existing.id, {
            password,
            user_metadata: { role },
            email_confirm: true,
        } as any)
        console.log(`  ✓ Updated Supabase user: ${email}`)
        return existing.id
    }

    const { data, error } = await supabase.auth.admin.createUser({
        email, password,
        email_confirm: true,
        user_metadata: { role },
    })
    if (error) throw new Error(`Failed to create Supabase user ${email}: ${error.message}`)
    console.log(`  ✓ Created Supabase user: ${email}`)
    return data.user.id
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seedRegulationProfiles() {
    const fixtures = [
        'prisma/fixtures/iscc-eu.json',
        'prisma/fixtures/iscc-plus.json',
        'prisma/fixtures/rspo-pc.json',
        'prisma/fixtures/rspo-sccs.json',
    ]

    for (const fixturePath of fixtures) {
        const raw = await fs.readFile(path.resolve(process.cwd(), fixturePath), 'utf8')
        const fixture = JSON.parse(raw)

        // Check if this regulation+version already exists
        const existing = await prisma.regulationProfile.findUnique({
            where: { regulation_version: { regulation: fixture.regulation, version: fixture.version } },
        })

        if (existing) {
            console.log(`  ✓ Profile already exists: ${fixture.name} — skipping`)
            continue
        }

        await prisma.regulationProfile.create({
            data: {
                regulation: fixture.regulation,
                version: fixture.version,
                name: fixture.name,
                description: fixture.description ?? null,
                isActive: true,
                pillars: {
                    create: fixture.pillars.map((pillar: any, pi: number) => ({
                        code: pillar.code,
                        name: pillar.name,
                        displayOrder: pillar.displayOrder ?? pi,
                        categories: {
                            create: pillar.categories.map((cat: any, ci: number) => ({
                                code: cat.code,
                                name: cat.name,
                                displayOrder: cat.displayOrder ?? ci,
                                requirements: {
                                    create: cat.requirements.map((req: any, ri: number) => ({
                                        code: req.code,
                                        name: req.name,
                                        description: req.description,
                                        guidanceText: req.guidanceText ?? null,
                                        dataType: req.dataType,
                                        requiresForm: req.requiresForm ?? true,
                                        criticality: req.criticality ?? 'NON_CRITICAL',
                                        ghgScope: req.ghgScope ?? null,
                                        unit: req.unit ?? null,
                                        displayOrder: req.displayOrder ?? ri,
                                        isActive: true,
                                    })),
                                },
                            })),
                        },
                    })),
                },
            },
        })

        console.log(`  ✓ Created profile: ${fixture.name}`)
    }
}

async function main() {

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 0 — Regulation Profiles
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 0: Regulation Profiles ───────────────────────────────────')
    await seedRegulationProfiles()

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1 — Supabase Auth Users
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 1: Supabase Auth Users ───────────────────────────────────')

    const adminUid      = await upsertSupabaseUser('admin@greentrace.local',      'admin123',   'SUPER_ADMIN')
    const managerUid    = await upsertSupabaseUser('manager@greentrace.local',    'manager123', 'AGGREGATOR_MANAGER')
    const psManagerUid  = await upsertSupabaseUser('ps.manager@greentrace.local', 'manager123', 'COMPANY_MANAGER')
    const psStaffUid    = await upsertSupabaseUser('ps.staff@greentrace.local',   'staff123',   'COMPANY_STAFF')
    const gvManagerUid  = await upsertSupabaseUser('gv.manager@greentrace.local', 'manager123', 'COMPANY_MANAGER')
    const auditorUid    = await upsertSupabaseUser('auditor@greentrace.local',    'auditor123', 'AUDITOR')

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2 — Organisation
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 2: Organisation ──────────────────────────────────────────')

    const org = await prisma.organisation.upsert({
        where: { slug: 'aggregator-org' },
        update: { name: 'GreenTrace Aggregator', country: 'Malaysia' },
        create: { name: 'GreenTrace Aggregator', slug: 'aggregator-org', country: 'Malaysia' },
    })
    console.log(`  ✓ Organisation: ${org.name}`)

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3 — Companies
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 3: Companies ─────────────────────────────────────────────────')

    const palmStar = await prisma.company.upsert({
        where: { code: 'MY-PS-001' },
        update: {},
        create: {
            organisationId: org.id,
            name: 'Palm Star Mill',
            code: 'MY-PS-001',
            location: 'Jalan Minyak Sawit 12, Johor Bahru, Johor',
            country: 'Malaysia',
            latitude:  new Prisma.Decimal('1.5529'),
            longitude: new Prisma.Decimal('103.7594'),
            isccEuCertStatus: 'In Progress',
            rspoPcCertStatus: 'Not Started',
        },
    })

    const greenValley = await prisma.company.upsert({
        where: { code: 'MY-GV-002' },
        update: {},
        create: {
            organisationId: org.id,
            name: 'Green Valley Mill',
            code: 'MY-GV-002',
            location: 'KM 14 Jalan Kuantan, Gambang, Pahang',
            country: 'Malaysia',
            latitude:  new Prisma.Decimal('3.8077'),
            longitude: new Prisma.Decimal('103.3260'),
            isccEuCertStatus: 'Draft',
        },
    })
    console.log(`  ✓ Companies: ${palmStar.name}, ${greenValley.name}`)

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4 — Users (Prisma)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 4: Prisma Users ──────────────────────────────────────────')

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@greentrace.local' },
        update: { supabaseUserId: adminUid },
        create: { supabaseUserId: adminUid, email: 'admin@greentrace.local', name: 'Super Admin', role: UserRole.SUPER_ADMIN, organisationId: org.id },
    })

    const managerUser = await prisma.user.upsert({
        where: { email: 'manager@greentrace.local' },
        update: { supabaseUserId: managerUid },
        create: { supabaseUserId: managerUid, email: 'manager@greentrace.local', name: 'Alex Manager', role: UserRole.AGGREGATOR_MANAGER, organisationId: org.id },
    })

    const psManagerUser = await prisma.user.upsert({
        where: { email: 'ps.manager@greentrace.local' },
        update: { supabaseUserId: psManagerUid },
        create: { supabaseUserId: psManagerUid, email: 'ps.manager@greentrace.local', name: 'Sarah Chen', role: UserRole.COMPANY_MANAGER, companyId: palmStar.id },
    })

    const psStaffUser = await prisma.user.upsert({
        where: { email: 'ps.staff@greentrace.local' },
        update: { supabaseUserId: psStaffUid },
        create: { supabaseUserId: psStaffUid, email: 'ps.staff@greentrace.local', name: 'Raj Kumar', role: UserRole.COMPANY_STAFF, companyId: palmStar.id },
    })

    const gvManagerUser = await prisma.user.upsert({
        where: { email: 'gv.manager@greentrace.local' },
        update: { supabaseUserId: gvManagerUid },
        create: { supabaseUserId: gvManagerUid, email: 'gv.manager@greentrace.local', name: 'James Wong', role: UserRole.COMPANY_MANAGER, companyId: greenValley.id },
    })

    const auditorUser = await prisma.user.upsert({
        where: { email: 'auditor@greentrace.local' },
        update: { supabaseUserId: auditorUid },
        create: { supabaseUserId: auditorUid, email: 'auditor@greentrace.local', name: 'Lisa Tan', role: UserRole.AUDITOR, organisationId: org.id },
    })
    console.log('  ✓ 6 users created/updated')

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 5 — Regulation Profile + Requirements
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 5: Regulation Profile & Requirements ─────────────────────')

    const profile = await prisma.regulationProfile.upsert({
        where: { regulation_version: { regulation: 'ISCC_EU', version: '2024-v1' } },
        update: {},
        create: {
            regulation: 'ISCC_EU',
            version: '2024-v1',
            name: 'ISCC EU 2024 v1',
            description: 'International Sustainability and Carbon Certification – EU 2024 edition.',
            isActive: true,
            publishedAt: new Date('2024-01-01'),
        },
    })

    const envPillar = await prisma.requirementPillar.upsert({
        where: { profileId_code: { profileId: profile.id, code: 'ENV' } },
        update: {},
        create: { profileId: profile.id, code: 'ENV', name: 'Environmental', displayOrder: 1 },
    })
    const socPillar = await prisma.requirementPillar.upsert({
        where: { profileId_code: { profileId: profile.id, code: 'SOC' } },
        update: {},
        create: { profileId: profile.id, code: 'SOC', name: 'Social', displayOrder: 2 },
    })

    const ghgCat = await prisma.requirementCategory.upsert({
        where: { pillarId_code: { pillarId: envPillar.id, code: 'ENV-01' } },
        update: {},
        create: { pillarId: envPillar.id, code: 'ENV-01', name: 'GHG Emissions', displayOrder: 1 },
    })
    const wasteCat = await prisma.requirementCategory.upsert({
        where: { pillarId_code: { pillarId: envPillar.id, code: 'ENV-02' } },
        update: {},
        create: { pillarId: envPillar.id, code: 'ENV-02', name: 'Waste Management', displayOrder: 2 },
    })
    const labourCat = await prisma.requirementCategory.upsert({
        where: { pillarId_code: { pillarId: socPillar.id, code: 'SOC-01' } },
        update: {},
        create: { pillarId: socPillar.id, code: 'SOC-01', name: 'Labour Rights', displayOrder: 1 },
    })
    const healthCat = await prisma.requirementCategory.upsert({
        where: { pillarId_code: { pillarId: socPillar.id, code: 'SOC-02' } },
        update: {},
        create: { pillarId: socPillar.id, code: 'SOC-02', name: 'Health & Safety', displayOrder: 2 },
    })

    // ISCC EU Principle 1 & 2: Protection of biodiversity and carbon stocks
    const landCat = await prisma.requirementCategory.upsert({
        where: { pillarId_code: { pillarId: envPillar.id, code: 'ENV-03' } },
        update: {},
        create: { pillarId: envPillar.id, code: 'ENV-03', name: 'Land & Carbon Stocks', displayOrder: 3 },
    })

    // ISCC EU Principle 5: Compliance with laws
    const govPillar = await prisma.requirementPillar.upsert({
        where: { profileId_code: { profileId: profile.id, code: 'GOV' } },
        update: {},
        create: { profileId: profile.id, code: 'GOV', name: 'Governance & Legal', displayOrder: 3 },
    })
    const legalCat = await prisma.requirementCategory.upsert({
        where: { pillarId_code: { pillarId: govPillar.id, code: 'GOV-01' } },
        update: {},
        create: { pillarId: govPillar.id, code: 'GOV-01', name: 'Legal Compliance', displayOrder: 1 },
    })

    const reqDefs = [
        { categoryId: ghgCat.id, code: 'ENV-01-001', name: 'Scope 1 Direct GHG Emissions', description: 'Total direct GHG emissions from owned or controlled sources.', guidanceText: 'Include diesel combustion, natural gas, and POME methane. Report in tCO2e.', dataType: RequirementDataType.ABSOLUTE_QUANTITY, ghgScope: GHGScope.SCOPE1, criticality: RequirementCriticality.CRITICAL, unit: 'tCO2e', displayOrder: 1 },
        { categoryId: ghgCat.id, code: 'ENV-01-002', name: 'Scope 2 Grid Electricity Consumption', description: 'Indirect GHG from purchased electricity.', guidanceText: 'Obtain monthly electricity bills and apply the applicable grid emission factor.', dataType: RequirementDataType.ABSOLUTE_QUANTITY, ghgScope: GHGScope.SCOPE2, criticality: RequirementCriticality.CRITICAL, unit: 'MWh', displayOrder: 2 },
        { categoryId: ghgCat.id, code: 'ENV-01-003', name: 'GHG Intensity per Tonne CPO', description: 'Total net GHG emissions per tonne of CPO produced.', guidanceText: 'Divide total Scope 1+2 tCO2e by tonnes of CPO produced.', dataType: RequirementDataType.RATE, criticality: RequirementCriticality.CRITICAL, unit: 'tCO2e/tonne CPO', displayOrder: 3 },
        { categoryId: ghgCat.id, code: 'ENV-01-004', name: 'POME Methane Capture Evidence', description: 'Documentary evidence that POME methane is captured and flared or utilised.', guidanceText: 'Upload the POME capture system inspection report.', dataType: RequirementDataType.DOCUMENT_ONLY, requiresForm: false, criticality: RequirementCriticality.CRITICAL, displayOrder: 4 },
        { categoryId: wasteCat.id, code: 'ENV-02-001', name: 'Scheduled Waste Disposal Records', description: 'Documented records of all scheduled/hazardous waste lawfully disposed.', guidanceText: 'Attach waste disposal manifests from licensed contractors.', dataType: RequirementDataType.DOCUMENT_ONLY, requiresForm: false, criticality: RequirementCriticality.NON_CRITICAL, displayOrder: 1 },
        { categoryId: wasteCat.id, code: 'ENV-02-002', name: 'EFB Application Rate', description: 'Rate of empty fruit bunch applied as field mulch per hectare.', guidanceText: 'Include records from the land application logbook.', dataType: RequirementDataType.RATE, criticality: RequirementCriticality.NON_CRITICAL, unit: 'tonnes EFB/ha', displayOrder: 2 },
        { categoryId: labourCat.id, code: 'SOC-01-001', name: 'Minimum Wage Compliance Declaration', description: 'Declaration that all workers are paid at or above statutory minimum wage.', guidanceText: 'Attach payroll summary and sign the compliance declaration form.', dataType: RequirementDataType.DOCUMENT_ONLY, requiresForm: false, criticality: RequirementCriticality.CRITICAL, displayOrder: 1 },
        { categoryId: labourCat.id, code: 'SOC-01-002', name: 'Grievance Cases Recorded', description: 'Number of worker grievance cases recorded and resolved.', guidanceText: 'Enter the count of grievances opened and separately resolved.', dataType: RequirementDataType.ABSOLUTE_QUANTITY, criticality: RequirementCriticality.NON_CRITICAL, unit: 'cases', displayOrder: 2 },
        { categoryId: healthCat.id, code: 'SOC-02-001', name: 'Lost-Time Injury Rate (LTIR)', description: 'Number of lost-time injuries per million hours worked.', guidanceText: 'LTIR = (LTIs × 1,000,000) / Total hours worked.', dataType: RequirementDataType.RATE, criticality: RequirementCriticality.CRITICAL, unit: 'LTIs per million hours', displayOrder: 1 },
        { categoryId: healthCat.id, code: 'SOC-02-002', name: 'Safety Training Hours', description: 'Total safety training hours delivered to mill workers.', guidanceText: 'Include induction, toolbox talks, and formal safety courses.', dataType: RequirementDataType.ABSOLUTE_QUANTITY, criticality: RequirementCriticality.NON_CRITICAL, unit: 'hours', displayOrder: 2 },
        // ISCC EU Principle 1 & 2 — No conversion of land with high biodiversity value or high carbon stocks
        { categoryId: landCat.id, code: 'ENV-03-001', name: 'No High Carbon Stock Land Conversion', description: 'Confirmation that all FFB supplied to the mill originates from land not converted from areas of high biodiversity value (primary forest, protected areas, peatland) after January 2008, per ISCC EU Principles 1 and 2.', guidanceText: 'Obtain and retain current RSPO, MSPO, or equivalent certification evidence for each FFB supplier, or complete the ISCC-compliant supplier due-diligence declaration. Flag any supplier without valid certification for corrective action.', dataType: RequirementDataType.DOCUMENT_ONLY, requiresForm: false, criticality: RequirementCriticality.CRITICAL, displayOrder: 1 },
        // ISCC EU Principle 5 — Compliance with applicable laws
        { categoryId: legalCat.id, code: 'GOV-01-001', name: 'Legal Compliance Declaration', description: 'Annual declaration that the mill operates in full compliance with all applicable national and local laws, including environmental permits, labour regulations, land-use rights, and tax obligations.', guidanceText: 'Complete and sign the annual legal compliance self-declaration form. Attach copies of current operating licenses, environmental permits (DOE approval), and evidence that any regulatory notices or corrective-action requests have been resolved.', dataType: RequirementDataType.DOCUMENT_ONLY, requiresForm: false, criticality: RequirementCriticality.CRITICAL, displayOrder: 1 },
    ]

    const requirements: Record<string, string> = {}
    for (const req of reqDefs) {
        const r = await prisma.requirement.upsert({
            where: { categoryId_code: { categoryId: req.categoryId, code: req.code } },
            update: {},
            create: req as any,
        })
        requirements[req.code] = r.id
    }
    console.log(`  ✓ ${reqDefs.length} requirements`)

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 6 — Emission Factors
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 6: Emission Factors ──────────────────────────────────────')

    const efDefs = [
        { id: 'seed-ef-diesel', name: 'Diesel Combustion (Stationary)', materialType: MaterialType.DIESEL, scope: GHGScope.SCOPE1, unitInput: 'litres', unitReference: 'kgCO2e', factorValue: new Prisma.Decimal('2.68'), source: 'IPCC 2006 Guidelines Vol.2 Table 1.4', validFrom: new Date('2024-01-01'), validTo: null, isDefault: true },
        { id: 'seed-ef-grid_electricity', name: 'Grid Electricity — Malaysia Peninsula', materialType: MaterialType.GRID_ELECTRICITY, scope: GHGScope.SCOPE2, unitInput: 'MWh', unitReference: 'kgCO2e', factorValue: new Prisma.Decimal('620.0'), source: 'Malaysia Energy Commission (Suruhanjaya Tenaga) Grid Emission Factor 2022, Peninsular Malaysia', validFrom: new Date('2024-01-01'), validTo: null, isDefault: true },
        { id: 'seed-ef-pome_methane', name: 'POME Methane (Uncaptured)', materialType: MaterialType.POME_METHANE, scope: GHGScope.SCOPE1, unitInput: 'm3', unitReference: 'kgCO2e', factorValue: new Prisma.Decimal('25.0'), source: 'ISCC EU System Document 202 v4.1; IPCC AR4 CH4 GWP100 = 25', validFrom: new Date('2024-01-01'), validTo: null, isDefault: true },
        { id: 'seed-ef-natural_gas', name: 'Natural Gas Combustion', materialType: MaterialType.NATURAL_GAS, scope: GHGScope.SCOPE1, unitInput: 'm3', unitReference: 'kgCO2e', factorValue: new Prisma.Decimal('2.02'), source: 'IPCC 2006 Guidelines Vol.2 Table 2.2', validFrom: new Date('2024-01-01'), validTo: null, isDefault: true },
    ]
    for (const ef of efDefs) {
        await prisma.emissionFactor.upsert({ where: { id: ef.id }, update: {}, create: ef as any })
    }
    console.log(`  ✓ ${efDefs.length} emission factors`)

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 7 — Checklists
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 7: Checklists ────────────────────────────────────────────')

    // Palm Star 2023 — CERTIFIED (for audit base)
    const ps2023Checklist = await prisma.checklist.upsert({
        where: { companyId_profileId_periodStart_periodEnd: { companyId: palmStar.id, profileId: profile.id, periodStart: new Date('2023-01-01'), periodEnd: new Date('2023-12-31') } },
        update: {},
        create: {
            companyId: palmStar.id, profileId: profile.id,
            regulation: 'ISCC_EU',
            periodStart: new Date('2023-01-01'), periodEnd: new Date('2023-12-31'),
            status: ChecklistStatus.CERTIFIED,
            submittedAt: new Date('2024-01-15'),
            submittedById: psManagerUser.id,
            reviewStartedAt: new Date('2024-01-20'),
            reviewedById: managerUser.id,
            lockedAt: new Date('2024-02-28'),
            lockedById: adminUser.id,
        },
    })

    // Palm Star 2024 — SUBMITTED
    const ps2024Checklist = await prisma.checklist.upsert({
        where: { companyId_profileId_periodStart_periodEnd: { companyId: palmStar.id, profileId: profile.id, periodStart: new Date('2024-01-01'), periodEnd: new Date('2024-12-31') } },
        update: {},
        create: {
            companyId: palmStar.id, profileId: profile.id,
            regulation: 'ISCC_EU',
            periodStart: new Date('2024-01-01'), periodEnd: new Date('2024-12-31'),
            status: ChecklistStatus.SUBMITTED,
            submittedAt: new Date('2025-01-20'),
            submittedById: psManagerUser.id,
            reviewStartedAt: new Date('2025-01-22'),
            reviewedById: managerUser.id,
        },
    })

    // Green Valley 2024 — DRAFT
    const gv2024Checklist = await prisma.checklist.upsert({
        where: { companyId_profileId_periodStart_periodEnd: { companyId: greenValley.id, profileId: profile.id, periodStart: new Date('2024-01-01'), periodEnd: new Date('2024-12-31') } },
        update: {},
        create: {
            companyId: greenValley.id, profileId: profile.id,
            regulation: 'ISCC_EU',
            periodStart: new Date('2024-01-01'), periodEnd: new Date('2024-12-31'),
            status: ChecklistStatus.DRAFT,
        },
    })
    console.log('  ✓ 3 checklists (PS 2023 CERTIFIED, PS 2024 SUBMITTED, GV 2024 DRAFT)')

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 8 — Checklist Items
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 8: Checklist Items ───────────────────────────────────────')

    // Palm Star 2024 items with varied statuses
    const ps24ItemDefs = [
        { code: 'ENV-01-001', status: ChecklistItemStatus.COMPLETE,      assigneeId: psStaffUser.id,   completedAt: new Date('2025-01-10'), aggregatorReviewed: true,  aggregatorReviewedAt: new Date('2025-01-23'), aggregatorReviewerId: managerUser.id, dueDate: new Date('2025-01-15'), dueDateStatus: DueDateStatus.ON_TRACK },
        { code: 'ENV-01-002', status: ChecklistItemStatus.COMPLETE,      assigneeId: psStaffUser.id,   completedAt: new Date('2025-01-08'), aggregatorReviewed: true,  aggregatorReviewedAt: new Date('2025-01-23'), aggregatorReviewerId: managerUser.id, dueDate: new Date('2025-01-15'), dueDateStatus: DueDateStatus.ON_TRACK },
        { code: 'ENV-01-003', status: ChecklistItemStatus.COMPLETE,      assigneeId: psManagerUser.id, completedAt: new Date('2025-01-12'), aggregatorReviewed: true,  aggregatorReviewedAt: new Date('2025-01-23'), aggregatorReviewerId: managerUser.id, dueDate: new Date('2025-01-15'), dueDateStatus: DueDateStatus.ON_TRACK },
        { code: 'ENV-01-004', status: ChecklistItemStatus.COMPLETE,      assigneeId: psManagerUser.id, completedAt: new Date('2025-01-11'), aggregatorReviewed: false, dueDate: new Date('2025-01-15'), dueDateStatus: DueDateStatus.ON_TRACK },
        { code: 'ENV-02-001', status: ChecklistItemStatus.IN_PROGRESS,   assigneeId: psStaffUser.id,   dueDate: new Date('2025-02-01'), dueDateStatus: DueDateStatus.ON_TRACK },
        { code: 'ENV-02-002', status: ChecklistItemStatus.IN_PROGRESS,   assigneeId: psStaffUser.id,   dueDate: new Date('2025-02-01'), dueDateStatus: DueDateStatus.ON_TRACK },
        { code: 'SOC-01-001', status: ChecklistItemStatus.NOT_STARTED,   assigneeId: psManagerUser.id, dueDate: new Date('2025-02-15'), dueDateStatus: DueDateStatus.ON_TRACK },
        { code: 'SOC-01-002', status: ChecklistItemStatus.COMPLETE,      assigneeId: psStaffUser.id,   completedAt: new Date('2025-01-09'), aggregatorReviewed: false, dueDate: new Date('2025-01-15'), dueDateStatus: DueDateStatus.ON_TRACK },
        { code: 'SOC-02-001', status: ChecklistItemStatus.COMPLETE,      assigneeId: psManagerUser.id, completedAt: new Date('2025-01-10'), aggregatorReviewed: false, dueDate: new Date('2025-01-15'), dueDateStatus: DueDateStatus.ON_TRACK },
        { code: 'SOC-02-002', status: ChecklistItemStatus.COMPLETE,      assigneeId: psStaffUser.id,   completedAt: new Date('2025-01-07'), aggregatorReviewed: false, dueDate: new Date('2025-01-15'), dueDateStatus: DueDateStatus.ON_TRACK },
        { code: 'ENV-03-001', status: ChecklistItemStatus.NOT_STARTED,   assigneeId: psManagerUser.id, dueDate: new Date('2025-02-15'), dueDateStatus: DueDateStatus.ON_TRACK },
        { code: 'GOV-01-001', status: ChecklistItemStatus.NOT_STARTED,   assigneeId: psManagerUser.id, dueDate: new Date('2025-02-15'), dueDateStatus: DueDateStatus.ON_TRACK },
    ]

    const ps24Items: Record<string, string> = {}
    for (const def of ps24ItemDefs) {
        const reqId = requirements[def.code]
        const existing = await prisma.checklistItem.findUnique({
            where: { checklistId_requirementId: { checklistId: ps2024Checklist.id, requirementId: reqId } }
        })
        const item = existing ?? await prisma.checklistItem.create({
            data: {
                checklistId: ps2024Checklist.id,
                requirementId: reqId,
                status: def.status,
                assigneeId: def.assigneeId,
                dueDate: def.dueDate,
                dueDateStatus: def.dueDateStatus,
                completedAt: def.completedAt,
                aggregatorReviewed: def.aggregatorReviewed ?? false,
                aggregatorReviewedAt: def.aggregatorReviewedAt,
                aggregatorReviewerId: def.aggregatorReviewerId,
            },
        })
        ps24Items[def.code] = item.id
    }

    // Palm Star 2023 items (all COMPLETE for certified checklist)
    const ps23Items: Record<string, string> = {}
    for (const code of Object.keys(requirements)) {
        const reqId = requirements[code]
        const existing = await prisma.checklistItem.findUnique({
            where: { checklistId_requirementId: { checklistId: ps2023Checklist.id, requirementId: reqId } }
        })
        const item = existing ?? await prisma.checklistItem.create({
            data: {
                checklistId: ps2023Checklist.id,
                requirementId: reqId,
                status: ChecklistItemStatus.COMPLETE,
                assigneeId: psStaffUser.id,
                completedAt: new Date('2024-01-10'),
                aggregatorReviewed: true,
                aggregatorReviewedAt: new Date('2024-01-25'),
                aggregatorReviewerId: managerUser.id,
            },
        })
        ps23Items[code] = item.id
    }

    // Green Valley 2024 items (all NOT_STARTED)
    for (const code of Object.keys(requirements)) {
        const reqId = requirements[code]
        const existing = await prisma.checklistItem.findUnique({
            where: { checklistId_requirementId: { checklistId: gv2024Checklist.id, requirementId: reqId } }
        })
        if (!existing) {
            await prisma.checklistItem.create({
                data: {
                    checklistId: gv2024Checklist.id,
                    requirementId: reqId,
                    status: ChecklistItemStatus.NOT_STARTED,
                    assigneeId: gvManagerUser.id,
                    dueDate: new Date('2025-03-31'),
                    dueDateStatus: DueDateStatus.ON_TRACK,
                },
            })
        }
    }
    console.log('  ✓ Checklist items for PS 2023, PS 2024, GV 2024')

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 9 — Comments on checklist items
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 9: Checklist Comments ────────────────────────────────────')

    const existingComments = await prisma.checklistItemComment.count({ where: { checklistItemId: ps24Items['ENV-01-002'] } })
    if (existingComments === 0) {
        await prisma.checklistItemComment.createMany({
            data: [
                { checklistItemId: ps24Items['ENV-01-002'], authorId: psStaffUser.id, roleAtTimeOfComment: UserRole.COMPANY_STAFF, body: 'Monthly electricity bills uploaded for Jan–Dec 2024. Total consumption: 4,820 MWh.', createdAt: new Date('2025-01-08T09:00:00Z') },
                { checklistItemId: ps24Items['ENV-01-002'], authorId: managerUser.id, roleAtTimeOfComment: UserRole.AGGREGATOR_MANAGER, body: 'Reviewed and confirmed. Figures align with the utility invoices. No discrepancy noted.', createdAt: new Date('2025-01-23T14:30:00Z') },
                { checklistItemId: ps24Items['ENV-01-001'], authorId: psManagerUser.id, roleAtTimeOfComment: UserRole.COMPANY_MANAGER, body: 'Diesel consumption was higher in Q3 due to scheduled generator maintenance. Supporting log attached.', createdAt: new Date('2025-01-10T11:15:00Z') },
                { checklistItemId: ps24Items['ENV-02-001'], authorId: psStaffUser.id, roleAtTimeOfComment: UserRole.COMPANY_STAFF, body: 'Waste disposal manifests from Q1-Q3 uploaded. Awaiting Q4 manifest from contractor.', createdAt: new Date('2025-01-25T16:00:00Z') },
            ],
        })
    }
    console.log('  ✓ Comments seeded')

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 10 — Data Entries (GHG items for PS 2024)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 10: Data Entries ─────────────────────────────────────────')

    const existingDE = await prisma.dataEntry.count({ where: { checklistItemId: ps24Items['ENV-01-002'] } })
    if (existingDE === 0) {
        // Monthly electricity 2024 (Scope 2) — ENV-01-002
        const monthlyMWh = [402, 385, 421, 398, 410, 438, 412, 405, 395, 388, 375, 391]
        const monthlyElecEntries = monthlyMWh.map((mwh, i) => ({
            checklistItemId: ps24Items['ENV-01-002'],
            enteredById: psStaffUser.id,
            entryType: DataEntryType.FORM01_ABSOLUTE,
            valueRaw: new Prisma.Decimal(mwh),
            unitInput: 'MWh',
            valueConverted: new Prisma.Decimal(mwh * 620),
            unitReference: 'kgCO2e',
            emissionFactorId: 'seed-ef-grid_electricity',
            reportingMonth: new Date(`2024-${String(i + 1).padStart(2, '0')}-01`),
        }))
        await prisma.dataEntry.createMany({ data: monthlyElecEntries })

        // Annual diesel (Scope 1) — ENV-01-001
        await prisma.dataEntry.create({
            data: {
                checklistItemId: ps24Items['ENV-01-001'],
                enteredById: psStaffUser.id,
                entryType: DataEntryType.FORM01_ABSOLUTE,
                valueRaw: new Prisma.Decimal('84500'),
                unitInput: 'litres',
                valueConverted: new Prisma.Decimal('226460'),
                unitReference: 'kgCO2e',
                emissionFactorId: 'seed-ef-diesel',
                notes: 'Annual diesel consumption including generator and vehicle use.',
            },
        })

        // POME methane (Scope 1) — ENV-01-001
        await prisma.dataEntry.create({
            data: {
                checklistItemId: ps24Items['ENV-01-001'],
                enteredById: psStaffUser.id,
                entryType: DataEntryType.FORM01_ABSOLUTE,
                valueRaw: new Prisma.Decimal('12400'),
                unitInput: 'm3',
                valueConverted: new Prisma.Decimal('310000'),
                unitReference: 'kgCO2e',
                emissionFactorId: 'seed-ef-pome_methane',
                notes: 'POME methane from open lagoon system before retrofit.',
            },
        })

        // GHG intensity rate — ENV-01-003
        await prisma.dataEntry.create({
            data: {
                checklistItemId: ps24Items['ENV-01-003'],
                enteredById: psManagerUser.id,
                entryType: DataEntryType.FORM02_RATE,
                valueRaw: new Prisma.Decimal('0.238'),
                unitInput: 'tCO2e/tonne CPO',
                notes: 'Calculated from total Scope 1+2 emissions (3,524.86 tCO2e) divided by 14,800 tonnes CPO produced. Scope 1: diesel 226,460 kgCO2e + POME methane 310,000 kgCO2e. Scope 2: grid electricity 2,988,400 kgCO2e.',
            },
        })

        // Grievances — SOC-01-002
        await prisma.dataEntry.create({
            data: {
                checklistItemId: ps24Items['SOC-01-002'],
                enteredById: psManagerUser.id,
                entryType: DataEntryType.FORM01_ABSOLUTE,
                valueRaw: new Prisma.Decimal('3'),
                unitInput: 'cases',
                notes: '3 grievances raised; all resolved within the reporting period.',
            },
        })

        // LTIR — SOC-02-001
        await prisma.dataEntry.create({
            data: {
                checklistItemId: ps24Items['SOC-02-001'],
                enteredById: psManagerUser.id,
                entryType: DataEntryType.FORM02_RATE,
                valueRaw: new Prisma.Decimal('1.24'),
                unitInput: 'LTIs per million hours',
                notes: '2 LTIs in 1,610,000 total hours worked.',
            },
        })

        // Safety training — SOC-02-002
        await prisma.dataEntry.create({
            data: {
                checklistItemId: ps24Items['SOC-02-002'],
                enteredById: psStaffUser.id,
                entryType: DataEntryType.FORM01_ABSOLUTE,
                valueRaw: new Prisma.Decimal('1248'),
                unitInput: 'hours',
                notes: 'Includes 4 formal courses, 52 weekly toolbox talks, and induction for 6 new hires.',
            },
        })
    }
    console.log('  ✓ Data entries for GHG, grievances, safety')

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 10b — Data Entries (GHG items for PS 2023 CERTIFIED)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 10b: Data Entries PS 2023 (CERTIFIED) ────────────────────')

    const existingDE23 = await prisma.dataEntry.count({ where: { checklistItemId: ps23Items['ENV-01-002'] } })
    if (existingDE23 === 0) {
        // Monthly electricity 2023 (Scope 2) — ENV-01-002
        const monthlyMWh23 = [388, 372, 405, 381, 395, 420, 398, 390, 380, 374, 362, 378]
        const elecEntries23 = monthlyMWh23.map((mwh, i) => ({
            checklistItemId: ps23Items['ENV-01-002'],
            enteredById: psStaffUser.id,
            entryType: DataEntryType.FORM01_ABSOLUTE,
            valueRaw: new Prisma.Decimal(mwh),
            unitInput: 'MWh',
            valueConverted: new Prisma.Decimal(mwh * 620),
            unitReference: 'kgCO2e',
            emissionFactorId: 'seed-ef-grid_electricity',
            reportingMonth: new Date(`2023-${String(i + 1).padStart(2, '0')}-01`),
        }))
        await prisma.dataEntry.createMany({ data: elecEntries23 })

        // Annual diesel (Scope 1) — ENV-01-001
        await prisma.dataEntry.create({
            data: {
                checklistItemId: ps23Items['ENV-01-001'],
                enteredById: psStaffUser.id,
                entryType: DataEntryType.FORM01_ABSOLUTE,
                valueRaw: new Prisma.Decimal('81200'),
                unitInput: 'litres',
                valueConverted: new Prisma.Decimal('217616'),
                unitReference: 'kgCO2e',
                emissionFactorId: 'seed-ef-diesel',
                notes: 'Annual diesel consumption 2023.',
            },
        })

        // POME methane (Scope 1) — ENV-01-001
        await prisma.dataEntry.create({
            data: {
                checklistItemId: ps23Items['ENV-01-001'],
                enteredById: psStaffUser.id,
                entryType: DataEntryType.FORM01_ABSOLUTE,
                valueRaw: new Prisma.Decimal('11800'),
                unitInput: 'm3',
                valueConverted: new Prisma.Decimal('295000'),
                unitReference: 'kgCO2e',
                emissionFactorId: 'seed-ef-pome_methane',
                notes: 'POME methane 2023 from open lagoon system.',
            },
        })

        console.log('  ✓ GHG data entries seeded for PS 2023 CERTIFIED checklist')
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 11 — Mass Balance Entries
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 11: Mass Balance Entries ─────────────────────────────────')

    const mbDefs = [
        {
            materialType: MaterialType.CRUDE_PALM_OIL,
            certifiedIn: '15200', nonCertifiedIn: '1800', certifiedOut: '14800', nonCertifiedOut: '1600',
            openingStock: '500', closingStock: '900', isReconciled: true,
        },
        {
            materialType: MaterialType.PALM_KERNEL_OIL,
            certifiedIn: '2100', nonCertifiedIn: '300', certifiedOut: '1900', nonCertifiedOut: '280',
            openingStock: '150', closingStock: '350', isReconciled: true,
        },
        {
            materialType: MaterialType.PALM_KERNEL_EXPELLER,
            certifiedIn: '1800', nonCertifiedIn: '200', certifiedOut: '1750', nonCertifiedOut: '195',
            openingStock: '80', closingStock: '130', isReconciled: false, discrepancyFlag: true, discrepancyNotes: 'Minor variance in Q4 PKE tonnage; under investigation with weighbridge team.',
        },
    ]

    for (const mb of mbDefs) {
        await prisma.massBalanceEntry.upsert({
            where: { companyId_checklistId_regulation_materialType: { companyId: palmStar.id, checklistId: ps2024Checklist.id, regulation: 'ISCC_EU', materialType: mb.materialType } },
            update: {},
            create: {
                companyId: palmStar.id,
                checklistId: ps2024Checklist.id,
                regulation: 'ISCC_EU',
                periodStart: new Date('2024-01-01'),
                periodEnd: new Date('2024-12-31'),
                materialType: mb.materialType,
                certifiedIn: new Prisma.Decimal(mb.certifiedIn),
                nonCertifiedIn: new Prisma.Decimal(mb.nonCertifiedIn),
                certifiedOut: new Prisma.Decimal(mb.certifiedOut),
                nonCertifiedOut: new Prisma.Decimal(mb.nonCertifiedOut),
                openingStock: new Prisma.Decimal(mb.openingStock),
                closingStock: new Prisma.Decimal(mb.closingStock),
                isReconciled: mb.isReconciled,
                discrepancyFlag: mb.discrepancyFlag ?? false,
                discrepancyNotes: mb.discrepancyNotes,
            },
        })
    }
    console.log('  ✓ 3 mass balance entries (CPO, PKO, PKE)')

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 12 — Shipments
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 12: Shipments ────────────────────────────────────────────')

    const shipmentDefs = [
        // Inbound FFB
        { direction: ShipmentDirection.INBOUND, materialType: MaterialType.FFB, volumeMt: '4850.5', certificationStatus: CertificationStatus.CERTIFIED, counterpartyName: 'Kota Tinggi Smallholders Co-op', referenceNumber: 'WB-2024-0101', shipmentDate: new Date('2024-01-05'), ghgValueKgco2e: '9700.0' },
        { direction: ShipmentDirection.INBOUND, materialType: MaterialType.FFB, volumeMt: '5120.0', certificationStatus: CertificationStatus.CERTIFIED, counterpartyName: 'Kota Tinggi Smallholders Co-op', referenceNumber: 'WB-2024-0401', shipmentDate: new Date('2024-04-08'), ghgValueKgco2e: '10240.0' },
        { direction: ShipmentDirection.INBOUND, materialType: MaterialType.FFB, volumeMt: '4975.3', certificationStatus: CertificationStatus.CERTIFIED, counterpartyName: 'Paloh Estate Sdn Bhd', referenceNumber: 'WB-2024-0701', shipmentDate: new Date('2024-07-12'), ghgValueKgco2e: '9950.6' },
        { direction: ShipmentDirection.INBOUND, materialType: MaterialType.FFB, volumeMt: '5310.8', certificationStatus: CertificationStatus.NON_CERTIFIED, counterpartyName: 'Segamat Independent Farm', referenceNumber: 'WB-2024-1001', shipmentDate: new Date('2024-10-03'), ghgValueKgco2e: null },
        // Outbound CPO certified
        { direction: ShipmentDirection.OUTBOUND, materialType: MaterialType.CRUDE_PALM_OIL, volumeMt: '3800.0', certificationStatus: CertificationStatus.CERTIFIED, counterpartyName: 'Wilmar International Ltd', referenceNumber: 'BL-2024-CPO-001', shipmentDate: new Date('2024-02-14'), sustainabilityDeclarationNumber: 'ISCC-SD-2024-MY001', ghgValueKgco2e: '1851.6', isccAllocationPct: new Prisma.Decimal('100.00'), allocationConfirmedAt: new Date('2024-02-16') },
        { direction: ShipmentDirection.OUTBOUND, materialType: MaterialType.CRUDE_PALM_OIL, volumeMt: '3650.0', certificationStatus: CertificationStatus.CERTIFIED, counterpartyName: 'Wilmar International Ltd', referenceNumber: 'BL-2024-CPO-002', shipmentDate: new Date('2024-05-20'), sustainabilityDeclarationNumber: 'ISCC-SD-2024-MY002', ghgValueKgco2e: '1779.35', isccAllocationPct: new Prisma.Decimal('100.00'), allocationConfirmedAt: new Date('2024-05-22') },
        { direction: ShipmentDirection.OUTBOUND, materialType: MaterialType.CRUDE_PALM_OIL, volumeMt: '3900.0', certificationStatus: CertificationStatus.CERTIFIED, counterpartyName: 'IOI Corporation Berhad', referenceNumber: 'BL-2024-CPO-003', shipmentDate: new Date('2024-08-18'), sustainabilityDeclarationNumber: 'ISCC-SD-2024-MY003', ghgValueKgco2e: '1901.1', isccAllocationPct: new Prisma.Decimal('100.00'), allocationConfirmedAt: new Date('2024-08-20') },
        // Outbound CPO non-certified
        { direction: ShipmentDirection.OUTBOUND, materialType: MaterialType.CRUDE_PALM_OIL, volumeMt: '800.0', certificationStatus: CertificationStatus.NON_CERTIFIED, counterpartyName: 'Local Buyer Sdn Bhd', referenceNumber: 'BL-2024-CPO-NC001', shipmentDate: new Date('2024-03-10'), ghgValueKgco2e: null },
        { direction: ShipmentDirection.OUTBOUND, materialType: MaterialType.CRUDE_PALM_OIL, volumeMt: '650.0', certificationStatus: CertificationStatus.NON_CERTIFIED, counterpartyName: 'Local Buyer Sdn Bhd', referenceNumber: 'BL-2024-CPO-NC002', shipmentDate: new Date('2024-09-05'), ghgValueKgco2e: null },
        // Outbound PKO
        { direction: ShipmentDirection.OUTBOUND, materialType: MaterialType.PALM_KERNEL_OIL, volumeMt: '950.0', certificationStatus: CertificationStatus.CERTIFIED, counterpartyName: 'Musim Mas Group', referenceNumber: 'BL-2024-PKO-001', shipmentDate: new Date('2024-03-28'), sustainabilityDeclarationNumber: 'ISCC-SD-2024-MY004', ghgValueKgco2e: '463.15', isccAllocationPct: new Prisma.Decimal('100.00') },
        { direction: ShipmentDirection.OUTBOUND, materialType: MaterialType.PALM_KERNEL_OIL, volumeMt: '950.0', certificationStatus: CertificationStatus.CERTIFIED, counterpartyName: 'Musim Mas Group', referenceNumber: 'BL-2024-PKO-002', shipmentDate: new Date('2024-09-30'), sustainabilityDeclarationNumber: 'ISCC-SD-2024-MY005', ghgValueKgco2e: '463.15', isccAllocationPct: new Prisma.Decimal('100.00') },
    ]

    for (const s of shipmentDefs) {
        await prisma.shipmentRecord.upsert({
            where: { companyId_referenceNumber_shipmentDate: { companyId: palmStar.id, referenceNumber: s.referenceNumber, shipmentDate: s.shipmentDate } },
            update: {},
            create: {
                companyId: palmStar.id,
                direction: s.direction,
                materialType: s.materialType,
                volumeMt: new Prisma.Decimal(s.volumeMt),
                certificationStatus: s.certificationStatus,
                counterpartyName: s.counterpartyName,
                referenceNumber: s.referenceNumber,
                shipmentDate: s.shipmentDate,
                sustainabilityDeclarationNumber: s.sustainabilityDeclarationNumber,
                ghgValueKgco2e: s.ghgValueKgco2e ? new Prisma.Decimal(s.ghgValueKgco2e) : null,
                source: ShipmentSource.MANUAL,
                isccAllocationPct: s.isccAllocationPct,
                allocationConfirmedAt: s.allocationConfirmedAt,
                allocationConfirmedById: s.allocationConfirmedAt ? psManagerUser.id : null,
            } as any,
        })
    }
    console.log(`  ✓ ${shipmentDefs.length} shipment records`)

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 13 — Import Job
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 13: Import Job ───────────────────────────────────────────')

    await prisma.importJob.upsert({
        where: { id: 'seed-import-job-01' },
        update: {},
        create: {
            id: 'seed-import-job-01',
            companyId: palmStar.id,
            uploadedById: psManagerUser.id,
            fileName: 'shipments_q1_2024.csv',
            fileType: ImportFileType.CSV,
            filePath: 'imports/palm-star/shipments_q1_2024.csv',
            status: ImportStatus.COMPLETED,
            rowCountTotal: 12,
            rowCountImported: 12,
            rowCountFailed: 0,
            appliedMappingJson: { "Shipment Date": "shipmentDate", "Volume (MT)": "volumeMt", "Reference No": "referenceNumber", "Buyer": "counterpartyName", "Material": "materialType", "Certified": "certificationStatus" },
            completedAt: new Date('2024-04-01'),
        },
    })

    await prisma.importJob.upsert({
        where: { id: 'seed-import-job-02' },
        update: {},
        create: {
            id: 'seed-import-job-02',
            companyId: palmStar.id,
            uploadedById: psManagerUser.id,
            fileName: 'weighbridge_data_oct2024.xlsx',
            fileType: ImportFileType.XLSX,
            filePath: 'imports/palm-star/weighbridge_data_oct2024.xlsx',
            status: ImportStatus.PARTIAL_SUCCESS,
            rowCountTotal: 45,
            rowCountImported: 42,
            rowCountFailed: 3,
            errorLog: [
                { row: 12, error: 'Invalid date format: "10-15-2024". Expected YYYY-MM-DD.' },
                { row: 23, error: 'Unknown material type: "CPO-RBD". Accepted values: CRUDE_PALM_OIL, FFB, etc.' },
                { row: 38, error: 'Missing required field: referenceNumber.' },
            ],
            completedAt: new Date('2024-10-08'),
        },
    })
    console.log('  ✓ 2 import jobs (1 completed, 1 partial success with error log)')

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 14 — Audit (PS 2023, PUBLISHED)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 14: Audit & Findings ─────────────────────────────────────')

    const audit2023 = await prisma.audit.upsert({
        where: { id: 'seed-audit-ps-2023' },
        update: {},
        create: {
            id: 'seed-audit-ps-2023',
            companyId: palmStar.id,
            checklistId: ps2023Checklist.id,
            regulation: 'ISCC_EU',
            auditType: AuditType.SURVEILLANCE,
            auditorId: auditorUser.id,
            periodStart: new Date('2023-01-01'),
            periodEnd: new Date('2023-12-31'),
            status: AuditStatus.PUBLISHED,
            scheduledDate: new Date('2024-02-05'),
            conductedDate: new Date('2024-02-07'),
            publishedAt: new Date('2024-02-28'),
        },
    })

    // Audit for PS 2024 — IN_PROGRESS
    const audit2024 = await prisma.audit.upsert({
        where: { id: 'seed-audit-ps-2024' },
        update: {},
        create: {
            id: 'seed-audit-ps-2024',
            companyId: palmStar.id,
            checklistId: ps2024Checklist.id,
            regulation: 'ISCC_EU',
            auditType: AuditType.RECERTIFICATION,
            auditorId: auditorUser.id,
            periodStart: new Date('2024-01-01'),
            periodEnd: new Date('2024-12-31'),
            status: AuditStatus.SCHEDULED,
            scheduledDate: new Date('2025-03-15'),
        },
    })

    // Findings for the 2023 PUBLISHED audit
    const findingDefs = [
        { checklistItemCode: 'ENV-01-001', findingType: FindingType.CONFORMANT, evidenceReviewed: 'Diesel purchase invoices and consumption log for Jan–Dec 2023 verified. Figures match submitted data within 2% tolerance. Emission factor applied correctly.', findingStatus: FindingStatus.CLOSED },
        { checklistItemCode: 'ENV-01-002', findingType: FindingType.CONFORMANT, evidenceReviewed: 'Monthly electricity bills from TNB Berhad reviewed for all 12 months. Grid emission factor (690 kgCO2e/MWh) applied correctly.', findingStatus: FindingStatus.CLOSED },
        { checklistItemCode: 'ENV-01-004', findingType: FindingType.NON_CONFORMANT_MINOR, evidenceReviewed: 'POME capture system inspection report reviewed. System was operational for 10 of 12 months. Nov–Dec 2023 maintenance downtime documented.', correctiveActionRequired: 'Provide evidence that the POME capture system was repaired and returned to full operation by Q1 2024. Submit operational logs for Jan–Mar 2024.', correctiveActionDeadline: new Date('2024-05-31'), findingStatus: FindingStatus.CLOSED },
        { checklistItemCode: 'SOC-01-001', findingType: FindingType.OBSERVATION, evidenceReviewed: 'Payroll records reviewed for a sample of 20 workers. All workers at or above minimum wage. Recommended formalising biannual wage compliance review process to maintain documentation quality.', findingStatus: FindingStatus.CLOSED },
        { checklistItemCode: 'SOC-02-001', findingType: FindingType.CONFORMANT, evidenceReviewed: 'LTIR of 1.52 per million hours reviewed. Incident reports for 2 LTIs reviewed and root-cause analysis documented. Corrective actions implemented.', findingStatus: FindingStatus.CLOSED },
    ]

    for (const fd of findingDefs) {
        const itemId = ps23Items[fd.checklistItemCode]
        await prisma.auditFinding.upsert({
            where: { auditId_checklistItemId: { auditId: audit2023.id, checklistItemId: itemId } },
            update: {},
            create: {
                auditId: audit2023.id,
                checklistItemId: itemId,
                findingType: fd.findingType,
                evidenceReviewed: fd.evidenceReviewed,
                correctiveActionRequired: fd.correctiveActionRequired,
                correctiveActionDeadline: fd.correctiveActionDeadline,
                findingStatus: fd.findingStatus,
            },
        })
    }

    // Audit Report for 2023 audit
    const existingReport = await prisma.auditReport.findUnique({ where: { auditId_version: { auditId: audit2023.id, version: 1 } } })
    if (!existingReport) {
        await prisma.auditReport.create({
            data: {
                auditId: audit2023.id,
                version: 1,
                contentJson: {
                    executiveSummary: 'Palm Star Mill (MY-PS-001) demonstrated substantial compliance with ISCC EU 2024 v1 requirements for the 2023 reporting period. One minor non-conformance was identified relating to POME methane capture system downtime in Q4 2023. A corrective action plan has been accepted and verified.',
                    overallConclusion: 'CERTIFIED with one closed minor NC',
                    findings: findingDefs.length,
                    conformant: 3,
                    minorNC: 1,
                    observations: 1,
                },
                generatedBy: LLMProvider.ANTHROPIC_CLAUDE,
                llmModel: 'claude-3-5-sonnet-20241022',
                generatedAt: new Date('2024-02-25'),
                reviewedById: managerUser.id,
                reviewedAt: new Date('2024-02-27'),
                status: AuditReportStatus.FINAL,
            },
        })
    }
    console.log('  ✓ 2 audits (2023 PUBLISHED with 5 findings + report, 2024 SCHEDULED)')

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 15 — Integration Configs
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 15: Integration Configs ──────────────────────────────────')

    await prisma.integrationConfig.upsert({
        where: { companyId_systemType: { companyId: palmStar.id, systemType: 'SAP' } },
        update: {},
        create: { companyId: palmStar.id, systemType: 'SAP', displayName: 'SAP ERP (Placeholder)', isActive: false, configJson: { endpointUrl: 'https://sap.palmstar.internal/api', authType: 'oauth2' } },
    })
    await prisma.integrationConfig.upsert({
        where: { companyId_systemType: { companyId: palmStar.id, systemType: 'WEIGHBRIDGE_GENERIC' } },
        update: {},
        create: { companyId: palmStar.id, systemType: 'WEIGHBRIDGE_GENERIC', displayName: 'Weighbridge System', isActive: false, configJson: { endpointUrl: 'http://192.168.1.50/weighbridge', authType: 'api_key' } },
    })
    console.log('  ✓ 2 integration configs (SAP, Weighbridge)')

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 16 — Notifications
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 16: Notifications ────────────────────────────────────────')

    const existingNotifs = await prisma.notification.count({ where: { userId: managerUser.id } })
    if (existingNotifs === 0) {
        await prisma.notification.createMany({
            data: [
                { userId: managerUser.id, message: 'Palm Star Mill has submitted its ISCC EU 2024 checklist for review.', read: false, createdAt: new Date('2025-01-20T08:30:00Z') },
                { userId: managerUser.id, message: 'Green Valley Mill has created a new draft checklist for ISCC EU 2024.', read: true, createdAt: new Date('2025-01-15T10:00:00Z') },
                { userId: managerUser.id, message: 'Mass balance discrepancy flagged on Palm Star Mill — PKE entry requires review.', read: false, createdAt: new Date('2025-02-01T09:15:00Z') },
                { userId: adminUser.id, message: 'Palm Star Mill 2023 audit report is ready for final approval.', read: true, createdAt: new Date('2024-02-27T16:00:00Z') },
                { userId: psManagerUser.id, message: 'Your ISCC EU 2024 checklist submission has been received and is under review.', read: true, createdAt: new Date('2025-01-22T11:00:00Z') },
                { userId: psManagerUser.id, message: 'Checklist items ENV-01-001 and ENV-01-002 have been reviewed and approved by the aggregator.', read: false, createdAt: new Date('2025-01-23T15:30:00Z') },
                { userId: psStaffUser.id, message: 'ENV-02-001 (Scheduled Waste Disposal Records) is still in progress — please complete by 1 Feb 2025.', read: false, createdAt: new Date('2025-01-25T09:00:00Z') },
                { userId: auditorUser.id, message: 'New audit assignment: Palm Star Mill ISCC EU 2024 Recertification — scheduled 15 Mar 2025.', read: false, createdAt: new Date('2025-02-10T14:00:00Z') },
                { userId: auditorUser.id, message: 'Your 2023 Palm Star Mill audit report has been reviewed and approved.', read: true, createdAt: new Date('2024-02-27T17:00:00Z') },
                { userId: gvManagerUser.id, message: 'Welcome to GreenTrace! Your ISCC EU 2024 checklist has been created. Please begin completing your compliance items.', read: false, createdAt: new Date('2025-01-15T10:05:00Z') },
            ],
        })
    }
    console.log('  ✓ 10 notifications across all users')

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 17 — Activity Log
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Step 17: Activity Log ─────────────────────────────────────────')

    const existingLogs = await prisma.activityLog.count()
    if (existingLogs === 0) {
        await prisma.activityLog.createMany({
            data: [
                { actorId: psManagerUser.id, action: 'CHECKLIST_SUBMITTED', entityType: 'Checklist', entityId: ps2024Checklist.id, reason: 'All required items completed for the 2024 reporting period.', metadata: { fromStatus: 'DRAFT', toStatus: 'SUBMITTED' }, createdAt: new Date('2025-01-20T08:00:00Z') },
                { actorId: managerUser.id, action: 'REVIEW_STARTED', entityType: 'Checklist', entityId: ps2024Checklist.id, reason: 'Beginning aggregator review of Palm Star Mill 2024 ISCC EU checklist.', metadata: { fromStatus: 'SUBMITTED', toStatus: 'UNDER_REVIEW' }, createdAt: new Date('2025-01-22T09:30:00Z') },
                { actorId: adminUser.id, action: 'CHECKLIST_LOCKED', entityType: 'Checklist', entityId: ps2023Checklist.id, reason: 'Audit completed and certification confirmed. Locking period.', metadata: { fromStatus: 'CERTIFIED', toStatus: 'LOCKED' }, createdAt: new Date('2024-02-28T12:00:00Z') },
                { actorId: auditorUser.id, action: 'AUDIT_PUBLISHED', entityType: 'Audit', entityId: audit2023.id, reason: 'Surveillance audit complete. Minor NC corrective action verified.', metadata: { auditType: 'SURVEILLANCE', outcome: 'CERTIFIED' }, createdAt: new Date('2024-02-28T11:00:00Z') },
            ],
        })
    }
    console.log('  ✓ 4 activity log entries')

    // ═══════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n══════════════════════════════════════════════════════════════════')
    console.log('  Seed complete!')
    console.log('')
    console.log('  Demo users (all passwords as shown):')
    console.log('  ┌──────────────────────────────────────┬─────────────┬────────────────────┐')
    console.log('  │ Email                                 │ Password    │ Role               │')
    console.log('  ├──────────────────────────────────────┼─────────────┼────────────────────┤')
    console.log('  │ admin@greentrace.local                │ admin123    │ SUPER_ADMIN        │')
    console.log('  │ manager@greentrace.local              │ manager123  │ AGGREGATOR_MANAGER │')
    console.log('  │ ps.manager@greentrace.local           │ manager123  │ COMPANY_MANAGER    │')
    console.log('  │ ps.staff@greentrace.local             │ staff123    │ COMPANY_STAFF      │')
    console.log('  │ gv.manager@greentrace.local           │ manager123  │ COMPANY_MANAGER    │')
    console.log('  │ auditor@greentrace.local              │ auditor123  │ AUDITOR            │')
    console.log('  └──────────────────────────────────────┴─────────────┴────────────────────┘')
    console.log('══════════════════════════════════════════════════════════════════\n')
}

main()
    .catch((e) => { console.error(e); process.exit(1) })
    .finally(async () => { await prisma.$disconnect() })
