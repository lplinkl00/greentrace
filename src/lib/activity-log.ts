import { prisma } from './prisma'

export async function logActivity({
    actorId,
    action,
    entityType,
    entityId,
    reason,
    metadata
}: {
    actorId: string
    action: string
    entityType: string
    entityId: string
    reason: string
    metadata?: Record<string, any>
}) {
    return prisma.activityLog.create({
        data: {
            actorId,
            action,
            entityType,
            entityId,
            reason,
            metadata: metadata ?? undefined,
        }
    })
}
