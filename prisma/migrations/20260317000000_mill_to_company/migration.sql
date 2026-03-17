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
