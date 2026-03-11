import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function GET(request: Request) {
    const user = await getSessionUser()
    if (!user || user.role === UserRole.MILL_STAFF) return new NextResponse('Unauthorized', { status: 403 })

    const { searchParams } = new URL(request.url)
    const millId = searchParams.get('millId') || undefined
    const role = searchParams.get('role') as UserRole || undefined

    const usersQuery = await prisma.user.findMany({
        where: {
            millId: user.role === UserRole.MILL_MANAGER ? user.millId! : millId,
            role
        }
    })

    return NextResponse.json({ data: usersQuery, error: null, meta: null })
}

export async function POST(request: Request) {
    const user = await getSessionUser()
    if (!user || user.role === UserRole.MILL_STAFF) return new NextResponse('Unauthorized', { status: 403 })

    const body = await request.json()
    const { email, name, role, millId } = body

    if (user.role === UserRole.MILL_MANAGER && role !== UserRole.MILL_STAFF) return new NextResponse('Forbidden', { status: 403 })

    const newUser = await prisma.user.create({
        data: {
            email,
            name,
            role,
            millId: user.role === UserRole.MILL_MANAGER ? user.millId! : millId,
            supabaseUserId: crypto.randomUUID(), // Mocked mapping
        }
    })

    return NextResponse.json({ data: newUser, error: null, meta: null })
}
