import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/link', () => ({
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}))

vi.mock('@/lib/dashboard', () => ({
    getPortfolioStats: vi.fn().mockResolvedValue({
        totalCompanies: 2,
        certifiedCompanies: 1,
        activeAuditsCount: 3,
        openFindingsCount: 5,
        totalGhgKgCo2e: 5000,
        expiryTimeline: [],
    }),
}))

// Server components are async functions — call and await to get renderable JSX
const { default: AggregatorDashboard } = await import(
    '@/app/(aggregator)/aggregator/dashboard/page'
)

describe('Aggregator dashboard — Recent Audits section', () => {
    it('View All link points to /aggregator/audits', async () => {
        render(await AggregatorDashboard())
        const recentAuditsSection = screen.getByText('Recent Audits').closest('div.bg-white')!
        const viewAllLink = within(recentAuditsSection).getByRole('link', { name: /view all/i })
        expect(viewAllLink).toHaveAttribute('href', '/aggregator/audits')
    })
})
