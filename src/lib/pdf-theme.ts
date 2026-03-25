import { StyleSheet } from '@react-pdf/renderer'
import type { ColourScheme, StylePreset, ReportOptions } from './llm/types'
import { DEFAULT_REPORT_OPTIONS } from './llm/types'

// ─── Colour palettes ──────────────────────────────────────────────────────────

const PALETTES: Record<ColourScheme, { primary: string; accent: string; muted: string }> = {
    green:  { primary: '#2d6a4f', accent: '#52b788', muted: '#d8f3dc' },
    navy:   { primary: '#1e3a5f', accent: '#3b82f6', muted: '#dbeafe' },
    slate:  { primary: '#334155', accent: '#64748b', muted: '#f1f5f9' },
    amber:  { primary: '#92400e', accent: '#d97706', muted: '#fef3c7' },
}

// ─── Style preset tweaks ──────────────────────────────────────────────────────

interface PresetConfig {
    pagePadding: number
    fontSize: number
    lineHeight: number
    sectionBorder: boolean
    headerBackground: boolean
}

const PRESET_CONFIG: Record<StylePreset, PresetConfig> = {
    corporate:      { pagePadding: 56, fontSize: 10, lineHeight: 1.4,  sectionBorder: true,  headerBackground: false },
    minimal:        { pagePadding: 64, fontSize: 11, lineHeight: 1.65, sectionBorder: false, headerBackground: false },
    sustainability: { pagePadding: 48, fontSize: 11, lineHeight: 1.5,  sectionBorder: true,  headerBackground: true  },
}

// ─── Theme builder ────────────────────────────────────────────────────────────

export interface PdfTheme {
    styles: ReturnType<typeof StyleSheet.create>
    palette: { primary: string; accent: string; muted: string }
}

export function buildPdfTheme(options: ReportOptions = DEFAULT_REPORT_OPTIONS): PdfTheme {
    const palette = PALETTES[options.colourScheme]
    const preset  = PRESET_CONFIG[options.stylePreset]

    const styles = StyleSheet.create({
        page: {
            padding: preset.pagePadding,
            fontSize: preset.fontSize,
            fontFamily: 'Helvetica',
            color: '#1a1a1a',
        },
        title: {
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: 6,
        },
        subtitle: {
            fontSize: 11,
            color: '#666',
            marginBottom: 24,
        },
        sectionHeader: {
            fontSize: 12,
            fontWeight: 'bold',
            marginTop: 18,
            marginBottom: 6,
            paddingBottom: 4,
            color: palette.primary,
            ...(preset.sectionBorder ? { borderBottomWidth: 1, borderBottomColor: palette.accent } : {}),
        },
        pillarHeader: {
            fontSize: 11,
            fontWeight: 'bold',
            marginTop: 12,
            marginBottom: 4,
            color: palette.accent,
            ...(preset.headerBackground ? { backgroundColor: palette.muted, padding: 4 } : {}),
        },
        findingRow: {
            marginBottom: 6,
            paddingLeft: 12,
        },
        findingCode: {
            fontWeight: 'bold',
        },
        body: {
            lineHeight: preset.lineHeight,
            marginBottom: 8,
        },
        bullet: {
            paddingLeft: 12,
            marginBottom: 4,
            lineHeight: preset.lineHeight,
        },
        aiBanner: {
            backgroundColor: '#fef3cd',
            padding: 8,
            marginBottom: 16,
            borderRadius: 4,
            fontSize: 9,
            color: '#856404',
        },
        footer: {
            marginTop: 24,
            fontSize: 9,
            color: '#999',
            textAlign: 'center',
        },
    })

    return { styles, palette }
}
