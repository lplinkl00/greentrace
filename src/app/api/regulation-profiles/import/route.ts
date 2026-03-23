import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { importProfile, RegulationProfileFixture } from '@/lib/regulation-profiles'

export const POST = withAuth(
    [UserRole.SUPER_ADMIN],
    async (request: Request, _context: any, _user: any) => {
        let body: any
        try {
            body = await request.json()
        } catch {
            return NextResponse.json(
                { data: null, error: { code: 'INVALID_JSON', message: 'Invalid JSON body.' }, meta: null },
                { status: 400 }
            )
        }

        const { regulation, version, name, pillars } = body

        if (!regulation || typeof regulation !== 'string' || !regulation.trim()) {
            return NextResponse.json(
                { data: null, error: { code: 'VALIDATION_ERROR', message: 'regulation is required.' }, meta: null },
                { status: 422 }
            )
        }
        if (!version || typeof version !== 'string' || !version.trim()) {
            return NextResponse.json(
                { data: null, error: { code: 'VALIDATION_ERROR', message: 'version is required.' }, meta: null },
                { status: 422 }
            )
        }
        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json(
                { data: null, error: { code: 'VALIDATION_ERROR', message: 'name is required.' }, meta: null },
                { status: 422 }
            )
        }
        if (!Array.isArray(pillars) || pillars.length === 0) {
            return NextResponse.json(
                { data: null, error: { code: 'VALIDATION_ERROR', message: 'pillars must be a non-empty array.' }, meta: null },
                { status: 422 }
            )
        }

        try {
            const profile = await importProfile(body as RegulationProfileFixture)
            return NextResponse.json({ data: profile, error: null, meta: null }, { status: 201 })
        } catch (e: any) {
            // Prisma unique constraint violation — regulation+version already exists
            if (e?.code === 'P2002') {
                return NextResponse.json(
                    { data: null, error: { code: 'CONFLICT', message: `A profile for ${regulation} version "${version}" already exists.` }, meta: null },
                    { status: 409 }
                )
            }
            return NextResponse.json(
                { data: null, error: { code: 'INTERNAL_ERROR', message: e.message ?? 'Failed to import profile.' }, meta: null },
                { status: 500 }
            )
        }
    }
)
