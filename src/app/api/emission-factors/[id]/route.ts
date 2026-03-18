import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getEmissionFactorById, updateEmissionFactor } from '@/lib/emission-factors'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AUDITOR], async (
    _request: Request,
    { params }: { params: { id: string } }
, user) => {

    const factor = await getEmissionFactorById(params.id)
    if (!factor) {
        return NextResponse.json(
            { data: null, error: { code: 'NOT_FOUND', message: 'Emission factor not found' }, meta: null },
            { status: 404 }
        )
    }

    return NextResponse.json({ data: factor, error: null, meta: null })
})

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const user = await getSessionUser()
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const updated = await updateEmissionFactor(params.id, {
        ...body,
        validTo: body.validTo !== undefined ? (body.validTo ? new Date(body.validTo) : null) : undefined,
    })
    return NextResponse.json({ data: updated, error: null, meta: null })
}
