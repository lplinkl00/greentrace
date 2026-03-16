// src/components/checklist-item-data-entry.tsx
'use client'

import { useState } from 'react'
import { CarbonCalculator } from '@/components/carbon-calculator'

export function ChecklistItemDataEntry() {
  const [appliedCo2e, setAppliedCo2e] = useState<{ value: number; unit: string } | null>(null)

  function handleCo2eSet(co2e: number, unit: string) {
    setAppliedCo2e({ value: co2e, unit })
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="font-semibold text-gray-800 mb-4">Data Entry</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Entry Type</label>
          <select className="mt-1 block w-full border rounded-md p-2 text-sm">
            <option>FORM01 — Absolute Quantity</option>
            <option>FORM02 — Rate</option>
            <option>Document Only</option>
            <option>Text Response</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Value</label>
            <input
              type="number"
              step="0.01"
              className="mt-1 block w-full border rounded-md p-2 text-sm"
              placeholder="Enter value"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Unit</label>
            <input
              type="text"
              className="mt-1 block w-full border rounded-md p-2 text-sm"
              placeholder="e.g. tCO2e, MWh"
            />
          </div>
        </div>

        {/* CO₂e (Climatiq) — shown when calculator has set a value */}
        {appliedCo2e && (
          <div>
            <label className="block text-sm font-medium text-gray-700">CO₂e (from Climatiq)</label>
            <input
              type="text"
              readOnly
              value={`${appliedCo2e.value} ${appliedCo2e.unit}`}
              className="mt-1 block w-full border border-green-300 bg-green-50 rounded-md p-2 text-sm text-green-800 font-medium"
            />
          </div>
        )}

        {/* Emission factor field — hidden when Climatiq value applied */}
        {!appliedCo2e && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Emission Factor</label>
            <select className="mt-1 block w-full border rounded-md p-2 text-sm">
              <option value="">Select emission factor (optional)</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Reporting Month</label>
          <input type="month" className="mt-1 block w-full border rounded-md p-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea className="mt-1 block w-full border rounded-md p-2 text-sm" rows={3} />
        </div>

        {/* Carbon Calculator */}
        <CarbonCalculator onValueSet={handleCo2eSet} />

        <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700">
          Save Entry
        </button>
      </div>
    </div>
  )
}
