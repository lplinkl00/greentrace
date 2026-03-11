import { prisma } from './prisma'
import { ChecklistItemStatus, DueDateStatus } from '@prisma/client'

// ─── Due Date Status Computation ────────────────────────────────────────────

export function computeDueDateStatus(dueDate: Date | null): DueDateStatus {
    if (!dueDate) return DueDateStatus.NO_DATE

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)

    const diffMs = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return DueDateStatus.OVERDUE
    if (diffDays <= 7) return DueDateStatus.DUE_SOON
    return DueDateStatus.ON_TRACK
}

// ─── Checklist Items ────────────────────────────────────────────────────

export async function getChecklistItems(checklistId: string) {
    const items = await prisma.checklistItem.findMany({
        where: { checklistId },
        include: {
            requirement: {
                include: {
                    category: { include: { pillar: true } },
                },
            },
            assignee: { select: { id: true, name: true, email: true } },
            _count: { select: { dataEntries: true, documents: true, comments: true } },
        },
        orderBy: [
            { requirement: { category: { pillar: { displayOrder: 'asc' } } } },
            { requirement: { category: { displayOrder: 'asc' } } },
            { requirement: { displayOrder: 'asc' } },
        ],
    })

    // Recompute dueDateStatus live
    return items.map((item) => ({
        ...item,
        dueDateStatus: computeDueDateStatus(item.dueDate),
    }))
}

export async function getChecklistItemById(id: string) {
    const item = await prisma.checklistItem.findUnique({
        where: { id },
        include: {
            requirement: {
                include: { category: { include: { pillar: true } } },
            },
            assignee: { select: { id: true, name: true, email: true } },
            comments: {
                include: { author: { select: { id: true, name: true, role: true } } },
                orderBy: { createdAt: 'asc' },
            },
            dataEntries: {
                include: { emissionFactor: true },
                orderBy: { createdAt: 'desc' },
            },
            documents: {
                where: { isDeleted: false },
                orderBy: { uploadedAt: 'desc' },
            },
            checklist: true,
        },
    })

    if (!item) return null

    return {
        ...item,
        dueDateStatus: computeDueDateStatus(item.dueDate),
    }
}

export async function updateChecklistItem(
    id: string,
    data: Partial<{
        status: ChecklistItemStatus
        assigneeId: string | null
        dueDate: Date | null
        aggregatorReviewed: boolean
        aggregatorReviewerId: string
    }>
) {
    const updateData: any = { ...data }

    // Recompute dueDateStatus if dueDate is being set
    if ('dueDate' in data) {
        updateData.dueDateStatus = computeDueDateStatus(data.dueDate ?? null)
    }

    // If marking complete, stamp completedAt
    if (data.status === ChecklistItemStatus.COMPLETE) {
        updateData.completedAt = new Date()
    }

    // If aggregator reviewed, stamp the time
    if (data.aggregatorReviewed === true) {
        updateData.aggregatorReviewedAt = new Date()
    }

    return prisma.checklistItem.update({ where: { id }, data: updateData })
}

export async function addComment(
    checklistItemId: string,
    authorId: string,
    roleAtTimeOfComment: string,
    body: string
) {
    return prisma.checklistItemComment.create({
        data: {
            checklistItemId,
            authorId,
            roleAtTimeOfComment: roleAtTimeOfComment as any,
            body,
        },
    })
}
