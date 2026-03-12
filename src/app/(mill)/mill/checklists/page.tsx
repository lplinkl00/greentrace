'use client'

import { useState, useEffect } from 'react'

type Checklist = {
    id: string
    regulation: string
    status: string
    periodStart: string
    periodEnd: string
    _count: { items: number }
}

const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
    CERTIFIED: 'bg-green-100 text-green-700',
    RETURNED: 'bg-red-100 text-red-700',
}

export default function MillChecklistsPage() {
    const [checklists, setChecklists] = useState<Checklist[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/checklists')
            .then(res => res.json())
            .then(data => {
                setChecklists(data.data ?? [])
                setLoading(false)
            })
    }, [])

    if (loading) return <div className="text-gray-500 p-8">Loading checklists...</div>

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Checklists</h1>
            <div className="bg-white shadow rounded-lg overflow-hidden">
                {checklists.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">No checklists assigned to your mill yet.</p>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-medium">
                            <tr>
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
                                            href={`/mill/checklists/${cl.id}`}
                                            className="text-green-600 hover:underline font-medium text-sm"
                                        >
                                            View →
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
