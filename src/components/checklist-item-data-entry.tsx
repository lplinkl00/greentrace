// src/components/checklist-item-data-entry.tsx
'use client'

import { useState, useEffect } from 'react'
import { CarbonCalculator } from '@/components/carbon-calculator'

type ChecklistItem = {
    id: string
    status: string
    requirement: {
        id: string
        code: string
        name: string
        dataType: string
        unit: string | null
        criticality: string
    } | null
    dataEntries: Array<{
        id: string
        valueRaw: number | null
        textValue: string | null
        unitInput: string | null
        notes: string | null
        reportingMonth: string | null
    }>
}

export function ChecklistItemDataEntry({
    checklistId,
    itemId,
}: {
    checklistId: string
    itemId: string
}) {
    const [item, setItem] = useState<ChecklistItem | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [value, setValue] = useState('')
    const [unit, setUnit] = useState('')
    const [notes, setNotes] = useState('')
    const [reportingMonth, setReportingMonth] = useState('')
    const [appliedCo2e, setAppliedCo2e] = useState<{ value: number; unit: string } | null>(null)

    useEffect(() => {
        fetch(`/api/checklist-items/${itemId}`)
            .then(r => r.json())
            .then(d => {
                setItem(d.data)
                // Pre-fill from most recent entry if exists
                const latest = d.data?.dataEntries?.[0]
                if (latest) {
                    setValue(latest.valueRaw != null ? String(latest.valueRaw) : (latest.textValue ?? ''))
                    setUnit(latest.unitInput ?? d.data?.requirement?.unit ?? '')
                    setNotes(latest.notes ?? '')
                    setReportingMonth(latest.reportingMonth?.substring(0, 7) ?? '')
                } else if (d.data?.requirement?.unit) {
                    setUnit(d.data.requirement.unit)
                }
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [itemId])

    function handleCo2eSet(co2e: number, u: string) {
        setAppliedCo2e({ value: co2e, unit: u })
    }

    const handleSave = async () => {
        if (!value.trim() && !notes.trim()) {
            setSaveError('Enter a value or notes before saving.')
            return
        }
        setSaving(true)
        setSaveError(null)
        setSaveSuccess(false)

        const payload: Record<string, unknown> = {
            unitInput: unit || null,
            reportingMonth: reportingMonth || null,
            notes: notes || null,
        }

        // Numeric vs text entry
        const numeric = parseFloat(value)
        if (!isNaN(numeric)) {
            payload.valueRaw = numeric
        } else if (value.trim()) {
            payload.textValue = value.trim()
        }

        // CO2e from Climatiq calculator
        if (appliedCo2e) {
            payload.co2eValue = appliedCo2e.value
            payload.co2eUnit = appliedCo2e.unit
        }

        const res = await fetch(`/api/checklist-items/${itemId}/data-entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        setSaving(false)
        if (res.ok) {
            setSaveSuccess(true)
            // Refresh so pre-fill reflects the newly saved entry
            const refreshed = await fetch(`/api/checklist-items/${itemId}`).then(r => r.json())
            if (refreshed.data) {
                setItem(refreshed.data)
                const latest = refreshed.data.dataEntries?.[0]
                if (latest) {
                    setValue(latest.valueRaw != null ? String(latest.valueRaw) : (latest.textValue ?? ''))
                    setUnit(latest.unitInput ?? refreshed.data.requirement?.unit ?? '')
                    setNotes(latest.notes ?? '')
                    setReportingMonth(latest.reportingMonth?.substring(0, 7) ?? '')
                }
            }
        } else {
            const json = await res.json().catch(() => ({}))
            setSaveError(json?.error?.message ?? 'Failed to save. Please try again.')
        }
    }

    if (loading) return (
        <div className="bg-white shadow rounded-lg p-6 flex items-center justify-center h-32">
            <div className="w-5 h-5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
        </div>
    )

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Data Entry</h2>
            {item?.requirement && (
                <p className="text-sm text-gray-500 mb-4">
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded mr-1">
                        {item.requirement.code}
                    </span>
                    {item.requirement.name}
                    {item.requirement.criticality === 'CRITICAL' && (
                        <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700">Critical</span>
                    )}
                </p>
            )}

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Value</label>
                        <input
                            type="number"
                            step="0.01"
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            className="mt-1 block w-full border rounded-md p-2 text-sm"
                            placeholder="Enter value"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Unit</label>
                        <input
                            type="text"
                            value={unit}
                            onChange={e => setUnit(e.target.value)}
                            className="mt-1 block w-full border rounded-md p-2 text-sm"
                            placeholder={item?.requirement?.unit ?? 'e.g. tCO2e, MWh'}
                        />
                    </div>
                </div>

                {/* CO₂e (from calculator) */}
                {appliedCo2e && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">CO₂e (from Calculator)</label>
                        <input
                            type="text"
                            readOnly
                            value={`${appliedCo2e.value} ${appliedCo2e.unit}`}
                            className="mt-1 block w-full border border-green-300 bg-green-50 rounded-md p-2 text-sm text-green-800 font-medium"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700">Reporting Month</label>
                    <input
                        type="month"
                        value={reportingMonth}
                        onChange={e => setReportingMonth(e.target.value)}
                        className="mt-1 block w-full border rounded-md p-2 text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="mt-1 block w-full border rounded-md p-2 text-sm"
                        rows={3}
                    />
                </div>

                {/* Carbon Calculator */}
                <CarbonCalculator onValueSet={handleCo2eSet} />

                {saveSuccess && (
                    <p className="text-green-600 text-sm font-medium">Entry saved successfully!</p>
                )}
                {saveError && (
                    <p className="text-red-500 text-sm">{saveError}</p>
                )}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? 'Saving…' : 'Save Entry'}
                </button>
            </div>
        </div>
    )
}
