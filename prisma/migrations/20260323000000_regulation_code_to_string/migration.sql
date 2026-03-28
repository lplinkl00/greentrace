-- Convert RegulationCode enum columns to TEXT so any regulation type can be used

ALTER TABLE "RegulationProfile" ALTER COLUMN "regulation" TYPE TEXT;
ALTER TABLE "Checklist" ALTER COLUMN "regulation" TYPE TEXT;
ALTER TABLE "MassBalanceEntry" ALTER COLUMN "regulation" TYPE TEXT;
ALTER TABLE "Audit" ALTER COLUMN "regulation" TYPE TEXT;

DROP TYPE IF EXISTS "RegulationCode";
