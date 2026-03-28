import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('next/link', () => ({
    default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))
vi.mock('papaparse', () => ({
    default: { parse: vi.fn() },
}))

const { default: ImportWizardPage } = await import(
    '@/app/(company)/company/imports/new/page'
)

describe('Import Wizard — Step 1', () => {
    it('renders a file input on mount', () => {
        render(<ImportWizardPage />)
        // Should have a file input for CSV upload
        const fileInput = document.querySelector('input[type="file"]')
        expect(fileInput).toBeInTheDocument()
    })

    it('shows Step 1 label on mount', () => {
        render(<ImportWizardPage />)
        expect(screen.getByText(/step 1/i)).toBeInTheDocument()
    })

    it('shows a Cancel link back to /company/imports', () => {
        render(<ImportWizardPage />)
        const cancel = screen.getByRole('link', { name: /cancel/i })
        expect(cancel).toHaveAttribute('href', '/company/imports')
    })
})
