import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
    prisma: {
        company: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    },
}))

// Mock auth
vi.mock('@/lib/auth', () => ({
    getSessionUser: vi.fn(),
    withAuth: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { GET, PATCH } from '@/app/api/companies/me/route'

const mockCompany = {
    id: 'co-1',
    name: 'Palm Star Mill',
    code: 'MY-PS-001',
    location: 'Selangor, Malaysia',
    country: 'Malaysia',
    latitude: null,
    longitude: null,
    isActive: true,
}

describe('GET /api/companies/me', () => {
    beforeEach(() => vi.restoreAllMocks())

    it('returns 401 if not authenticated', async () => {
        vi.mocked(getSessionUser).mockResolvedValue(null)
        const res = await GET(new NextRequest('http://localhost/api/companies/me'))
        expect(res.status).toBe(401)
    })

    it('returns 400 if user has no companyId', async () => {
        vi.mocked(getSessionUser).mockResolvedValue({
            id: 'u-1', email: 'a@b.com', name: 'A', role: 'COMPANY_STAFF' as any,
            companyId: null, organisationId: null,
        })
        const res = await GET(new NextRequest('http://localhost/api/companies/me'))
        expect(res.status).toBe(400)
    })

    it('returns company data for authenticated user', async () => {
        vi.mocked(getSessionUser).mockResolvedValue({
            id: 'u-1', email: 'a@b.com', name: 'A', role: 'COMPANY_STAFF' as any,
            companyId: 'co-1', organisationId: null,
        })
        vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as any)
        const res = await GET(new NextRequest('http://localhost/api/companies/me'))
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.name).toBe('Palm Star Mill')
    })
})

describe('PATCH /api/companies/me', () => {
    beforeEach(() => vi.restoreAllMocks())

    it('returns 403 for COMPANY_STAFF', async () => {
        vi.mocked(getSessionUser).mockResolvedValue({
            id: 'u-1', email: 'a@b.com', name: 'A', role: 'COMPANY_STAFF' as any,
            companyId: 'co-1', organisationId: null,
        })
        const req = new NextRequest('http://localhost/api/companies/me', {
            method: 'PATCH',
            body: JSON.stringify({ name: 'New Name' }),
            headers: { 'Content-Type': 'application/json' },
        })
        const res = await PATCH(req)
        expect(res.status).toBe(403)
    })

    it('updates and returns company for COMPANY_MANAGER', async () => {
        vi.mocked(getSessionUser).mockResolvedValue({
            id: 'u-1', email: 'a@b.com', name: 'A', role: 'COMPANY_MANAGER' as any,
            companyId: 'co-1', organisationId: null,
        })
        const updated = { ...mockCompany, name: 'New Name' }
        vi.mocked(prisma.company.update).mockResolvedValue(updated as any)
        const req = new NextRequest('http://localhost/api/companies/me', {
            method: 'PATCH',
            body: JSON.stringify({ name: 'New Name' }),
            headers: { 'Content-Type': 'application/json' },
        })
        const res = await PATCH(req)
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.name).toBe('New Name')
    })
})
