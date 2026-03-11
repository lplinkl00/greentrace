'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    FINDINGS_REVIEW: 'bg-purple-100 text-purple-800',
    PUBLISHED: 'bg-green-100 text-green-800',
}

export default function AuditorDashboard() {
    const [audits, setAudits] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/audits')
            .then(res => res.json())
            .then(data => {
                setAudits(data.data ?? [])
                setLoading(false)
            })
    }, [])

    if (loading) return <div className="text-gray-500">Loading audits...</div>

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">My Audits</h1>

            {audits.length === 0 ? (
                <div className="bg-white shadow rounded-lg p-12 text-center text-gray-400">
                    No audits have been assigned to you yet.
                </div>
            ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mill</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Regulation</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Findings</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {audits.map((audit: any) => (
                                <tr key={audit.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{audit.mill?.name}</div>
                                        <div className="text-xs text-gray-400">{audit.mill?.code}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{audit.regulation?.replace('_', ' ')}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        {audit.periodStart?.substring(0, 10)} → {audit.periodEnd?.substring(0, 10)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[audit.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                            {audit.status?.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        {audit.findings?.length ?? 0} recorded
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/audits/${audit.id}`}
                                            className="text-sm font-medium text-green-600 hover:text-green-800"
                                        >
                                            Open →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
