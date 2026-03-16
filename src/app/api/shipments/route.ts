import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getShipments, createShipment } from '@/lib/shipments'
import { MaterialType, ShipmentDirection, CertificationStatus } from '@prisma/client'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AUDITOR], async (request: Request, _context: any, user) => {

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    if (!companyId) {
        return NextResponse.json(
            { data: null, error: { code: 'VALIDATION_ERROR', message: 'companyId is required' }, meta: null },
            { status: 422 }
        )
    }

    const year = searchParams.get('year') || undefined
    const month = searchParams.get('month') || undefined
    const materialType = searchParams.get('materialType') as MaterialType | undefined
    const direction = searchParams.get('direction') as ShipmentDirection | undefined

    const shipments = await getShipments({ companyId, year, month, materialType, direction })
    return NextResponse.json({ data: shipments, error: null, meta: null })
})

export const POST = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AUDITOR], async (request: Request, _context: any, user) => {

    const body = await request.json()

    const shipment = await createShipment({
        ...body,
        volumeMt: Number(body.volumeMt),
        ghgValueKgco2e: body.ghgValueKgco2e ? Number(body.ghgValueKgco2e) : undefined,
        shipmentDate: new Date(body.shipmentDate),
    })

    return NextResponse.json({ data: shipment, error: null, meta: null }, { status: 201 })
})
