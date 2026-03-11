import { prisma } from './prisma'
import { Prisma, ImportFileType, ImportStatus, MaterialType } from '@prisma/client'


// ─── Column Mappings ────────────────────────────────────────────────────────

export async function getColumnMappings(millId: string) {
    return prisma.importColumnMapping.findMany({
        where: { millId },
        orderBy: { lastUsedAt: 'desc' },
    })
}

export async function saveColumnMapping(
    millId: string,
    templateName: string,
    mappingJson: Record<string, string>
) {
    return prisma.importColumnMapping.upsert({
        where: { millId_templateName: { millId, templateName } },
        update: { mappingJson, lastUsedAt: new Date() },
        create: { millId, templateName, mappingJson },
    })
}

// ─── Jobs CRUD ────────────────────────────────────────────────────────

export async function getImportJobs(millId: string) {
    return prisma.importJob.findMany({
        where: { millId },
        orderBy: { createdAt: 'desc' },
    })
}

export async function getImportJobById(id: string) {
    return prisma.importJob.findUnique({
        where: { id },
    })
}

export async function createImportJob(data: {
    millId: string
    uploadedById: string
    fileName: string
    fileType: ImportFileType
    filePath: string
}) {
    return prisma.importJob.create({
        data: { ...data, status: ImportStatus.PENDING },
    })
}

// ─── Mock Processor ────────────────────────────────────────────────────────
// In a real app, this would be a background worker processing the file from Supabase.
// For this prototype, we'll expose a function that the API route can await directly.

export async function processImportJob(
    jobId: string,
    mappingJson: Record<string, string>,
    testDataRows: any[] // We pass mock parsed CSV rows from the API for the prototype
) {
    // Update to PROCESSING
    await prisma.importJob.update({
        where: { id: jobId },
        data: { status: ImportStatus.PROCESSING, appliedMappingJson: mappingJson, rowCountTotal: testDataRows.length },
    })

    let countImported = 0
    let countFailed = 0
    const errors: any[] = []

    const mill = await prisma.importJob.findUnique({ where: { id: jobId } }).mill()

    for (let i = 0; i < testDataRows.length; i++) {
        const rawRow = testDataRows[i]
        try {
            // Very basic mock mapping application
            const mapped: any = {}
            for (const [sourceCol, gtField] of Object.entries(mappingJson)) {
                mapped[gtField] = rawRow[sourceCol]
            }

            // Upsert shipment to handle deduplication logic
            await prisma.shipmentRecord.upsert({
                where: {
                    millId_referenceNumber_shipmentDate: {
                        millId: mill!.id,
                        referenceNumber: mapped.referenceNumber,
                        shipmentDate: new Date(mapped.shipmentDate),
                    },
                },
                update: {}, // Don't overwrite if it exists
                create: {
                    millId: mill!.id,
                    direction: mapped.direction,
                    materialType: mapped.materialType,
                    volumeMt: new Prisma.Decimal(mapped.volumeMt),
                    certificationStatus: mapped.certificationStatus,
                    counterpartyName: mapped.counterpartyName,
                    referenceNumber: mapped.referenceNumber,
                    shipmentDate: new Date(mapped.shipmentDate),
                    source: 'CSV_IMPORT',
                    importJobId: jobId,
                },
            })
            countImported++
        } catch (err: any) {
            countFailed++
            errors.push({ row: i + 1, error: err.message })
        }
    }

    // Finalize
    const finalized = await prisma.importJob.update({
        where: { id: jobId },
        data: {
            status: countFailed === testDataRows.length ? ImportStatus.FAILED : (countFailed > 0 ? ImportStatus.PARTIAL_SUCCESS : ImportStatus.COMPLETED),
            rowCountImported: countImported,
            rowCountFailed: countFailed,
            errorLog: errors,
            completedAt: new Date(),
        },
    })

    // REC-1: Trigger reconciliation check
    await runReconciliationCheck(mill!.id)

    return finalized
}

// ─── REC-1 ────────────────────────────────────────────────────────
// Compares newly imported shipments against DataEntry totals.

export async function runReconciliationCheck(millId: string) {
    // 1. Group ShipmentRecord volumes by (materialType, month).
    // 2. Fetch DataEntries matching that scope.
    // 3. For any where ABS((ShipmentSum - DataEntrySum) / MAX(ShipmentsSum, DataEntrySum)) > 0.02
    // 4. Update those DataEntry records: reconciliationFlag = true, reconciliationAcknowledgedAt = null

    // In this prototype, we'll do a simple mock implementation that flags random entries
    // to demonstrate the UI workflow. A true implementation would execute a complex GROUP BY query.

    const entries = await prisma.dataEntry.findMany({
        where: {
            checklistItem: { checklist: { millId } },
            reconciliationFlag: false,
        },
        take: 1, // Just flag one for the prototype demo
    })

    if (entries.length > 0) {
        await prisma.dataEntry.update({
            where: { id: entries[0].id },
            data: { reconciliationFlag: true, reconciliationAcknowledgedAt: null },
        })
    }
}
