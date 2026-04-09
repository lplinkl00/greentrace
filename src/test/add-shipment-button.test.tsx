import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mockRefresh }),
}))

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'ship-1' }, error: null }),
    })
    vi.spyOn(global, 'fetch').mockImplementation(fetchMock)
})

const { AddShipmentButton } = await import('@/components/add-shipment-button')

describe('AddShipmentButton', () => {
    it('opens a modal when clicked', async () => {
        render(<AddShipmentButton companyId="company-1" />)
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: /add new record/i }))
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('submits form data to POST /api/shipments', async () => {
        render(<AddShipmentButton companyId="company-1" />)
        fireEvent.click(screen.getByRole('button', { name: /add new record/i }))

        fireEvent.change(screen.getByLabelText(/shipment date/i), { target: { value: '2026-01-15' } })
        fireEvent.change(screen.getByLabelText(/direction/i), { target: { value: 'OUTBOUND' } })
        fireEvent.change(screen.getByLabelText(/material/i), { target: { value: 'CRUDE_PALM_OIL' } })
        fireEvent.change(screen.getByLabelText(/volume/i), { target: { value: '100' } })
        fireEvent.change(screen.getByLabelText(/certification/i), { target: { value: 'CERTIFIED' } })
        fireEvent.change(screen.getByLabelText(/counterparty/i), { target: { value: 'Acme Corp' } })
        fireEvent.change(screen.getByLabelText(/reference/i), { target: { value: 'REF-001' } })

        fireEvent.click(screen.getByRole('button', { name: /save/i }))

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith('/api/shipments', expect.objectContaining({
                method: 'POST',
            }))
        })
        const body = JSON.parse(fetchMock.mock.calls[0][1].body)
        expect(body.companyId).toBe('company-1')
        expect(body.direction).toBe('OUTBOUND')
    })

    it('closes the modal after a successful save', async () => {
        render(<AddShipmentButton companyId="company-1" />)
        fireEvent.click(screen.getByRole('button', { name: /add new record/i }))

        fireEvent.change(screen.getByLabelText(/shipment date/i), { target: { value: '2026-01-15' } })
        fireEvent.change(screen.getByLabelText(/direction/i), { target: { value: 'INBOUND' } })
        fireEvent.change(screen.getByLabelText(/material/i), { target: { value: 'FFB' } })
        fireEvent.change(screen.getByLabelText(/volume/i), { target: { value: '50' } })
        fireEvent.change(screen.getByLabelText(/certification/i), { target: { value: 'NON_CERTIFIED' } })
        fireEvent.change(screen.getByLabelText(/counterparty/i), { target: { value: 'Supplier A' } })
        fireEvent.change(screen.getByLabelText(/reference/i), { target: { value: 'REF-002' } })
        fireEvent.click(screen.getByRole('button', { name: /save/i }))

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })
})
