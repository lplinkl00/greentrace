-- CreateEnum
CREATE TYPE "ProductionSource" AS ENUM ('MANUAL', 'CSV_IMPORT');

-- CreateTable
CREATE TABLE "ProductionRecord" (
    "id" TEXT NOT NULL,
    "millId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "productionDate" DATE NOT NULL,
    "ffbReceivedMt" DECIMAL(18,4) NOT NULL,
    "cpoProducedMt" DECIMAL(18,4) NOT NULL,
    "pkoProducedMt" DECIMAL(18,4) NOT NULL,
    "notes" TEXT,
    "source" "ProductionSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionRecord_millId_productionDate_idx" ON "ProductionRecord"("millId", "productionDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRecord_millId_productionDate_key" ON "ProductionRecord"("millId", "productionDate");

-- AddForeignKey
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_millId_fkey" FOREIGN KEY ("millId") REFERENCES "Mill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
