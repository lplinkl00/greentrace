import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/link', () => ({
    default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

vi.mock('@/lib/auth', () => ({
    getSessionUser: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'COMPANY_MANAGER',
        companyId: 'company-1',
        organisationId: null,
    }),
}))

vi.mock('@/lib/dashboard', () => ({
    getCompanyStats: vi.fn().mockResolvedValue({
        checklistId: 'cl-1',
        periodStart: '2024-01-01T00:00:00.000Z',
        periodEnd: '2024-12-31T00:00:00.000Z',
        regulation: 'MSPO_P2',
        status: 'DRAFT',
        progress: {
            totalItems: 10,
            completedItems: 5,
            byPillar: [],
        },
        ghgTotalKgCo2e: 1000,
        massBalance: { totalEntries: 3, discrepancies: 0 },
        reconciliationAlerts: 0,
    }),
}))

const { default: CompanyDashboard } = await import(
    '@/app/(company)/company/dashboard/page'
)

describe('Company dashboard quick tools', () => {
    it('Import tool links to imports page, not checklists', async () => {
        render(await CompanyDashboard())
        const importLink = await screen.findByRole('link', { name: /import/i })
        expect(importLink).toBeTruthy()
        expect(importLink.getAttribute('href')).toBe('/company/imports')
    })

    it('no quick tool links to a dead hash anchor', async () => {
        const { container } = render(await CompanyDashboard())
        await screen.findByText('Quick Tools')
        const links = Array.from(container.querySelectorAll('a'))
        const deadLinks = links.filter(l => l.getAttribute('href') === '#')
        expect(deadLinks).toHaveLength(0)
    })
})
