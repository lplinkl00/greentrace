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
    { type: 'SAP', name: 'SAP ERP', description: 'Connect to SAP S/4HANA or ECC for mass balance and shipment synchronization.' },
    { type: 'WEIGHBRIDGE_GENERIC', name: 'Generic Weighbridge', description: 'Synchronize direct scale tickets and FFB delivery records.' },
    { type: 'ERP_GENERIC', name: 'Generic ERP API', description: 'Standardized REST API for custom ERP integration.' },
    { type: 'CUSTOM_API', name: 'Custom Developer API', description: 'Webhooks and custom endpoints for in-house systems.' }
]

export default function MillSettingsPage() {
    const [configs, setConfigs] = useState<IntegrationConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null) // systemType being saved

    useEffect(() => {
        fetchConfigs()
    }, [])

    const fetchConfigs = async () => {
        try {
            const res = await fetch('/api/integration-configs')
            const data = await res.json()
            if (data.data) {
                setConfigs(data.data)
            }
        } catch (e) {
            console.error('Failed to load configs', e)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent<HTMLFormElement>, systemType: string) => {
        e.preventDefault()
        setSaving(systemType)

        const formData = new FormData(e.currentTarget)
        const payload = {
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
        } catch (err) {
            console.error('Failed to save config', err)
        } finally {
            setSaving(null)
        }
    }

    if (loading) return <div className="p-8 text-gray-500">Loading settings...</div>

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Mill Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Configure your integrations and automated data sync connections.</p>
            </div>

            <div className="space-y-6">
                {INTEGRATION_TYPES.map(def => {
                    const existing = configs.find(c => c.systemType === def.type)
                    return (
                        <div key={def.type} className="bg-white shadow rounded-lg overflow-hidden border">
                            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                                <div>
                                    <h3 className="font-medium text-gray-900">{def.name}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{def.description}</p>
                                </div>
                                <div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border">
                                        Status: Disabled (Preview)
                                    </span>
                                </div>
                            </div>

                            <form onSubmit={(e) => handleSave(e, def.type)} className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
                                        <input
                                            name="endpointUrl"
                                            type="url"
                                            defaultValue={existing?.endpointUrl || ''}
                                            placeholder="https://api.example.com/v1"
                                            className="w-full border rounded p-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sync Frequency</label>
                                        <select
                                            name="syncFrequency"
                                            defaultValue={existing?.syncFrequency || 'HOURLY'}
                                            className="w-full border rounded p-2 text-sm bg-white"
                                        >
                                            <option value="REALTIME">Real-time (Webhooks)</option>
                                            <option value="HOURLY">Hourly Batch</option>
                                            <option value="DAILY">Daily Batch</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Authentication Type</label>
                                        <select
                                            name="authType"
                                            defaultValue={existing?.authType || 'BEARER_TOKEN'}
                                            className="w-full border rounded p-2 text-sm bg-white"
                                        >
                                            <option value="BEARER_TOKEN">Bearer Token</option>
                                            <option value="API_KEY">API Key in Header</option>
                                            <option value="OAUTH2">OAuth 2.0</option>
                                            <option value="BASIC">Basic Auth</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Authentication Key / Secret</label>
                                        <input
                                            name="authKey"
                                            type="password"
                                            defaultValue={existing?.authKey || ''}
                                            placeholder="••••••••••••••••"
                                            className="w-full border rounded p-2 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t">
                                    <button
                                        type="button"
                                        disabled
                                        title="Live connections are disabled in this environment"
                                        className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
                                    >
                                        Test Connection
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving === def.type}
                                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                    >
                                        {saving === def.type ? 'Saving...' : 'Save Configuration'}
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
