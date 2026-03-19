import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { returnChecklistToCompany } from '@/lib/checklist-workflow'

export const POST = withAuth(
  [UserRole.AGGREGATOR_MANAGER, UserRole.SUPER_ADMIN],
  async (request: Request, context: any, user: any) => {
    const { id } = context.params
    const body = await request.json()

    if (!body.reason) {
      return NextResponse.json({ error: 'A reason is required.' }, { status: 400 })
    }

    try {
      const checklist = await returnChecklistToCompany(id, user.id, body.reason)
      return NextResponse.json({ data: checklist })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
  }
)
