'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type PortfolioStats = {
    totalMills: number
    certifiedMills: number
    activeAuditsCount: number
    openFindingsCount: number
    totalGhgKgCo2e: number
    expiryTimeline: Array<{
        millId: string
        millName: string
        latestCertEnd: string
        regulation: string
    }>
}

export default function AggregatorDashboard() {
    const [stats, setStats] = useState<PortfolioStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            const res = await fetch('/api/dashboard/portfolio')
            const data = await res.json()
            setStats(data.data)
            setLoading(false)
        }
        fetchStats()
    }, [])

    if (loading) return <div className="text-gray-500 p-8">Loading portfolio statistics...</div>
    if (!stats) return <div className="text-red-500 p-8">Error loading Dashboard</div>

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Portfolio Dashboard</h1>
                <p className="text-sm text-gray-500">Global overview across all mills and certifications.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Certified Mills</h3>
                    <p className="mt-2 text-3xl font-bold text-green-600">
                        {stats.certifiedMills} <span className="text-lg text-gray-400 font-normal">/ {stats.totalMills}</span>
                    </p>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Total GHG Emissions</h3>
                    <p className="mt-2 text-3xl font-bold text-blue-600">
                        {(stats.totalGhgKgCo2e / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} tCO₂e
                    </p>
                    <p className="text-xs text-gray-400 mt-1">From certified periods only</p>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Active Audits</h3>
                    <p className="mt-2 text-3xl font-bold text-indigo-600">{stats.activeAuditsCount}</p>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Open Audit Findings</h3>
                    <p className="mt-2 text-3xl font-bold text-orange-500">{stats.openFindingsCount}</p>
                    <p className="text-xs text-gray-400 mt-1">Major & Minor non-conformances</p>
                </div>
            </div>

            {/* Certification Expiry Timeline */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-800">Certification Expiry Timeline</h2>
                </div>
                <div className="p-0">
                    {stats.expiryTimeline.length === 0 ? (
                        <p className="p-6 text-gray-500 text-sm">No certified mills to display.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-medium">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left">Mill Name</th>
                                        <th scope="col" className="px-6 py-3 text-left">Latest Certification</th>
                                        <th scope="col" className="px-6 py-3 text-left">Status</th>
                                        <th scope="col" className="px-6 py-3 text-left">Expiry Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                    {stats.expiryTimeline.map(item => {
                                        const expiryDate = new Date(item.latestCertEnd)
                                        const today = new Date()
                                        const diffDays = (expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24)

                                        let statusColor = 'bg-green-100 text-green-800'
                                        let statusText = 'Valid'

                                        if (diffDays <= 0) {
                                            statusColor = 'bg-red-100 text-red-800'
                                            statusText = 'Expired'
                                        } else if (diffDays <= 60) {
                                            statusColor = 'bg-orange-100 text-orange-800'
                                            statusText = 'Expiring Soon'
                                        }

                                        return (
                                            <tr key={item.millId} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 border-l-4" style={{ borderLeftColor: diffDays <= 0 ? '#ef4444' : diffDays <= 60 ? '#f97316' : '#22c55e' }}>
                                                    <Link href={`/aggregator/mills/${item.millId}`} className="hover:underline hover:text-blue-600">
                                                        {item.millName}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                        {item.regulation.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                                        {statusText}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                    {expiryDate.toLocaleDateString()}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
