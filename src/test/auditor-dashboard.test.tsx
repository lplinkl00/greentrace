import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/link', () => ({
    default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

vi.mock('@/lib/auth', () => ({
    getSessionUser: vi.fn().mockResolvedValue({
        id: 'auditor-1',
        email: 'auditor@test.com',
        name: 'Test Auditor',
        role: 'AUDITOR',
        companyId: null,
        organisationId: null,
    }),
}))

vi.mock('@/lib/dashboard', () => ({
    getAuditorStats: vi.fn().mockResolvedValue({
        activeAuditsCount: 2,
        auditsDueSoon: [],
        reportsToFinalise: [],
        totalFindings: 7,
    }),
}))

const { default: AuditorDashboard } = await import(
    '@/app/(auditor)/auditor/dashboard/page'
)

describe('Auditor dashboard', () => {
    it('renders the heading', async () => {
        render(await AuditorDashboard())
        expect(screen.getByText('Auditor Dashboard')).toBeInTheDocument()
    })

    it('shows total findings count', async () => {
        render(await AuditorDashboard())
        expect(screen.getByText('7')).toBeInTheDocument()
    })
})
