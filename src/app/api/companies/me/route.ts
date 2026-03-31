import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { UserRole } from '@prisma/client'

const COMPANY_SELECT = {
    id: true, name: true, code: true, location: true,
    country: true, latitude: true, longitude: true, isActive: true,
} as const

export async function GET(_request: Request) {
    const user = await getSessionUser()
    if (!user) return new NextResponse('Unauthorized', { status: 401 })
    if (!user.companyId) return NextResponse.json(
        { data: null, error: { code: 'NO_COMPANY', message: 'User is not associated with a company' } },
        { status: 400 }
    )

    const company = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: COMPANY_SELECT,
    })
    if (!company) return new NextResponse('Not Found', { status: 404 })

    return NextResponse.json({ data: company, error: null, meta: null })
}

export async function PATCH(request: Request) {
    const user = await getSessionUser()
    if (!user) return new NextResponse('Unauthorized', { status: 401 })
    if (!user.companyId) return NextResponse.json(
        { data: null, error: { code: 'NO_COMPANY', message: 'User is not associated with a company' } },
        { status: 400 }
    )

    const editableRoles: UserRole[] = [UserRole.COMPANY_MANAGER, UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER]
    if (!editableRoles.includes(user.role)) return new NextResponse('Forbidden', { status: 403 })

    const { name, location, country } = await request.json()

    const company = await prisma.company.update({
        where: { id: user.companyId },
        data: {
            ...(name     ? { name }     : {}),
            ...(location ? { location } : {}),
            ...(country  ? { country }  : {}),
        },
        select: COMPANY_SELECT,
    })

    return NextResponse.json({ data: company, error: null, meta: null })
}
