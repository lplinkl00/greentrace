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
    companyName: string
    companyCode: string
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

// ─── Report customisation options ─────────────────────────────────────────

export type ColourScheme = 'green' | 'navy' | 'slate' | 'amber'

export type StylePreset = 'corporate' | 'minimal' | 'sustainability'

export interface ReportOptions {
    colourScheme: ColourScheme
    stylePreset: StylePreset
}

export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
    colourScheme: 'green',
    stylePreset: 'sustainability',
}
