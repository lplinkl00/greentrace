'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Factory } from 'lucide-react'

export default function NewProductionRecordPage() {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({
        productionDate: new Date().toISOString().split('T')[0],
        ffbReceivedMt: '',
        cpoProducedMt: '',
        pkoProducedMt: '',
        notes: '',
    })

    function set(field: string, value: string) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        const res = await fetch('/api/production', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productionDate: form.productionDate,
                ffbReceivedMt: parseFloat(form.ffbReceivedMt),
                cpoProducedMt: parseFloat(form.cpoProducedMt),
                pkoProducedMt: parseFloat(form.pkoProducedMt),
                notes: form.notes || undefined,
            }),
        })

        if (res.ok) {
            router.push('/company/production')
        } else {
            const json = await res.json()
            setError(json?.error?.message ?? 'Something went wrong')
            setSubmitting(false)
        }
    }

    const inputClass = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-400'
    const labelClass = 'block text-xs font-medium text-zinc-600 mb-1'

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}>
                    <Factory size={16} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">New Production Record</h1>
                    <p className="text-sm text-zinc-400">Log daily FFB intake and output volumes.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-100 shadow-card p-6 space-y-5">
                <div>
                    <label className={labelClass}>Production Date <span className="text-red-500">*</span></label>
                    <input
                        type="date"
                        required
                        value={form.productionDate}
                        onChange={e => set('productionDate', e.target.value)}
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className={labelClass}>FFB Received (MT) <span className="text-red-500">*</span></label>
                    <input
                        type="number"
                        required
                        min="0"
                        step="0.0001"
                        placeholder="e.g. 250.5"
                        value={form.ffbReceivedMt}
                        onChange={e => set('ffbReceivedMt', e.target.value)}
                        className={inputClass}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>CPO Produced (MT) <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.0001"
                            placeholder="e.g. 52.3"
                            value={form.cpoProducedMt}
                            onChange={e => set('cpoProducedMt', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>PKO Produced (MT) <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.0001"
                            placeholder="e.g. 12.1"
                            value={form.pkoProducedMt}
                            onChange={e => set('pkoProducedMt', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Notes</label>
                    <textarea
                        rows={3}
                        placeholder="Optional notes about this production run…"
                        value={form.notes}
                        onChange={e => set('notes', e.target.value)}
                        className={inputClass + ' resize-none'}
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                        type="button"
                        onClick={() => router.push('/company/production')}
                        className="text-sm text-zinc-500 hover:text-zinc-800 px-4 py-2 rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="text-sm font-semibold px-5 py-2 rounded-lg text-white hover:opacity-90 transition disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                    >
                        {submitting ? 'Saving…' : 'Save Record'}
                    </button>
                </div>
            </form>
        </div>
    )
}
