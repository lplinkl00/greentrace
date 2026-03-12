'use client'

import { BarChart3 } from 'lucide-react'

export default function AuditorReportsPage() {
    return (
        <div className="p-6 max-w-5xl">
            <div className="flex items-center gap-3 mb-6">
                <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                >
                    <BarChart3 size={18} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">Reports</h1>
                    <p className="text-sm text-zinc-400">Audit reports and compliance summaries</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-zinc-100 shadow-card p-6">
                <p className="text-sm text-zinc-500">Reports coming soon.</p>
            </div>
        </div>
    )
}
