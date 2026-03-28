import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/link', () => ({
    default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
        json: async () => ({ error: 'User is not associated with a company' }),
    } as any)
})

const { default: CompanyDashboard } = await import(
    '@/app/(company)/company/dashboard/page'
)

describe('Company dashboard — no associated company', () => {
    it('shows a friendly message instead of a red error screen', async () => {
        render(<CompanyDashboard />)
        const msg = await screen.findByText(/no company associated/i)
        expect(msg).toBeInTheDocument()
        expect(screen.queryByText(/^Error:/)).not.toBeInTheDocument()
    })
})
