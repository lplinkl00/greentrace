'use client'

import { useState, useEffect } from 'react'

type Checklist = {
    id: string
    companyId: string
    regulation: string
    status: string
    periodStart: string
    periodEnd: string
    _count: { items: number }
    company: { id: string; name: string; code: string } | null
}

const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
    CERTIFIED: 'bg-green-100 text-green-700',
    RETURNED: 'bg-red-100 text-red-700',
}

export default function ChecklistsPage() {
    const [checklists, setChecklists] = useState<Checklist[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/checklists')
            .then(res => res.json())
            .then(data => {
                setChecklists(data.data ?? [])
                setLoading(false)
            })
            .catch(() => { setError('Failed to load checklists'); setLoading(false) })
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
        </div>
    )
    if (error) return <div className="text-red-500 text-sm p-4">{error}</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Checklists</h1>
                <a
                    href="/aggregator/checklists/new"
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                >
                    Assign Regulation to Company
                </a>
            </div>
            <div className="bg-white shadow rounded-lg overflow-hidden">
                {checklists.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">
                        No checklists yet. Use &ldquo;Assign Regulation to Company&rdquo; to create one.
                    </p>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3 text-left">Company</th>
                                <th className="px-6 py-3 text-left">Regulation</th>
                                <th className="px-6 py-3 text-left">Period</th>
                                <th className="px-6 py-3 text-left">Items</th>
                                <th className="px-6 py-3 text-left">Status</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                            {checklists.map(cl => (
                                <tr key={cl.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {cl.company?.name ?? cl.companyId}
                                        <span className="ml-1 text-xs text-gray-400">{cl.company?.code}</span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {cl.regulation.replace(/_/g, ' ')}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {new Date(cl.periodStart).getFullYear()}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {cl._count.items}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[cl.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                            {cl.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <a
                                            href={`/aggregator/companies/${cl.companyId}/checklists/${cl.id}/review`}
                                            className="text-green-600 hover:underline font-medium text-sm"
                                        >
                                            Review →
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
