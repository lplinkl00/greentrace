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

export async function getConfigsForCompany(companyId: string) {
    const records = await prisma.integrationConfig.findMany({
        where: { companyId },
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

export async function upsertConfig(companyId: string, payload: ConfigPayload) {
    const configData = {
        endpointUrl: payload.endpointUrl,
        authType: payload.authType,
        authKey: payload.authKey,
        syncFrequency: payload.syncFrequency
    }

    const existing = await prisma.integrationConfig.findFirst({
        where: {
            companyId,
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
            companyId,
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
