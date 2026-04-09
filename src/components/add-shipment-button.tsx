'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

const MATERIAL_OPTIONS = [
    { value: 'FFB', label: 'FFB' },
    { value: 'CRUDE_PALM_OIL', label: 'CPO' },
    { value: 'PALM_KERNEL_OIL', label: 'PKO' },
    { value: 'PALM_KERNEL_EXPELLER', label: 'PKE' },
    { value: 'PALM_FATTY_ACID_DISTILLATE', label: 'PFAD' },
    { value: 'REFINED_BLEACHED_DEODORISED_OIL', label: 'RBDO' },
]

const DIRECTION_OPTIONS = [
    { value: 'INBOUND', label: 'INBOUND' },
    { value: 'OUTBOUND', label: 'OUTBOUND' },
]

const CERTIFICATION_OPTIONS = [
    { value: 'CERTIFIED', label: 'CERTIFIED' },
    { value: 'NON_CERTIFIED', label: 'NON CERTIFIED' },
    { value: 'PENDING', label: 'PENDING' },
]

export function AddShipmentButton({ companyId }: { companyId: string }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSaving(true)
        setError(null)
        const fd = new FormData(e.currentTarget)
        const body = {
            companyId,
            shipmentDate: fd.get('shipmentDate'),
            direction: fd.get('direction'),
            materialType: fd.get('materialType'),
            volumeMt: fd.get('volumeMt'),
            certificationStatus: fd.get('certificationStatus'),
            counterpartyName: fd.get('counterpartyName'),
            referenceNumber: fd.get('referenceNumber'),
            ghgValueKgco2e: fd.get('ghgValueKgco2e') || undefined,
        }
        try {
            const res = await fetch('/api/shipments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            if (!res.ok) {
                const d = await res.json().catch(() => ({}))
                setError(d.error?.message ?? 'Failed to save shipment')
                return
            }
            setOpen(false)
            router.refresh()
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
            >
                <Plus size={14} /> Add New Record
            </button>

            {open && (
                <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-zinc-800">New Shipment Record</h2>
                            <button onClick={() => setOpen(false)}><X size={16} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                                    Shipment Date *
                                    <input aria-label="Shipment Date" name="shipmentDate" type="date" required
                                        className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
                                </label>
                                <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                                    Direction *
                                    <select aria-label="Direction" name="direction" required
                                        className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30">
                                        <option value="">Select…</option>
                                        {DIRECTION_OPTIONS.map(d => (
                                            <option key={d.value} value={d.value}>{d.label}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                                    Material *
                                    <select aria-label="Material" name="materialType" required
                                        className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30">
                                        <option value="">Select…</option>
                                        {MATERIAL_OPTIONS.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                                    Volume (MT) *
                                    <input aria-label="Volume" name="volumeMt" type="number" step="0.001" min="0" required
                                        className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
                                </label>
                                <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                                    Certification *
                                    <select aria-label="Certification" name="certificationStatus" required
                                        className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30">
                                        <option value="">Select…</option>
                                        {CERTIFICATION_OPTIONS.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                                    GHG (kgCO₂e)
                                    <input aria-label="GHG" name="ghgValueKgco2e" type="number" step="0.001" min="0"
                                        className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
                                </label>
                            </div>
                            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                                Counterparty Name *
                                <input aria-label="Counterparty" name="counterpartyName" type="text" required
                                    className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
                            </label>
                            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                                Reference Number *
                                <input aria-label="Reference" name="referenceNumber" type="text" required
                                    className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
                            </label>

                            {error && <p className="text-xs text-red-500">{error}</p>}

                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setOpen(false)}
                                    className="text-sm px-4 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="text-sm font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-50 hover:opacity-90 transition"
                                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}>
                                    {saving ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
