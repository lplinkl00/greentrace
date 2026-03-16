import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getShipmentById, updateShipment, deleteShipment } from '@/lib/shipments'

export const GET = withAuth(
    [UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AUDITOR],
    async (request: Request, context: any) => {
        const { id } = context.params
        const shipment = await getShipmentById(id)

        if (!shipment) {
            return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
        }

        return NextResponse.json({ data: shipment })
    }
)

export const PATCH = withAuth(
    [UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.SUPER_ADMIN],
    async (request: Request, context: any) => {
        const { id } = context.params
        const body = await request.json()

        // Enforce updating only MANUAL shipments
        const existing = await getShipmentById(id)
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (existing.source !== 'MANUAL') {
            return NextResponse.json({ error: 'Cannot update imported shipments directly' }, { status: 403 })
        }

        const updated = await updateShipment(id, body)
        return NextResponse.json({ data: updated })
    }
)

export const DELETE = withAuth(
    [UserRole.COMPANY_MANAGER, UserRole.SUPER_ADMIN],
    async (request: Request, context: any) => {
        const { id } = context.params

        const existing = await getShipmentById(id)
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (existing.source !== 'MANUAL') {
            return NextResponse.json({ error: 'Cannot delete imported shipments directly' }, { status: 403 })
        }

        await deleteShipment(id)
        return NextResponse.json({ data: 'Deleted' })
    }
)
