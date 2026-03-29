import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AppSidebar from '@/components/AppSidebar'

vi.mock('next/navigation', () => ({
    usePathname: () => '/company/dashboard',
    useRouter:   () => ({ push: vi.fn() }),
}))

const mockUser = { name: 'Test User', email: 'test@example.com', role: 'MILL_MANAGER' }

describe('AppSidebar company CTA', () => {
    it('does not use misleading "New Entry" label for a list-page link', () => {
        render(<AppSidebar role="company" user={mockUser} />)
        expect(screen.queryByText(/New Entry/)).toBeNull()
    })

    it('CTA button is labelled "Checklists"', () => {
        render(<AppSidebar role="company" user={mockUser} />)
        // The CTA renders as "+ Checklists" — use regex to match
        expect(screen.getByText(/\+\s*Checklists/)).toBeInTheDocument()
    })
})
