import { prisma } from './prisma'

export type CreateNotificationParams = {
    userId: string
    message: string
}

export async function createNotification(params: CreateNotificationParams) {
    const notification = await prisma.notification.create({
        data: {
            userId: params.userId,
            message: params.message,
            read: false,
        },
    })

    // Stub email integration as per PLAN Q8
    console.log(`[EMAIL STUB] Dispatching email to user ${params.userId}: ${params.message}`)

    return notification
}

export async function getUnreadNotificationsCount(userId: string) {
    return await prisma.notification.count({
        where: {
            userId,
            read: false,
        },
    })
}

export async function getUserNotifications(userId: string) {
    return await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
    })
}

export async function markNotificationRead(id: string, userId: string) {
    return await prisma.notification.update({
        where: { id, userId },
        data: { read: true },
    })
}

export async function markAllNotificationsRead(userId: string) {
    return await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
    })
}
