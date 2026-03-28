import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/link so we can inspect hrefs without a Next.js router
vi.mock('next/link', () => ({
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}))

const mockStats = {
    totalCompanies: 2,
    certifiedCompanies: 1,
    activeAuditsCount: 3,
    openFindingsCount: 5,
    totalGhgKgCo2e: 5000,
    expiryTimeline: [],
}

// The dashboard is a client component — mock the fetch before importing
beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
        json: async () => ({ data: mockStats, error: null }),
    } as any)
})

// Dynamically import to pick up the mock
const { default: AggregatorDashboard } = await import(
    '@/app/(aggregator)/aggregator/dashboard/page'
)

describe('Aggregator dashboard — Recent Audits section', () => {
    it('View All link points to /aggregator/audits', async () => {
        const { findByText, findAllByText } = render(<AggregatorDashboard />)
        // Wait for the component to finish loading (stats are shown)
        await findByText('Recent Audits')
        const viewAllLinks = await findAllByText('View All')
        // The Recent Audits "View All" link is the second one (after Certification Expiry Timeline)
        const recentAuditsViewAll = viewAllLinks[1]
        expect(recentAuditsViewAll.closest('a')).toHaveAttribute('href', '/aggregator/audits')
    })
})
