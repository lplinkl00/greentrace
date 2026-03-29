import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/link', () => ({
    default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

// Minimal stats mock matching the actual API response shape
const mockStats = {
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
}

beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
        json: async () => ({ data: mockStats }),
    } as any)
})

const { default: CompanyDashboard } = await import(
    '@/app/(company)/company/dashboard/page'
)

describe('Company dashboard quick tools', () => {
    it('Import tool links to imports page, not checklists', async () => {
        render(<CompanyDashboard />)
        const importLink = await screen.findByRole('link', { name: /import/i })
        expect(importLink).toBeTruthy()
        expect(importLink.getAttribute('href')).toBe('/company/imports')
    })

    it('Help Desk tool does not link to dead hash anchor', async () => {
        render(<CompanyDashboard />)
        // Wait for the dashboard to load
        await screen.findByText('Quick Tools')
        const links = document.querySelectorAll('a')
        const helpLink = Array.from(links).find(l => l.textContent?.includes('Help') || l.textContent?.includes('Support'))
        // Either it's removed or points somewhere real
        if (helpLink) {
            expect(helpLink.getAttribute('href')).not.toBe('#')
        }
    })
})
