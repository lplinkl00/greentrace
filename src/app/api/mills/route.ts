import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function GET(request: Request) {
    const user = await getSessionUser()
    if (!user || user.role === UserRole.MILL_STAFF) return new NextResponse('Unauthorized', { status: 403 })

    const { searchParams } = new URL(request.url)
    const isActiveMatch = searchParams.get('isActive') === 'true'

    const mills = await prisma.mill.findMany({
        where: { isActive: isActiveMatch || undefined }
    })

    return NextResponse.json({ data: mills, error: null, meta: null })
}

export async function POST(request: Request) {
    const user = await getSessionUser()
    if (!user || user.role !== UserRole.SUPER_ADMIN) return new NextResponse('Unauthorized', { status: 403 })

    const { name, code, location, country, latitude, longitude } = await request.json()
    const organisation = await prisma.organisation.findFirst()

    if (!organisation) {
        return NextResponse.json({ data: null, error: { code: 'ORG_NOT_FOUND', message: 'No org found' }, meta: null }, { status: 500 })
    }

    const mill = await prisma.mill.create({
        data: {
            name, code, location, country, latitude, longitude,
            organisationId: organisation.id
        }
    })

    return NextResponse.json({ data: mill, error: null, meta: null })
}
