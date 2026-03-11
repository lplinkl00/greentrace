import { prisma } from './prisma'
import { LinkedEntityType } from '@prisma/client'

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
]

// ─── Validation ────────────────────────────────────────────

export function validateFile(fileType: string, fileSize: number) {
    if (!ALLOWED_MIME_TYPES.includes(fileType)) {
        throw new Error('UNSUPPORTED_FILE_TYPE')
    }
    if (fileSize > MAX_FILE_SIZE) {
        throw new Error('FILE_TOO_LARGE')
    }
}

// ─── Document CRUD ────────────────────────────────────────────

export async function getDocuments(filters: {
    checklistItemId?: string
    massBalanceEntryId?: string
    auditFindingId?: string
    shipmentId?: string
}) {
    const where: any = { isDeleted: false }
    if (filters.checklistItemId) {
        where.checklistItemId = filters.checklistItemId
        where.linkedEntityType = LinkedEntityType.CHECKLIST_ITEM
    }
    if (filters.massBalanceEntryId) {
        where.massBalanceEntryId = filters.massBalanceEntryId
        where.linkedEntityType = LinkedEntityType.MASS_BALANCE_ENTRY
    }
    if (filters.auditFindingId) {
        where.auditFindingId = filters.auditFindingId
        where.linkedEntityType = LinkedEntityType.AUDIT_FINDING
    }
    if (filters.shipmentId) {
        where.shipmentId = filters.shipmentId
        where.linkedEntityType = LinkedEntityType.SHIPMENT
    }

    return prisma.document.findMany({
        where,
        include: { uploadedBy: { select: { id: true, name: true } } },
        orderBy: { uploadedAt: 'desc' },
    })
}

export async function getDocumentById(id: string) {
    return prisma.document.findUnique({
        where: { id },
        include: { uploadedBy: { select: { id: true, name: true } } },
    })
}

export async function createDocument(data: {
    displayName: string
    filePath: string
    fileType: string
    fileSize: number
    uploadedById: string
    linkedEntityType: LinkedEntityType
    checklistItemId?: string
    massBalanceEntryId?: string
    auditFindingId?: string
    shipmentId?: string
}) {
    validateFile(data.fileType, data.fileSize)

    return prisma.document.create({ data })
}

export async function softDeleteDocument(id: string, deletedById: string) {
    return prisma.document.update({
        where: { id },
        data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedById,
        },
    })
}
