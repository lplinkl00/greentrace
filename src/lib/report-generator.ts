import { LLMProvider, AuditReportStatus } from '@prisma/client'
import { prisma } from './prisma'
import { generateReport } from './llm'
import type { ReportPayload, LLMProviderEnum, FindingSummary, ReportOptions } from './llm/types'
import { DEFAULT_REPORT_OPTIONS } from './llm/types'

/**
 * Builds the full ReportPayload from an audit ID, ready to be sent to the LLM.
 */
export async function buildReportPayload(auditId: string): Promise<ReportPayload> {
    const audit = await prisma.audit.findUniqueOrThrow({
        where: { id: auditId },
        include: {
            company: true,
            checklist: {
                include: {
                    items: {
                        include: {
                            requirement: {
                                include: {
                                    category: { include: { pillar: true } },
                                },
                            },
                            dataEntries: {
                                select: {
                                    valueConverted: true,
                                    emissionFactorId: true,
                                },
                            },
                        },
                    },
                },
            },
            findings: {
                include: {
                    checklistItem: {
                        include: {
                            requirement: {
                                include: {
                                    category: { include: { pillar: true } },
                                },
                            },
                        },
                    },
                },
            },
        },
    })

    const findingList: FindingSummary[] = audit.findings.map(f => ({
        requirementCode: f.checklistItem.requirement.code,
        requirementName: f.checklistItem.requirement.name,
        pillar: f.checklistItem.requirement.category.pillar.name,
        findingType: f.findingType,
        evidenceReviewed: f.evidenceReviewed,
        correctiveActionRequired: f.correctiveActionRequired,
    }))

    // Sum all converted GHG values (only entries with an emission factor attached)
    const ghgTotal = audit.checklist.items
        .flatMap(i => i.dataEntries)
        .filter(e => e.emissionFactorId !== null && e.valueConverted !== null)
        .reduce((sum: number, e: { valueConverted: any }) => sum + (e.valueConverted?.toNumber() ?? 0), 0)

    const f = findingList
    const conformantCount = f.filter(x => x.findingType === 'CONFORMANT').length
    const minorNcCount = f.filter(x => x.findingType === 'NON_CONFORMANT_MINOR').length
    const majorNcCount = f.filter(x => x.findingType === 'NON_CONFORMANT_MAJOR').length
    const observationCount = f.filter(x => x.findingType === 'OBSERVATION').length
    const notAssessedCount = audit.checklist.items.length - f.length

    return {
        auditId,
        companyName: audit.company.name,
        companyCode: audit.company.code,
        regulation: audit.regulation,
        periodStart: audit.periodStart.toISOString().substring(0, 10),
        periodEnd: audit.periodEnd.toISOString().substring(0, 10),
        auditType: audit.auditType,
        conductedDate: audit.conductedDate?.toISOString().substring(0, 10) ?? null,
        findings: findingList,
        ghgTotalKgCo2e: ghgTotal > 0 ? ghgTotal : null,
        totalItems: audit.checklist.items.length,
        conformantCount,
        minorNcCount,
        majorNcCount,
        observationCount,
        notAssessedCount,
    }
}

/**
 * Generates a draft report from the LLM and persists it as the next version.
 */
export async function createDraftReport(
    auditId: string,
    provider: LLMProviderEnum = 'anthropic',
    model: string | undefined,
    userId: string,
    reportOptions?: ReportOptions
) {
    const payload = await buildReportPayload(auditId)
    const response = await generateReport(payload, provider, model)

    // Determine next version number
    const latestReport = await prisma.auditReport.findFirst({
        where: { auditId },
        orderBy: { version: 'desc' },
        select: { version: true },
    })
    const nextVersion = (latestReport?.version ?? 0) + 1

    const prismaProvider =
        provider === 'anthropic' ? LLMProvider.ANTHROPIC_CLAUDE : LLMProvider.GOOGLE_GEMINI

    const report = await prisma.auditReport.create({
        data: {
            auditId,
            version: nextVersion,
            contentJson: response.content as any,
            generatedBy: prismaProvider,
            llmModel: model ?? (provider === 'anthropic' ? 'claude-opus-4-5' : 'gemini-2.5-pro-exp-03-25'),
            generatedAt: new Date(),
            status: AuditReportStatus.DRAFT,
            reportOptions: (reportOptions ?? DEFAULT_REPORT_OPTIONS) as any,
        },
    })

    return report
}

/**
 * Creates a new version of an existing report (human edit).
 * Each call bumps the version counter and creates a fresh DRAFT row.
 */
export async function createReportVersion(
    auditId: string,
    newContentJson: Record<string, unknown>,
    existingReport: {
        version: number
        generatedBy: LLMProvider
        llmModel: string
        reportOptions?: Record<string, unknown> | null
    },
    userId: string
) {
    const nextVersion = existingReport.version + 1

    return prisma.auditReport.create({
        data: {
            auditId,
            version: nextVersion,
            contentJson: newContentJson as any,
            generatedBy: existingReport.generatedBy,
            llmModel: existingReport.llmModel,
            generatedAt: new Date(),
            reviewedById: userId,
            reviewedAt: new Date(),
            status: AuditReportStatus.DRAFT,
            reportOptions: existingReport.reportOptions as any,
        },
    })
}
