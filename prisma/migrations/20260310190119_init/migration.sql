-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'AGGREGATOR_MANAGER', 'MILL_MANAGER', 'MILL_STAFF', 'AUDITOR');

-- CreateEnum
CREATE TYPE "RegulationCode" AS ENUM ('ISCC_EU', 'ISCC_PLUS', 'RSPO_PC', 'RSPO_SCCS');

-- CreateEnum
CREATE TYPE "RequirementDataType" AS ENUM ('ABSOLUTE_QUANTITY', 'RATE', 'DOCUMENT_ONLY', 'TEXT_RESPONSE');

-- CreateEnum
CREATE TYPE "RequirementCriticality" AS ENUM ('CRITICAL', 'NON_CRITICAL');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'UNDER_AUDIT', 'CERTIFIED', 'LOCKED');

-- CreateEnum
CREATE TYPE "ChecklistItemStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "DataEntryType" AS ENUM ('FORM01_ABSOLUTE', 'FORM02_RATE', 'DOCUMENT_ONLY', 'TEXT');

-- CreateEnum
CREATE TYPE "GHGScope" AS ENUM ('SCOPE1', 'SCOPE2', 'SCOPE3', 'NA');

-- CreateEnum
CREATE TYPE "AuditType" AS ENUM ('INITIAL', 'SURVEILLANCE', 'RECERTIFICATION');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'FINDINGS_REVIEW', 'PUBLISHED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "FindingType" AS ENUM ('CONFORMANT', 'NON_CONFORMANT_MAJOR', 'NON_CONFORMANT_MINOR', 'OBSERVATION', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'CLOSED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "AuditReportStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'NEEDS_MAPPING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportFileType" AS ENUM ('CSV', 'XLSX');

-- CreateEnum
CREATE TYPE "ShipmentDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('CERTIFIED', 'NON_CERTIFIED');

-- CreateEnum
CREATE TYPE "ShipmentSource" AS ENUM ('MANUAL', 'CSV_IMPORT', 'API');

-- CreateEnum
CREATE TYPE "LinkedEntityType" AS ENUM ('CHECKLIST_ITEM', 'AUDIT_FINDING', 'MASS_BALANCE_ENTRY', 'SHIPMENT');

-- CreateEnum
CREATE TYPE "IntegrationSystemType" AS ENUM ('SAP', 'WEIGHBRIDGE_GENERIC', 'ERP_GENERIC', 'CUSTOM_API');

-- CreateEnum
CREATE TYPE "DueDateStatus" AS ENUM ('OVERDUE', 'DUE_SOON', 'ON_TRACK', 'NO_DATE');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('CRUDE_PALM_OIL', 'PALM_KERNEL_OIL', 'PALM_KERNEL_EXPELLER', 'PALM_FATTY_ACID_DISTILLATE', 'REFINED_BLEACHED_DEODORISED_OIL', 'NATURAL_GAS', 'GRID_ELECTRICITY', 'DIESEL', 'POME_METHANE', 'BIOMASS', 'OTHER');

-- CreateEnum
CREATE TYPE "LLMProvider" AS ENUM ('ANTHROPIC_CLAUDE', 'GOOGLE_GEMINI');

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mill" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isccEuCertStatus" TEXT,
    "isccEuCertExpiry" TIMESTAMP(3),
    "isccPlusCertStatus" TEXT,
    "isccPlusCertExpiry" TIMESTAMP(3),
    "rspoPcCertStatus" TEXT,
    "rspoPcCertExpiry" TIMESTAMP(3),
    "rspoSccsCertStatus" TEXT,
    "rspoSccsCertExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "supabaseUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organisationId" TEXT,
    "millId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulationProfile" (
    "id" TEXT NOT NULL,
    "regulation" "RegulationCode" NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegulationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementPillar" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementPillar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementCategory" (
    "id" TEXT NOT NULL,
    "pillarId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "guidanceText" TEXT,
    "dataType" "RequirementDataType" NOT NULL,
    "requiresForm" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "criticality" "RequirementCriticality" NOT NULL DEFAULT 'NON_CRITICAL',
    "ghgScope" "GHGScope",
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checklist" (
    "id" TEXT NOT NULL,
    "millId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "regulation" "RegulationCode" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "reviewStartedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" "ChecklistItemStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "dueDateStatus" "DueDateStatus" NOT NULL DEFAULT 'NO_DATE',
    "completedAt" TIMESTAMP(3),
    "aggregatorReviewed" BOOLEAN NOT NULL DEFAULT false,
    "aggregatorReviewedAt" TIMESTAMP(3),
    "aggregatorReviewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItemComment" (
    "id" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "roleAtTimeOfComment" "UserRole" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistItemComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataEntry" (
    "id" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "enteredById" TEXT NOT NULL,
    "entryType" "DataEntryType" NOT NULL,
    "valueRaw" DECIMAL(18,6),
    "unitInput" TEXT,
    "textValue" TEXT,
    "valueConverted" DECIMAL(18,6),
    "unitReference" TEXT,
    "emissionFactorId" TEXT,
    "reportingMonth" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,
    "reconciliationFlag" BOOLEAN NOT NULL DEFAULT false,
    "reconciliationAcknowledgedAt" TIMESTAMP(3),
    "reconciliationAcknowledgedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmissionFactor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "materialType" "MaterialType" NOT NULL,
    "scope" "GHGScope" NOT NULL,
    "unitInput" TEXT NOT NULL,
    "unitReference" TEXT NOT NULL,
    "factorValue" DECIMAL(18,8) NOT NULL,
    "source" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmissionFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MassBalanceEntry" (
    "id" TEXT NOT NULL,
    "millId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "regulation" "RegulationCode" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "materialType" "MaterialType" NOT NULL,
    "certifiedIn" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "nonCertifiedIn" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "certifiedOut" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "nonCertifiedOut" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "openingStock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "closingStock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "discrepancyFlag" BOOLEAN NOT NULL DEFAULT false,
    "discrepancyNotes" TEXT,
    "discrepancyOverriddenById" TEXT,
    "discrepancyOverriddenAt" TIMESTAMP(3),
    "openingStockConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "openingStockConfirmedAt" TIMESTAMP(3),
    "openingStockConfirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MassBalanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedEntityType" "LinkedEntityType" NOT NULL,
    "checklistItemId" TEXT,
    "massBalanceEntryId" TEXT,
    "auditFindingId" TEXT,
    "shipmentId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentRecord" (
    "id" TEXT NOT NULL,
    "millId" TEXT NOT NULL,
    "direction" "ShipmentDirection" NOT NULL,
    "materialType" "MaterialType" NOT NULL,
    "volumeMt" DECIMAL(18,4) NOT NULL,
    "certificationStatus" "CertificationStatus" NOT NULL,
    "counterpartyName" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "shipmentDate" TIMESTAMP(3) NOT NULL,
    "sustainabilityDeclarationNumber" TEXT,
    "ghgValueKgco2e" DECIMAL(18,4),
    "source" "ShipmentSource" NOT NULL DEFAULT 'MANUAL',
    "importJobId" TEXT,
    "isccAllocationPct" DECIMAL(5,2),
    "rspoAllocationPct" DECIMAL(5,2),
    "allocationConfirmedAt" TIMESTAMP(3),
    "allocationConfirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "millId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "regulation" "RegulationCode" NOT NULL,
    "auditType" "AuditType" NOT NULL,
    "auditorId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "AuditStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledDate" TIMESTAMP(3),
    "conductedDate" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "latestReportId" TEXT,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditFinding" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "findingType" "FindingType" NOT NULL,
    "evidenceReviewed" TEXT NOT NULL,
    "correctiveActionRequired" TEXT,
    "correctiveActionDeadline" TIMESTAMP(3),
    "findingStatus" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditReport" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contentJson" JSONB NOT NULL,
    "generatedBy" "LLMProvider" NOT NULL,
    "llmModel" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "status" "AuditReportStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "millId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" "ImportFileType" NOT NULL,
    "filePath" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "rowCountTotal" INTEGER NOT NULL DEFAULT 0,
    "rowCountImported" INTEGER NOT NULL DEFAULT 0,
    "rowCountFailed" INTEGER NOT NULL DEFAULT 0,
    "errorLog" JSONB,
    "appliedMappingJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportColumnMapping" (
    "id" TEXT NOT NULL,
    "millId" TEXT NOT NULL,
    "importJobId" TEXT,
    "templateName" TEXT NOT NULL,
    "mappingJson" JSONB NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportColumnMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConfig" (
    "id" TEXT NOT NULL,
    "millId" TEXT NOT NULL,
    "systemType" "IntegrationSystemType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "configJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_slug_key" ON "Organisation"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Mill_code_key" ON "Mill"("code");

-- CreateIndex
CREATE INDEX "Mill_organisationId_idx" ON "Mill"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseUserId_key" ON "User"("supabaseUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_supabaseUserId_idx" ON "User"("supabaseUserId");

-- CreateIndex
CREATE INDEX "User_millId_idx" ON "User"("millId");

-- CreateIndex
CREATE INDEX "User_organisationId_idx" ON "User"("organisationId");

-- CreateIndex
CREATE INDEX "RegulationProfile_regulation_isActive_idx" ON "RegulationProfile"("regulation", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RegulationProfile_regulation_version_key" ON "RegulationProfile"("regulation", "version");

-- CreateIndex
CREATE INDEX "RequirementPillar_profileId_idx" ON "RequirementPillar"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementPillar_profileId_code_key" ON "RequirementPillar"("profileId", "code");

-- CreateIndex
CREATE INDEX "RequirementCategory_pillarId_idx" ON "RequirementCategory"("pillarId");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementCategory_pillarId_code_key" ON "RequirementCategory"("pillarId", "code");

-- CreateIndex
CREATE INDEX "Requirement_categoryId_isActive_idx" ON "Requirement"("categoryId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Requirement_categoryId_code_key" ON "Requirement"("categoryId", "code");

-- CreateIndex
CREATE INDEX "Checklist_millId_regulation_status_idx" ON "Checklist"("millId", "regulation", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Checklist_millId_profileId_periodStart_periodEnd_key" ON "Checklist"("millId", "profileId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "ChecklistItem_checklistId_status_idx" ON "ChecklistItem"("checklistId", "status");

-- CreateIndex
CREATE INDEX "ChecklistItem_assigneeId_idx" ON "ChecklistItem"("assigneeId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItem_checklistId_requirementId_key" ON "ChecklistItem"("checklistId", "requirementId");

-- CreateIndex
CREATE INDEX "ChecklistItemComment_checklistItemId_createdAt_idx" ON "ChecklistItemComment"("checklistItemId", "createdAt");

-- CreateIndex
CREATE INDEX "DataEntry_checklistItemId_idx" ON "DataEntry"("checklistItemId");

-- CreateIndex
CREATE INDEX "DataEntry_emissionFactorId_idx" ON "DataEntry"("emissionFactorId");

-- CreateIndex
CREATE INDEX "EmissionFactor_materialType_isDefault_idx" ON "EmissionFactor"("materialType", "isDefault");

-- CreateIndex
CREATE INDEX "EmissionFactor_validFrom_validTo_idx" ON "EmissionFactor"("validFrom", "validTo");

-- CreateIndex
CREATE INDEX "MassBalanceEntry_millId_regulation_periodStart_idx" ON "MassBalanceEntry"("millId", "regulation", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "MassBalanceEntry_millId_checklistId_regulation_materialType_key" ON "MassBalanceEntry"("millId", "checklistId", "regulation", "materialType");

-- CreateIndex
CREATE INDEX "Document_checklistItemId_idx" ON "Document"("checklistItemId");

-- CreateIndex
CREATE INDEX "Document_auditFindingId_idx" ON "Document"("auditFindingId");

-- CreateIndex
CREATE INDEX "Document_massBalanceEntryId_idx" ON "Document"("massBalanceEntryId");

-- CreateIndex
CREATE INDEX "Document_shipmentId_idx" ON "Document"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentRecord_millId_shipmentDate_idx" ON "ShipmentRecord"("millId", "shipmentDate");

-- CreateIndex
CREATE INDEX "ShipmentRecord_importJobId_idx" ON "ShipmentRecord"("importJobId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentRecord_millId_referenceNumber_shipmentDate_key" ON "ShipmentRecord"("millId", "referenceNumber", "shipmentDate");

-- CreateIndex
CREATE UNIQUE INDEX "Audit_latestReportId_key" ON "Audit"("latestReportId");

-- CreateIndex
CREATE INDEX "Audit_millId_status_idx" ON "Audit"("millId", "status");

-- CreateIndex
CREATE INDEX "Audit_auditorId_idx" ON "Audit"("auditorId");

-- CreateIndex
CREATE INDEX "Audit_checklistId_idx" ON "Audit"("checklistId");

-- CreateIndex
CREATE INDEX "AuditFinding_auditId_findingStatus_idx" ON "AuditFinding"("auditId", "findingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "AuditFinding_auditId_checklistItemId_key" ON "AuditFinding"("auditId", "checklistItemId");

-- CreateIndex
CREATE INDEX "AuditReport_auditId_status_idx" ON "AuditReport"("auditId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AuditReport_auditId_version_key" ON "AuditReport"("auditId", "version");

-- CreateIndex
CREATE INDEX "ImportJob_millId_status_idx" ON "ImportJob"("millId", "status");

-- CreateIndex
CREATE INDEX "ImportColumnMapping_millId_idx" ON "ImportColumnMapping"("millId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportColumnMapping_millId_templateName_key" ON "ImportColumnMapping"("millId", "templateName");

-- CreateIndex
CREATE INDEX "IntegrationConfig_millId_idx" ON "IntegrationConfig"("millId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConfig_millId_systemType_key" ON "IntegrationConfig"("millId", "systemType");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_actorId_idx" ON "ActivityLog"("actorId");

-- AddForeignKey
ALTER TABLE "Mill" ADD CONSTRAINT "Mill_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_millId_fkey" FOREIGN KEY ("millId") REFERENCES "Mill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementPillar" ADD CONSTRAINT "RequirementPillar_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "RegulationProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementCategory" ADD CONSTRAINT "RequirementCategory_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "RequirementPillar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RequirementCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_millId_fkey" FOREIGN KEY ("millId") REFERENCES "Mill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "RegulationProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_aggregatorReviewerId_fkey" FOREIGN KEY ("aggregatorReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItemComment" ADD CONSTRAINT "ChecklistItemComment_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItemComment" ADD CONSTRAINT "ChecklistItemComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataEntry" ADD CONSTRAINT "DataEntry_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataEntry" ADD CONSTRAINT "DataEntry_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataEntry" ADD CONSTRAINT "DataEntry_emissionFactorId_fkey" FOREIGN KEY ("emissionFactorId") REFERENCES "EmissionFactor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MassBalanceEntry" ADD CONSTRAINT "MassBalanceEntry_millId_fkey" FOREIGN KEY ("millId") REFERENCES "Mill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MassBalanceEntry" ADD CONSTRAINT "MassBalanceEntry_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_massBalanceEntryId_fkey" FOREIGN KEY ("massBalanceEntryId") REFERENCES "MassBalanceEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_auditFindingId_fkey" FOREIGN KEY ("auditFindingId") REFERENCES "AuditFinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "ShipmentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentRecord" ADD CONSTRAINT "ShipmentRecord_millId_fkey" FOREIGN KEY ("millId") REFERENCES "Mill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentRecord" ADD CONSTRAINT "ShipmentRecord_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_millId_fkey" FOREIGN KEY ("millId") REFERENCES "Mill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditReport" ADD CONSTRAINT "AuditReport_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditReport" ADD CONSTRAINT "AuditReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_millId_fkey" FOREIGN KEY ("millId") REFERENCES "Mill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportColumnMapping" ADD CONSTRAINT "ImportColumnMapping_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConfig" ADD CONSTRAINT "IntegrationConfig_millId_fkey" FOREIGN KEY ("millId") REFERENCES "Mill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
