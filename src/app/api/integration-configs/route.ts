import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getConfigsForMill, upsertConfig } from '@/lib/integration-configs'

export const GET = withAuth(
    [UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AGGREGATOR_MANAGER, UserRole.SUPER_ADMIN],
    async (req: Request, _context: any, user: any) => {
        const { searchParams } = new URL(req.url)
        let millId = searchParams.get('millId')

        if (!millId) {
            if (user.millId) {
                millId = user.millId
            } else {
                return NextResponse.json({ error: 'millId query parameter is required' }, { status: 400 })
            }
        }

        // TS narrowing
        if (!millId) return NextResponse.json({ error: 'millId is missing' }, { status: 400 })

        // Basic RBAC check: if user belongs to a mill, they can only request their own mill
        if (user.millId && user.millId !== millId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        try {
            const configs = await getConfigsForMill(millId)
            return NextResponse.json({ data: configs })
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 500 })
        }
    }
)

export const POST = withAuth(
    [UserRole.MILL_MANAGER, UserRole.AGGREGATOR_MANAGER, UserRole.SUPER_ADMIN],
    async (req: Request, _context: any, user: any) => {
        try {
            const body = await req.json()

            let millId = body.millId
            if (!millId) {
                if (user.millId) {
                    millId = user.millId
                } else {
                    return NextResponse.json({ error: 'millId is required in payload' }, { status: 400 })
                }
            }

            if (!millId) return NextResponse.json({ error: 'millId is missing' }, { status: 400 })

            if (user.millId && user.millId !== millId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }

            const config = await upsertConfig(millId, {
                systemType: body.systemType,
                displayName: body.displayName || body.systemType,
                endpointUrl: body.endpointUrl,
                authType: body.authType,
                authKey: body.authKey,
                syncFrequency: body.syncFrequency,
            })

            return NextResponse.json({ data: config })
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 500 })
        }
    }
)
