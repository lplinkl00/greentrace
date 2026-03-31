import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
}))

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

const { default: CompanyProfilePage } = await import(
    '@/app/(company)/company/profile/page'
)

describe('Company Profile page', () => {
    beforeEach(() => vi.restoreAllMocks())

    it('renders company name and code', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ data: mockCompany }),
        } as Response)
        render(<CompanyProfilePage />)
        await waitFor(() => screen.getByText('Palm Star Mill'))
        expect(screen.getByText('MY-PS-001')).toBeInTheDocument()
    })

    it('shows error if API fails', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: false,
            json: async () => ({ error: { message: 'Not found' } }),
        } as Response)
        render(<CompanyProfilePage />)
        await waitFor(() => screen.getByText(/failed to load/i))
    })
})
