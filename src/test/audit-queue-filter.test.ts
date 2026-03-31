import { describe, it, expect } from 'vitest'

// Replicate the filter logic so we can unit-test it in isolation
function auditsDueSoonFilter(
    audits: Array<{ conductedDate: Date | null }>,
    now: Date
) {
    return audits.filter(a => {
        if (!a.conductedDate) return true  // no date set → always show
        const diffDays = (a.conductedDate.getTime() - now.getTime()) / (1000 * 3600 * 24)
        return diffDays <= 14
    })
}

describe('auditsDueSoon filter', () => {
    const now = new Date('2026-03-29T00:00:00Z')

    it('includes past-due audits (conductedDate 3 days ago)', () => {
        const pastDue = { conductedDate: new Date('2026-03-26T00:00:00Z') }
        expect(auditsDueSoonFilter([pastDue], now)).toHaveLength(1)
    })

    it('includes audits due today', () => {
        const today = { conductedDate: new Date('2026-03-29T00:00:00Z') }
        expect(auditsDueSoonFilter([today], now)).toHaveLength(1)
    })

    it('includes audits due in 10 days', () => {
        const soon = { conductedDate: new Date('2026-04-08T00:00:00Z') }
        expect(auditsDueSoonFilter([soon], now)).toHaveLength(1)
    })

    it('excludes audits due in more than 14 days', () => {
        const far = { conductedDate: new Date('2026-04-20T00:00:00Z') }
        expect(auditsDueSoonFilter([far], now)).toHaveLength(0)
    })

    it('includes audits with no conductedDate (unscheduled but active)', () => {
        const noDate = { conductedDate: null }
        expect(auditsDueSoonFilter([noDate], now)).toHaveLength(1)
    })
})
