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
        companyId: null,
        organisationId: null,
    }),
}))

vi.mock('@/lib/dashboard', () => ({
    getCompanyStats: vi.fn(),
}))

const { default: CompanyDashboard } = await import(
    '@/app/(company)/company/dashboard/page'
)

describe('Company dashboard — no associated company', () => {
    it('shows a friendly message instead of a red error screen', async () => {
        render(await CompanyDashboard())
        const msg = await screen.findByText(/no company associated/i)
        expect(msg).toBeInTheDocument()
        expect(screen.queryByText(/^Error:/)).not.toBeInTheDocument()
    })
})
