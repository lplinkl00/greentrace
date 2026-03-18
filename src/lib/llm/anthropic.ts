import Anthropic from '@anthropic-ai/sdk'
import type { ReportPayload, LLMResponse, ReportContentJson } from './types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function callClaude(
    payload: ReportPayload,
    model = 'claude-opus-4-5'
): Promise<LLMResponse> {
    const systemPrompt = `You are an expert sustainability auditor writing formal ISCC/RSPO certification audit reports. 
Your output MUST be valid JSON matching the ReportContentJson schema provided. 
Be formal, precise, and evidence-based. Do not add commentary outside the JSON.`

    const userPrompt = buildPrompt(payload)

    const message = await client.messages.create({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt,
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const content = parseReportJson(rawText)

    return {
        content,
        rawText,
        tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    }
}

function buildPrompt(payload: ReportPayload): string {
    return `Generate a formal certification audit report as JSON for the following audit:

Company: ${payload.companyName} (${payload.companyCode})
Regulation: ${payload.regulation.replace(/_/g, ' ')}
Period: ${payload.periodStart} to ${payload.periodEnd}
Audit Type: ${payload.auditType}
Conducted: ${payload.conductedDate ?? 'Not recorded'}

FINDINGS SUMMARY:
- Conformant: ${payload.conformantCount}/${payload.totalItems}
- Minor Non-Conformant: ${payload.minorNcCount}
- Major Non-Conformant: ${payload.majorNcCount}
- Observations: ${payload.observationCount}
- Not Assessed: ${payload.notAssessedCount}
${payload.ghgTotalKgCo2e ? `- GHG Total: ${payload.ghgTotalKgCo2e.toFixed(2)} kg CO₂e` : ''}

DETAILED FINDINGS:
${payload.findings.map(f => `[${f.requirementCode}] ${f.requirementName} (${f.pillar}): ${f.findingType}
Evidence: ${f.evidenceReviewed}${f.correctiveActionRequired ? `\nCorrective Action: ${f.correctiveActionRequired}` : ''}`).join('\n\n')}

Output JSON structure:
{
  "executiveSummary": "string",
  "findingsByPillar": [
    {
      "pillar": "string",
      "items": [{ "requirementCode": "string", "requirementName": "string", "findingType": "string", "summary": "string" }]
    }
  ],
  "recommendations": ["string"],
  "conclusion": "string"
}`
}

function parseReportJson(rawText: string): ReportContentJson {
    // Extract JSON from the response — model may wrap in markdown code blocks
    const match = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ?? rawText.match(/(\{[\s\S]*\})/)
    const jsonStr = match ? match[1] : rawText

    try {
        return JSON.parse(jsonStr)
    } catch {
        // Fallback: return the raw text wrapped in a basic structure
        return {
            executiveSummary: rawText,
            findingsByPillar: [],
            recommendations: [],
            conclusion: '',
        }
    }
}
