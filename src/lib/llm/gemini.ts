import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ReportPayload, LLMResponse, ReportContentJson } from './types'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? '')

export async function callGemini(
    payload: ReportPayload,
    model = 'gemini-2.5-pro-exp-03-25'
): Promise<LLMResponse> {
    const geminiModel = genAI.getGenerativeModel({ model })

    const prompt = `You are an expert sustainability auditor writing formal ISCC/RSPO certification audit reports.
Your output MUST be valid JSON matching the structure described below. Do not include any text outside the JSON.

Generate a formal certification audit report for:
Company: ${payload.companyName} (${payload.companyCode})
Regulation: ${payload.regulation.replace(/_/g, ' ')}
Period: ${payload.periodStart} to ${payload.periodEnd}
Audit Type: ${payload.auditType}

FINDINGS SUMMARY:
- Conformant: ${payload.conformantCount}/${payload.totalItems}
- Minor Non-Conformant: ${payload.minorNcCount}
- Major Non-Conformant: ${payload.majorNcCount}
- Observations: ${payload.observationCount}
${payload.ghgTotalKgCo2e ? `- GHG Total: ${payload.ghgTotalKgCo2e.toFixed(2)} kg CO₂e` : ''}

DETAILED FINDINGS:
${payload.findings.map(f => `[${f.requirementCode}] ${f.requirementName} (${f.pillar}): ${f.findingType}
Evidence: ${f.evidenceReviewed}${f.correctiveActionRequired ? `\nCorrective Action: ${f.correctiveActionRequired}` : ''}`).join('\n\n')}

Return this exact JSON structure:
{
  "executiveSummary": "...",
  "findingsByPillar": [{ "pillar": "...", "items": [{ "requirementCode": "...", "requirementName": "...", "findingType": "...", "summary": "..." }] }],
  "recommendations": ["..."],
  "conclusion": "..."
}`

    const result = await geminiModel.generateContent(prompt)
    const rawText = result.response.text()
    const content = parseReportJson(rawText)

    return {
        content,
        rawText,
        tokensUsed: result.response.usageMetadata?.totalTokenCount ?? 0,
    }
}

function parseReportJson(rawText: string): ReportContentJson {
    const match = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ?? rawText.match(/(\{[\s\S]*\})/)
    const jsonStr = match ? match[1] : rawText

    try {
        return JSON.parse(jsonStr)
    } catch {
        return {
            executiveSummary: rawText,
            findingsByPillar: [],
            recommendations: [],
            conclusion: '',
        }
    }
}
