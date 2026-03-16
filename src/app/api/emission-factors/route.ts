import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getEmissionFactors, createEmissionFactor } from '@/lib/emission-factors'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async (request: Request, _context: any, user) => {

    const { searchParams } = new URL(request.url)
    const materialType = searchParams.get('materialType') as any || undefined
    const scope = searchParams.get('scope') as any || undefined
    const includeExpired = searchParams.get('includeExpired') === 'true'

    const factors = await getEmissionFactors({ materialType, scope, includeExpired })
    return NextResponse.json({ data: factors, error: null, meta: null })
})

export async function POST(request: Request) {
    const user = await getSessionUser()
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const factor = await createEmissionFactor({
        ...body,
        validFrom: new Date(body.validFrom),
        validTo: body.validTo ? new Date(body.validTo) : null,
    })
    return NextResponse.json({ data: factor, error: null, meta: null }, { status: 201 })
}
