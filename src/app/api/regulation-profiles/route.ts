import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole, RegulationCode } from '@prisma/client'
import { getProfiles, createProfile } from '@/lib/regulation-profiles'

export const GET = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AUDITOR], async (request: Request, _context: any, user) => {

    const { searchParams } = new URL(request.url)
    const regulation = searchParams.get('regulation') as RegulationCode | null

    const profiles = await getProfiles(regulation || undefined)
    return NextResponse.json({ data: profiles, error: null, meta: null })
})

export async function POST(request: Request) {
    const user = await getSessionUser()
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const { regulation, version, name, description } = body

    if (!regulation || !version || !name) {
        return NextResponse.json(
            { data: null, error: { code: 'VALIDATION_ERROR', message: 'regulation, version, and name are required' }, meta: null },
            { status: 422 }
        )
    }

    const profile = await createProfile({ regulation, version, name, description })
    return NextResponse.json({ data: profile, error: null, meta: null }, { status: 201 })
}
