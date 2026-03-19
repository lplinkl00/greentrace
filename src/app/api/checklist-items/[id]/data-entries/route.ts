import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole, DataEntryType } from '@prisma/client'
import { createDataEntry } from '@/lib/data-entries'

export const POST = withAuth(
  [
    UserRole.SUPER_ADMIN,
    UserRole.AGGREGATOR_MANAGER,
    UserRole.COMPANY_MANAGER,
    UserRole.COMPANY_STAFF,
  ],
  async (request: Request, { params }: { params: { id: string } }, user) => {
    const body = await request.json()
    const { valueRaw, unitInput, textValue, reportingMonth, notes, co2eValue, co2eUnit, emissionFactorId } = body

    if (valueRaw == null && !textValue?.trim()) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Provide either a numeric value or a text value' }, meta: null },
        { status: 422 }
      )
    }

    try {
      const entry = await createDataEntry({
        checklistItemId: params.id,
        enteredById: user.id,
        entryType: valueRaw != null ? DataEntryType.FORM01_ABSOLUTE : DataEntryType.TEXT,
        valueRaw: valueRaw ?? null,
        unitInput: unitInput ?? null,
        textValue: textValue ?? null,
        emissionFactorId: emissionFactorId ?? null,
        reportingMonth: reportingMonth ? new Date(`${reportingMonth}-01`) : null,
        notes: notes ?? null,
        valueConverted: co2eValue ?? null,
        unitReference: co2eUnit ?? null,
      })

      return NextResponse.json({ data: entry, error: null, meta: null }, { status: 201 })
    } catch (err: any) {
      if (err.message === 'PERIOD_LOCKED') {
        return NextResponse.json(
          { data: null, error: { code: 'PERIOD_LOCKED', message: 'This checklist period is locked' }, meta: null },
          { status: 409 }
        )
      }
      if (err.message === 'EMISSION_FACTOR_EXPIRED') {
        return NextResponse.json(
          { data: null, error: { code: 'EMISSION_FACTOR_EXPIRED', message: 'The selected emission factor has expired' }, meta: null },
          { status: 422 }
        )
      }
      throw err
    }
  }
)
