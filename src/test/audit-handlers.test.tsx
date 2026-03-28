import { render, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
}))

// Mock audit data for handleAdvanceStatus test (SCHEDULED status)
const mockAuditScheduled = {
    id: 'audit-1',
    status: 'SCHEDULED',
    regulation: 'MSPO',
    periodStart: '2023-01-01T00:00:00Z',
    periodEnd: '2023-12-31T00:00:00Z',
    company: { name: 'Test Mill' },
    checklist: { items: [] },
    findings: [],
}

// Mock audit data for handlePublish test (FINDINGS_REVIEW status)
const mockAuditFindingsReview = {
    id: 'audit-1',
    status: 'FINDINGS_REVIEW',
    regulation: 'MSPO',
    periodStart: '2023-01-01T00:00:00Z',
    periodEnd: '2023-12-31T00:00:00Z',
    company: { name: 'Test Mill' },
    checklist: { items: [] },
    findings: [],
}

// Dynamically import the component after mocks are set up
const { default: AuditDetailPage } = await import(
    '@/app/(auditor)/auditor/audits/[auditId]/page'
)

describe('AuditDetailPage handlers', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        vi.spyOn(window, 'alert').mockImplementation(() => {})
    })

    it('Test A — handleAdvanceStatus resets statusUpdating on server error', async () => {
        // First fetch: load the audit (SCHEDULED)
        // Second fetch: PATCH returns 500
        vi.spyOn(global, 'fetch')
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockAuditScheduled }),
            } as any)
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ error: 'Internal Server Error' }),
            } as any)

        const { findByText } = render(
            <AuditDetailPage params={{ auditId: 'audit-1' }} />
        )

        // Wait for audit to load — button shows "Start Audit" when SCHEDULED
        const advanceBtn = await findByText('Start Audit')
        expect(advanceBtn).not.toBeDisabled()

        // Click the advance button — triggers the PATCH which returns 500
        fireEvent.click(advanceBtn)

        // After the error, button should NOT be permanently disabled (statusUpdating reset to false)
        await waitFor(() => {
            expect(advanceBtn).not.toBeDisabled()
        })
    })

    it('Test B — handlePublish does not leave publishing=true when res.json() throws', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true)

        // First fetch: load the audit (FINDINGS_REVIEW)
        // Second fetch: POST to publish returns non-JSON 500
        vi.spyOn(global, 'fetch')
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockAuditFindingsReview }),
            } as any)
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => { throw new Error('not json') },
            } as any)

        const { findByText } = render(
            <AuditDetailPage params={{ auditId: 'audit-1' }} />
        )

        // Wait for audit to load — button shows "Publish Audit" when FINDINGS_REVIEW
        const publishBtn = await findByText('Publish Audit')
        expect(publishBtn).not.toBeDisabled()

        // Click the publish button — triggers the POST which returns non-JSON 500
        fireEvent.click(publishBtn)

        // After the error (res.json() throws), publishing should be reset to false
        await waitFor(() => {
            expect(publishBtn).not.toBeDisabled()
        })
    })
})
