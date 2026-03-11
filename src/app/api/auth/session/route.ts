import { NextResponse } from 'next/server'
import { getSessionUser, withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function GET() {
    const user = await getSessionUser()
    if (!user) {
        return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'No active session' }, meta: null }, { status: 401 })
    }
    return NextResponse.json({ data: user, error: null, meta: null })
}
