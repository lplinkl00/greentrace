import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getConfigsForCompany, upsertConfig } from '@/lib/integration-configs'

export const GET = withAuth(
    [UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.AGGREGATOR_MANAGER, UserRole.SUPER_ADMIN],
    async (req: Request, _context: any, user: any) => {
        const { searchParams } = new URL(req.url)
        let companyId = searchParams.get('companyId')

        if (!companyId) {
            if (user.companyId) {
                companyId = user.companyId
            } else {
                return NextResponse.json({ error: 'companyId query parameter is required' }, { status: 400 })
            }
        }

        // TS narrowing
        if (!companyId) return NextResponse.json({ error: 'companyId is missing' }, { status: 400 })

        // Basic RBAC check: if user belongs to a mill, they can only request their own mill
        if (user.companyId && user.companyId !== companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        try {
            const configs = await getConfigsForCompany(companyId)
            return NextResponse.json({ data: configs })
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 500 })
        }
    }
)

export const POST = withAuth(
    [UserRole.COMPANY_MANAGER, UserRole.AGGREGATOR_MANAGER, UserRole.SUPER_ADMIN],
    async (req: Request, _context: any, user: any) => {
        try {
            const body = await req.json()

            let companyId = body.companyId
            if (!companyId) {
                if (user.companyId) {
                    companyId = user.companyId
                } else {
                    return NextResponse.json({ error: 'companyId is required in payload' }, { status: 400 })
                }
            }

            if (!companyId) return NextResponse.json({ error: 'companyId is missing' }, { status: 400 })

            if (user.companyId && user.companyId !== companyId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }

            const config = await upsertConfig(companyId, {
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
