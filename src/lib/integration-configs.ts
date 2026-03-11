import { prisma } from './prisma'
import { IntegrationSystemType } from '@prisma/client'

export type ConfigPayload = {
    systemType: IntegrationSystemType
    displayName: string
    endpointUrl?: string
    authType?: string
    authKey?: string
    syncFrequency?: string
}

export async function getConfigsForMill(millId: string) {
    const records = await prisma.integrationConfig.findMany({
        where: { millId },
        orderBy: { systemType: 'asc' }
    })

    // Unpack configJson
    return records.map(r => {
        const configJson = r.configJson as Record<string, any> || {}
        return {
            id: r.id,
            systemType: r.systemType,
            displayName: r.displayName,
            isActive: r.isActive,
            endpointUrl: configJson.endpointUrl || null,
            authType: configJson.authType || null,
            authKey: configJson.authKey || null,
            syncFrequency: configJson.syncFrequency || null
        }
    })
}

export async function upsertConfig(millId: string, payload: ConfigPayload) {
    const configData = {
        endpointUrl: payload.endpointUrl,
        authType: payload.authType,
        authKey: payload.authKey,
        syncFrequency: payload.syncFrequency
    }

    const existing = await prisma.integrationConfig.findFirst({
        where: {
            millId,
            systemType: payload.systemType
        }
    })

    if (existing) {
        return prisma.integrationConfig.update({
            where: { id: existing.id },
            data: {
                displayName: payload.displayName,
                configJson: configData,
                isActive: false
            }
        })
    }

    return prisma.integrationConfig.create({
        data: {
            millId,
            systemType: payload.systemType,
            displayName: payload.displayName,
            configJson: configData,
            isActive: false
        }
    })
}

export async function deleteConfig(id: string) {
    return prisma.integrationConfig.delete({
        where: { id }
    })
}
