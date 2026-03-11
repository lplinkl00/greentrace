// ─── LLM Types ────────────────────────────────────────────────────────────

export type LLMProviderEnum = 'anthropic' | 'gemini'

export interface FindingSummary {
    requirementCode: string
    requirementName: string
    pillar: string
    findingType: string
    evidenceReviewed: string
    correctiveActionRequired?: string | null
}

export interface ReportPayload {
    auditId: string
    millName: string
    millCode: string
    regulation: string
    periodStart: string
    periodEnd: string
    auditType: string
    conductedDate?: string | null
    findings: FindingSummary[]
    ghgTotalKgCo2e?: number | null
    totalItems: number
    conformantCount: number
    minorNcCount: number
    majorNcCount: number
    observationCount: number
    notAssessedCount: number
}

export interface ReportContentJson {
    executiveSummary: string
    findingsByPillar: {
        pillar: string
        items: {
            requirementCode: string
            requirementName: string
            findingType: string
            summary: string
        }[]
    }[]
    recommendations: string[]
    conclusion: string
}

export interface LLMResponse {
    content: ReportContentJson
    tokensUsed: number
    rawText: string
}
