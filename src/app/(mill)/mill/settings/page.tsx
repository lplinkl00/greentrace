'use client'

import { useState, useEffect } from 'react'
import { Settings, Wifi, WifiOff } from 'lucide-react'

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
    { type: 'CUSTOM_API', name: 'Custom Developer API', description: 'Webhooks and custom endpoints for in-house systems.' },
]

const inputClass = 'w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400/60 transition'

export default function MillSettingsPage() {
    const [configs, setConfigs] = useState<IntegrationConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)

    useEffect(() => { fetchConfigs() }, [])

    const fetchConfigs = async () => {
        try {
            const res = await fetch('/api/integration-configs')
            const data = await res.json()
            if (data.data) setConfigs(data.data)
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
            syncFrequency: formData.get('syncFrequency')?.toString(),
        }
        try {
            await fetch('/api/integration-configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            await fetchConfigs()
        } finally {
            setSaving(null)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
        </div>
    )

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-xl font-bold text-zinc-900">Mill Settings</h1>
                <p className="text-sm text-zinc-400 mt-0.5">Configure your integrations and automated data sync connections.</p>
            </div>

            <div className="space-y-4">
                {INTEGRATION_TYPES.map(def => {
                    const existing = configs.find(c => c.systemType === def.type)
                    const isActive = existing?.isActive ?? false
                    return (
                        <div key={def.type} className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-zinc-100">
                                        <Settings size={16} className="text-zinc-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-zinc-800 text-sm">{def.name}</h3>
                                        <p className="text-xs text-zinc-400 mt-0.5">{def.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                                    style={isActive ? { backgroundColor: '#f0fdf4', color: '#15803d' } : { backgroundColor: '#f4f4f5', color: '#71717a' }}>
                                    {isActive ? <Wifi size={11} /> : <WifiOff size={11} />}
                                    {isActive ? 'Active' : 'Disabled'}
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={e => handleSave(e, def.type)} className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Endpoint URL</label>
                                        <input name="endpointUrl" type="url"
                                            defaultValue={existing?.endpointUrl || ''}
                                            placeholder="https://api.example.com/v1"
                                            className={inputClass} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Sync Frequency</label>
                                        <select name="syncFrequency" defaultValue={existing?.syncFrequency || 'HOURLY'}
                                            className={inputClass}>
                                            <option value="REALTIME">Real-time (Webhooks)</option>
                                            <option value="HOURLY">Hourly Batch</option>
                                            <option value="DAILY">Daily Batch</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Auth Type</label>
                                        <select name="authType" defaultValue={existing?.authType || 'BEARER_TOKEN'}
                                            className={inputClass}>
                                            <option value="BEARER_TOKEN">Bearer Token</option>
                                            <option value="API_KEY">API Key in Header</option>
                                            <option value="OAUTH2">OAuth 2.0</option>
                                            <option value="BASIC">Basic Auth</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Auth Key / Secret</label>
                                        <input name="authKey" type="password"
                                            defaultValue={existing?.authKey || ''}
                                            placeholder="••••••••••••••••"
                                            className={inputClass} />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" disabled
                                        className="px-4 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-400 bg-zinc-50 cursor-not-allowed">
                                        Test Connection
                                    </button>
                                    <button type="submit" disabled={saving === def.type}
                                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
                                        style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}>
                                        {saving === def.type ? 'Saving…' : 'Save Configuration'}
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
