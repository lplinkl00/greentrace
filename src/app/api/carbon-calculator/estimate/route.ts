// src/app/api/carbon-calculator/estimate/route.ts
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { CLIMATIQ_ACTIVITIES } from '@/lib/climatiq-activities'

const ALLOWED_ROLES = [
  UserRole.MILL_MANAGER,
  UserRole.MILL_STAFF,
  UserRole.SUPER_ADMIN,
  UserRole.AGGREGATOR_MANAGER,
]

export const POST = withAuth(
  ALLOWED_ROLES,
  async (request: Request) => {
    const apiKey = process.env.CLIMATIQ_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { data: null, error: { code: 'CONFIGURATION_ERROR', message: 'Climatiq API key not configured' }, meta: null },
        { status: 500 },
      )
    }

    const body = await request.json()
    const { activityId, quantity, unit } = body

    if (!activityId || quantity == null || !unit) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'activityId, quantity, and unit are required' }, meta: null },
        { status: 422 },
      )
    }

    // Validate activityId is from our curated list
    const activity = CLIMATIQ_ACTIVITIES.find(a => a.id === activityId)
    if (!activity) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Unknown activity ID' }, meta: null },
        { status: 422 },
      )
    }

    // Build Climatiq request body based on parameter type
    let parameters: Record<string, unknown>
    switch (activity.parameterType) {
      case 'volume':
        parameters = { volume: quantity, volume_unit: unit }
        break
      case 'energy':
        parameters = { energy: quantity, energy_unit: unit }
        break
      case 'weight':
        parameters = { weight: quantity, weight_unit: unit }
        break
      case 'weight_distance':
        // tonne_km: treat quantity as tonne_km directly
        parameters = { weight: quantity, weight_unit: 't', distance: 1, distance_unit: 'km' }
        break
    }

    const climatiqRes = await fetch('https://api.climatiq.io/data/v1/estimate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emission_factor: { activity_id: activityId, data_version: '^21' },
        parameters,
      }),
    })

    if (!climatiqRes.ok) {
      const errorBody = await climatiqRes.text()
      console.error('Climatiq API error:', climatiqRes.status, errorBody)
      let climatiqMessage = 'Climatiq API request failed'
      try {
        const parsed = JSON.parse(errorBody)
        if (parsed.error) climatiqMessage = parsed.error
        else if (parsed.message) climatiqMessage = parsed.message
      } catch {
        if (errorBody && errorBody.length < 200) climatiqMessage = errorBody
      }
      return NextResponse.json(
        { data: null, error: { code: 'CLIMATIQ_ERROR', message: climatiqMessage }, meta: null },
        { status: 502 },
      )
    }

    const climatiqData = await climatiqRes.json()

    return NextResponse.json({
      data: {
        co2e: climatiqData.co2e as number,
        co2e_unit: climatiqData.co2e_unit as string,
        activity_label: activity.label,
      },
      error: null,
      meta: null,
    })
  },
)
