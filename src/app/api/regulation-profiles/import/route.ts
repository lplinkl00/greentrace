import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole, RegulationCode } from '@prisma/client'
import { importProfile, RegulationProfileFixture } from '@/lib/regulation-profiles'
import { prisma } from '@/lib/prisma'

const VALID_REGULATIONS = Object.values(RegulationCode) as string[]

export const POST = withAuth(
    [UserRole.SUPER_ADMIN],
    async (request: Request, _context: any, _user: any) => {
        let body: any
        try {
            body = await request.json()
        } catch {
            return NextResponse.json(
                { error: { message: 'Invalid JSON body.' } },
                { status: 400 }
            )
        }

        const { regulation, version, name, pillars } = body

        // Validate required fields
        if (!regulation || !VALID_REGULATIONS.includes(regulation)) {
            return NextResponse.json(
                { error: { message: `regulation must be one of: ${VALID_REGULATIONS.join(', ')}` } },
                { status: 422 }
            )
        }
        if (!version || typeof version !== 'string' || !version.trim()) {
            return NextResponse.json(
                { error: { message: 'version is required.' } },
                { status: 422 }
            )
        }
        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json(
                { error: { message: 'name is required.' } },
                { status: 422 }
            )
        }
        if (!Array.isArray(pillars) || pillars.length === 0) {
            return NextResponse.json(
                { error: { message: 'pillars must be a non-empty array.' } },
                { status: 422 }
            )
        }

        // Duplicate check
        const existing = await prisma.regulationProfile.findUnique({
            where: { regulation_version: { regulation, version } },
        })
        if (existing) {
            return NextResponse.json(
                { error: { message: `A profile for ${regulation} version "${version}" already exists.` } },
                { status: 409 }
            )
        }

        try {
            const profile = await importProfile(body as RegulationProfileFixture)
            return NextResponse.json({ data: profile }, { status: 201 })
        } catch (e: any) {
            return NextResponse.json(
                { error: { message: e.message ?? 'Failed to import profile.' } },
                { status: 500 }
            )
        }
    }
)
