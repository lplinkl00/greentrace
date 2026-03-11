'use client'

import { useState, useEffect } from 'react'

type IntegrationConfig = {
    id: string
    systemType: string
    endpointUrl: string | null
    authType: string | null
    authKey: string | null
    syncFrequency: string | null
    isActive: boolean
}

const INTEGRATION_TYPES = [
    { type: 'SAP', name: 'SAP ERP' },
    { type: 'WEIGHBRIDGE_GENERIC', name: 'Generic Weighbridge' },
    { type: 'ERP_GENERIC', name: 'Generic ERP API' },
    { type: 'CUSTOM_API', name: 'Custom Developer API' }
]

export default function AggregatorMillIntegrationsPage({ params }: { params: { millId: string } }) {
    const [configs, setConfigs] = useState<IntegrationConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)

    useEffect(() => {
        fetchConfigs()
    }, [params.millId])

    const fetchConfigs = async () => {
        try {
            const res = await fetch(`/api/integration-configs?millId=${params.millId}`)
            const data = await res.json()
            if (data.data) {
                setConfigs(data.data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent<HTMLFormElement>, systemType: string) => {
        e.preventDefault()
        setSaving(systemType)

        const formData = new FormData(e.currentTarget)
        const payload = {
            millId: params.millId,
            systemType,
            endpointUrl: formData.get('endpointUrl')?.toString(),
            authType: formData.get('authType')?.toString(),
            authKey: formData.get('authKey')?.toString(),
            syncFrequency: formData.get('syncFrequency')?.toString()
        }

        try {
            await fetch('/api/integration-configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            await fetchConfigs()
        } finally {
            setSaving(null)
        }
    }

    if (loading) return <div className="p-8 text-gray-500">Loading integrations...</div>

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Mill Integrations</h1>
                <p className="text-sm text-gray-500 mt-1">Manage system connections for Mill ID: {params.millId}</p>
            </div>

            <div className="space-y-6">
                {INTEGRATION_TYPES.map(def => {
                    const existing = configs.find(c => c.systemType === def.type)
                    return (
                        <div key={def.type} className="bg-white shadow rounded-lg overflow-hidden border">
                            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                                <h3 className="font-medium text-gray-900">{def.name}</h3>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border">
                                    Disabled
                                </span>
                            </div>

                            <form onSubmit={(e) => handleSave(e, def.type)} className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
                                        <input
                                            name="endpointUrl"
                                            type="text"
                                            defaultValue={existing?.endpointUrl || ''}
                                            className="w-full border rounded p-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Auth Type</label>
                                        <input
                                            name="authType"
                                            type="text"
                                            defaultValue={existing?.authType || 'BEARER_TOKEN'}
                                            className="w-full border rounded p-2 text-sm"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Auth Key (Secret)</label>
                                        <input
                                            name="authKey"
                                            type="password"
                                            defaultValue={existing?.authKey || ''}
                                            className="w-full border rounded p-2 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={saving === def.type}
                                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {saving === def.type ? 'Saving...' : 'Update as Aggregator'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
