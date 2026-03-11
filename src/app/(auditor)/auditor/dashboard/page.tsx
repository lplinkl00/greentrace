'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type AuditorStats = {
    activeAuditsCount: number
    auditsDueSoon: Array<{
        id: string
        millName: string
        regulation: string
        conductedDate: string
        status: string
    }>
    reportsToFinalise: Array<{
        id: string
        auditId: string
        millName: string
        version: number
        generatedAt: string
    }>
    totalFindings: number
}

export default function AuditorDashboardPage() {
    const [stats, setStats] = useState<AuditorStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            const res = await fetch('/api/dashboard/auditor')
            const data = await res.json()
            setStats(data.data)
            setLoading(false)
        }
        fetchStats()
    }, [])

    if (loading) return <div className="text-gray-500 p-8">Loading dashboard...</div>
    if (!stats) return <div className="text-red-500 p-8">Error loading Dashboard</div>

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Auditor Dashboard</h1>
                <p className="text-sm text-gray-500">Your assigned audits and pending actions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white shadow rounded-lg p-6 border-l-4 border-blue-500">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Active Audits</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{stats.activeAuditsCount}</p>
                    <Link href="/audits" className="text-xs text-blue-600 mt-2 block hover:underline">View All Active</Link>
                </div>

                <div className="bg-white shadow rounded-lg p-6 border-l-4 border-orange-500">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Draft Reports to Finalise</h3>
                    <p className="mt-2 text-3xl font-bold text-orange-600">{stats.reportsToFinalise.length}</p>
                    <p className="text-xs text-gray-400 mt-1">Requires human review</p>
                </div>

                <div className="bg-white shadow rounded-lg p-6 border-l-4 border-indigo-500">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">My Total Findings</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalFindings}</p>
                    <p className="text-xs text-gray-400 mt-1">Found across all active audits</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upcoming Audits */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h2 className="font-semibold text-gray-800">Upcoming Audits (Next 14 Days)</h2>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">{stats.auditsDueSoon.length}</span>
                    </div>
                    <div>
                        {stats.auditsDueSoon.length === 0 ? (
                            <p className="p-6 text-sm text-gray-500 text-center">No audits scheduled in the next 14 days.</p>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {stats.auditsDueSoon.map(audit => (
                                    <li key={audit.id} className="p-4 hover:bg-gray-50">
                                        <div className="flex justify-between">
                                            <div>
                                                <Link href={`/audits/${audit.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                                                    {audit.millName}
                                                </Link>
                                                <p className="text-xs text-gray-500 mt-1">{audit.regulation.replace(/_/g, ' ')}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-900 font-medium">{new Date(audit.conductedDate).toLocaleDateString()}</p>
                                                <p className="text-xs text-gray-500 mt-1 capitalize">{audit.status.replace(/_/g, ' ').toLowerCase()}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Reports to Finalise */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-orange-50 flex justify-between items-center">
                        <h2 className="font-semibold text-orange-800">Draft Reports Requiring Action</h2>
                        <span className="bg-orange-200 text-orange-900 text-xs px-2 py-1 rounded-full font-medium">{stats.reportsToFinalise.length}</span>
                    </div>
                    <div>
                        {stats.reportsToFinalise.length === 0 ? (
                            <p className="p-6 text-sm text-gray-500 text-center">No draft reports require action.</p>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {stats.reportsToFinalise.map(report => (
                                    <li key={report.id} className="p-4 hover:bg-gray-50">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{report.millName}</p>
                                                <p className="text-xs text-gray-500 mt-1">Draft v{report.version} generated {new Date(report.generatedAt).toLocaleDateString()}</p>
                                            </div>
                                            <Link
                                                href={`/audits/${report.auditId}/report`}
                                                className="bg-white border shadow-sm px-3 py-1.5 rounded text-xs text-blue-600 hover:bg-gray-50 font-medium"
                                            >
                                                Review & Finalise
                                            </Link>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
