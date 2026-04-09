import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// The report page is a client component — mock fetch before importing
beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
        json: async () => ({ data: [], error: null }),
    } as any)
})

// Dynamically import to pick up the mock
const { default: AuditReportPage } = await import(
    '@/app/(auditor)/auditor/audits/[auditId]/report/page'
)

describe('AuditReportPage — loadReports fetch URL', () => {
    it('fetches /api/audit-reports?auditId=audit-123 (query-param only, no path segment)', async () => {
        const { findByText } = render(
            <AuditReportPage params={{ auditId: 'audit-123' }} />
        )

        // Wait for loading to finish (the empty-state message appears)
        await findByText('No report generated yet')

        expect(global.fetch).toHaveBeenCalledWith(
            '/api/audit-reports?auditId=audit-123'
        )
    })

    it('does NOT fetch the wrong URL with auditId as a path segment', async () => {
        const { findByText } = render(
            <AuditReportPage params={{ auditId: 'audit-123' }} />
        )

        await findByText('No report generated yet')

        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
        const urls = calls.map((c: unknown[]) => c[0] as string)
        expect(urls).not.toContain('/api/audit-reports/audit-123?auditId=audit-123')
    })
})
