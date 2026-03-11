'use client'

import { useState, useEffect } from 'react'

type MillStats = {
    checklistId: string
    periodStart: string
    periodEnd: string
    regulation: string
    status: string
    progress: {
        totalItems: number
        completedItems: number
        byPillar: Array<{
            pillar: string
            total: number
            completed: number
            percentage: number
        }>
    }
    ghgTotalKgCo2e: number
    massBalance: {
        totalEntries: number
        discrepancies: number
    }
    reconciliationAlerts: number
}

export default function MillDashboardPage() {
    const [stats, setStats] = useState<MillStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/dashboard/mill/current')
                const data = await res.json()
                if (data.error) throw new Error(data.error)
                setStats(data.data)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) return <div className="text-gray-500 p-8">Loading dashboard...</div>
    if (error) return <div className="text-red-500 p-8">Error: {error}</div>
    if (!stats) return <div className="text-gray-500 p-8">No active checklists found.</div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mill Dashboard</h1>
                    <p className="text-sm text-gray-500">
                        Current Period: {new Date(stats.periodStart).toLocaleDateString()} – {new Date(stats.periodEnd).toLocaleDateString()}
                        <span className="mx-2">|</span>
                        Regulation: {stats.regulation.replace(/_/g, ' ')}
                    </p>
                </div>
                <div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {stats.status}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white shadow rounded-lg p-6 border-l-4 border-green-500">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Item Progress</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                        {stats.progress.completedItems} <span className="text-lg text-gray-400 font-normal">/ {stats.progress.totalItems}</span>
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-4">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (stats.progress.completedItems / stats.progress.totalItems) * 100)}%` }}></div>
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6 border-l-4 border-blue-500">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">GHG Total (Scope 1+2+3)</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                        {(stats.ghgTotalKgCo2e / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-lg text-gray-500 font-normal">tCO₂e</span>
                    </p>
                    <p className="text-xs text-blue-600 mt-2 hover:underline cursor-pointer">View Emissions Breakdown</p>
                </div>

                <div className="bg-white shadow rounded-lg p-6 border-l-4 border-orange-500 group cursor-pointer hover:bg-orange-50 transition-colors">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Action Items</h3>
                    <div className="mt-2 flex gap-4">
                        <div>
                            <p className={`text-3xl font-bold ${stats.reconciliationAlerts > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                {stats.reconciliationAlerts}
                            </p>
                            <p className="text-xs text-gray-400">Reconciliation Alerts</p>
                        </div>
                        <div>
                            <p className={`text-3xl font-bold ${stats.massBalance.discrepancies > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                                {stats.massBalance.discrepancies}
                            </p>
                            <p className="text-xs text-gray-400">MB Discrepancies</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress by Pillar */}
            <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-800">Checklist Completion by Pillar</h2>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stats.progress.byPillar.map(pillar => (
                            <div key={pillar.pillar} className="border border-gray-100 rounded p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700 truncate" title={pillar.pillar}>{pillar.pillar}</span>
                                    <span className="text-sm text-gray-500 font-medium whitespace-nowrap">{pillar.percentage}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className={`h-2 rounded-full ${pillar.percentage === 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${pillar.percentage}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-400 mt-2 text-right">{pillar.completed} of {pillar.total} required</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
