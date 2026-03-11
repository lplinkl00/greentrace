import { LLMProvider } from '@prisma/client'
import { callClaude } from './anthropic'
import { callGemini } from './gemini'
import type { ReportPayload, LLMResponse, LLMProviderEnum } from './types'

export type { ReportPayload, LLMResponse, LLMProviderEnum }

/**
 * Maps the internal LLMProviderEnum string to the Prisma LLMProvider enum,
 * used when writing AuditReport.generatedBy to the database.
 */
export function toLLMProviderEnum(provider: LLMProviderEnum): LLMProvider {
    return provider === 'anthropic' ? LLMProvider.ANTHROPIC_CLAUDE : LLMProvider.GOOGLE_GEMINI
}

/**
 * Dispatcher: routes to the correct LLM adapter.
 * Defaults to Gemini if no provider specified.
 */
export async function generateReport(
    payload: ReportPayload,
    provider: LLMProviderEnum = 'gemini',
    model?: string
): Promise<LLMResponse> {
    switch (provider) {
        case 'anthropic':
            return callClaude(payload, model ?? 'claude-opus-4-5')
        case 'gemini':
        default:
            return callGemini(payload, model ?? 'gemini-2.5-pro-exp-03-25')
    }
}
