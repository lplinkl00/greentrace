// src/components/carbon-calculator.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Zap, Loader2 } from 'lucide-react'
import { CLIMATIQ_ACTIVITIES } from '@/lib/climatiq-activities'

interface Props {
  onValueSet: (co2e: number, unit: string) => void
}

export function CarbonCalculator({ onValueSet }: Props) {
  const [open, setOpen] = useState(false)
  const [activityId, setActivityId] = useState(CLIMATIQ_ACTIVITIES[0].id)
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState(CLIMATIQ_ACTIVITIES[0].defaultUnit)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ co2e: number; co2e_unit: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  const selectedActivity = CLIMATIQ_ACTIVITIES.find(a => a.id === activityId)!

  function handleActivityChange(id: string) {
    const act = CLIMATIQ_ACTIVITIES.find(a => a.id === id)!
    setActivityId(id)
    setUnit(act.defaultUnit)
    setResult(null)
    setError(null)
    setApplied(false)
  }

  async function handleCalculate() {
    if (!quantity || isNaN(Number(quantity))) {
      setError('Enter a valid quantity')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setApplied(false)

    try {
      const res = await fetch('/api/carbon-calculator/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, quantity: Number(quantity), unit }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error?.message ?? 'Climatiq API request failed')
      } else {
        setResult(json.data)
      }
    } catch {
      setError('Network error — could not reach Climatiq')
    } finally {
      setLoading(false)
    }
  }

  function handleUseValue() {
    if (!result) return
    onValueSet(result.co2e, result.co2e_unit)
    setApplied(true)
    setOpen(false)
  }

  return (
    <div className="rounded-lg border border-green-100 bg-green-50/40">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-50 transition rounded-lg"
      >
        <span className="flex items-center gap-2">
          <Zap size={14} />
          Calculate with Climatiq
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Applied badge (shown when collapsed after use) */}
      {!open && applied && result && (
        <div className="px-4 pb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            CO₂e set via Climatiq: {result.co2e} {result.co2e_unit}
          </span>
        </div>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="border-t border-green-100 px-4 py-4 space-y-3">
          {/* Activity selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Activity</label>
            <select
              value={activityId}
              onChange={e => handleActivityChange(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {CLIMATIQ_ACTIVITIES.map(a => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Quantity + unit */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Quantity</label>
              <input
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={e => { setQuantity(e.target.value); setResult(null); setError(null) }}
                placeholder="e.g. 100"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Unit</label>
              <select
                value={unit}
                onChange={e => { setUnit(e.target.value); setResult(null) }}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                {selectedActivity.units.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          {/* Result */}
          {result && (
            <div className="flex items-center justify-between rounded-md bg-white border border-green-200 px-3 py-2">
              <span className="text-sm font-semibold text-zinc-800">
                {result.co2e} {result.co2e_unit}
              </span>
              <button
                type="button"
                onClick={handleUseValue}
                className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md transition"
              >
                Use this value →
              </button>
            </div>
          )}

          {/* Calculate button */}
          <button
            type="button"
            onClick={handleCalculate}
            disabled={loading || !quantity}
            className="flex items-center gap-2 rounded-md bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-40 transition"
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
        </div>
      )}
    </div>
  )
}
