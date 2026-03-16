import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole, Prisma } from '@prisma/client'
import { getProductionRecords, createProductionRecord } from '@/lib/production'

const COMPANY_ROLES = [UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF]

export const GET = withAuth(
    [...COMPANY_ROLES, UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.AUDITOR],
    async (request: Request, _context: any, user) => {
        const { searchParams } = new URL(request.url)
        const companyId = searchParams.get('companyId')

        if (!companyId) {
            return NextResponse.json(
                { data: null, error: { code: 'VALIDATION_ERROR', message: 'companyId is required' }, meta: null },
                { status: 422 },
            )
        }

        const records = await getProductionRecords(companyId)
        return NextResponse.json({ data: records, error: null, meta: null })
    },
)

export const POST = withAuth(
    COMPANY_ROLES,
    async (request: Request, _context: any, user) => {
        if (!user.companyId) {
            return NextResponse.json(
                { data: null, error: { code: 'FORBIDDEN', message: 'No mill associated with user' }, meta: null },
                { status: 403 },
            )
        }

        const body = await request.json()
        const { productionDate, ffbReceivedMt, cpoProducedMt, pkoProducedMt, notes } = body

        if (!productionDate || ffbReceivedMt == null || cpoProducedMt == null || pkoProducedMt == null) {
            return NextResponse.json(
                { data: null, error: { code: 'VALIDATION_ERROR', message: 'productionDate, ffbReceivedMt, cpoProducedMt, pkoProducedMt are required' }, meta: null },
                { status: 422 },
            )
        }

        try {
            const record = await createProductionRecord({
                companyId: user.companyId,
                recordedById: user.id,
                productionDate: new Date(productionDate),
                ffbReceivedMt,
                cpoProducedMt,
                pkoProducedMt,
                notes: notes ?? undefined,
            })
            return NextResponse.json({ data: record, error: null, meta: null }, { status: 201 })
        } catch (err: any) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                return NextResponse.json(
                    { data: null, error: { code: 'CONFLICT', message: 'A production record for this date already exists' }, meta: null },
                    { status: 409 },
                )
            }
            throw err
        }
    },
)
