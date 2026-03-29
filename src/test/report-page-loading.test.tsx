import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
}))

const mockReport = {
    id: 'rpt-1',
    version: 1,
    status: 'DRAFT',
    generatedBy: 'claude-sonnet-4-6',
    llmModel: 'claude-sonnet-4-6',
    generatedAt: new Date().toISOString(),
    contentJson: {
        executiveSummary: 'Test summary',
        findingsByPillar: [],
        recommendations: ['Rec 1'],
        conclusion: 'Test conclusion',
    },
    pdfPath: null,
}

const { default: AuditReportPage } = await import(
    '@/app/(auditor)/auditor/audits/[auditId]/report/page'
)

describe('AuditReportPage loading state error handling', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        vi.spyOn(window, 'confirm').mockReturnValue(true)
    })

    it('Generate button is re-enabled after a non-JSON 500 error', async () => {
        vi.spyOn(global, 'fetch')
            // initial loadReports — returns one report
            .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [mockReport] }) } as Response)
            // handleGenerate — server returns 500 with HTML body
            .mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('not json') } } as unknown as Response)

        render(<AuditReportPage params={{ auditId: 'audit-1' }} />)
        await waitFor(() => expect(screen.queryByText(/loading/i)).toBeNull())

        const generateBtn = screen.getByRole('button', { name: /generate/i })
        fireEvent.click(generateBtn)

        await waitFor(() => {
            expect(generateBtn).not.toBeDisabled()
        }, { timeout: 3000 })
    })

    it('Finalise button is re-enabled after a network failure', async () => {
        vi.spyOn(global, 'fetch')
            .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [mockReport] }) } as Response)
            .mockRejectedValueOnce(new Error('network error'))

        render(<AuditReportPage params={{ auditId: 'audit-1' }} />)
        await waitFor(() => expect(screen.queryByText(/loading/i)).toBeNull())

        const finaliseBtn = screen.getByRole('button', { name: /finalise/i })
        fireEvent.click(finaliseBtn)

        await waitFor(() => {
            expect(finaliseBtn).not.toBeDisabled()
        }, { timeout: 3000 })
    })

    it('Export PDF button is re-enabled after a non-JSON 500 error', async () => {
        const finalReport = { ...mockReport, status: 'FINAL' }
        vi.spyOn(global, 'fetch')
            .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [finalReport] }) } as Response)
            .mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('not json') } } as unknown as Response)

        render(<AuditReportPage params={{ auditId: 'audit-1' }} />)
        await waitFor(() => expect(screen.queryByText(/loading/i)).toBeNull())

        const exportBtn = screen.getByRole('button', { name: /export/i })
        fireEvent.click(exportBtn)

        await waitFor(() => {
            expect(exportBtn).not.toBeDisabled()
        }, { timeout: 3000 })
    })
})
