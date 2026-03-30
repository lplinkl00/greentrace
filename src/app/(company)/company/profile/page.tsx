'use client'

import { useState, useEffect } from 'react'
import { Building2, MapPin, Globe, Hash, Pencil, Check, X } from 'lucide-react'

type Company = {
    id: string
    name: string
    code: string
    location: string
    country: string
    latitude: number | null
    longitude: number | null
    isActive: boolean
}

const inputClass = 'w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400/60 transition'

export default function CompanyProfilePage() {
    const [company, setCompany]   = useState<Company | null>(null)
    const [loading, setLoading]   = useState(true)
    const [error, setError]       = useState<string | null>(null)
    const [editing, setEditing]   = useState(false)
    const [saving, setSaving]     = useState(false)
    const [canEdit, setCanEdit]   = useState(false)

    const [name,     setName]     = useState('')
    const [location, setLocation] = useState('')
    const [country,  setCountry]  = useState('')

    useEffect(() => { fetchProfile() }, [])

    const fetchProfile = async () => {
        setLoading(true)
        setError(null)
        try {
            const [profileRes, sessionRes] = await Promise.all([
                fetch('/api/companies/me'),
                fetch('/api/auth/me').catch(() => null),
            ])
            if (!profileRes.ok) {
                setError('Failed to load company profile.')
                return
            }
            const { data } = await profileRes.json()
            setCompany(data)
            setName(data.name)
            setLocation(data.location)
            setCountry(data.country)

            if (sessionRes?.ok) {
                const sd = await sessionRes.json().catch(() => ({}))
                const role = sd?.data?.role ?? ''
                setCanEdit(['COMPANY_MANAGER', 'SUPER_ADMIN', 'AGGREGATOR_MANAGER'].includes(role))
            }
        } catch {
            setError('Failed to load company profile.')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        try {
            const res = await fetch('/api/companies/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, location, country }),
            })
            if (!res.ok) {
                const d = await res.json().catch(() => ({}))
                setError(d.error?.message ?? 'Save failed.')
                return
            }
            const { data } = await res.json()
            setCompany(data)
            setEditing(false)
        } catch {
            setError('Network error. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        if (!company) return
        setName(company.name)
        setLocation(company.location)
        setCountry(company.country)
        setEditing(false)
        setError(null)
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
        </div>
    )

    if (error && !company) return (
        <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-sm text-red-600">{error}</div>
    )

    if (!company) return null

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">Company Profile</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">Your organisation&apos;s registered details.</p>
                </div>
                {canEdit && !editing && (
                    <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 rounded-lg px-3 py-1.5 transition"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">{error}</div>
            )}

            <div className="bg-white rounded-xl border border-zinc-100 shadow-sm divide-y divide-zinc-50">
                <div className="flex items-start gap-4 p-5">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-400 mb-1">Company Name</p>
                        {editing ? (
                            <input
                                className={inputClass}
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Company name"
                            />
                        ) : (
                            <p className="text-sm font-semibold text-zinc-900">{company.name}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-start gap-4 p-5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center flex-shrink-0">
                        <Hash className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-400 mb-1">Company Code</p>
                        <p className="text-sm font-mono text-zinc-700">{company.code}</p>
                    </div>
                </div>

                <div className="flex items-start gap-4 p-5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-400 mb-1">Location</p>
                        {editing ? (
                            <input
                                className={inputClass}
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                placeholder="Location"
                            />
                        ) : (
                            <p className="text-sm text-zinc-700">{company.location ?? '—'}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-start gap-4 p-5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center flex-shrink-0">
                        <Globe className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-400 mb-1">Country</p>
                        {editing ? (
                            <input
                                className={inputClass}
                                value={country}
                                onChange={e => setCountry(e.target.value)}
                                placeholder="Country"
                            />
                        ) : (
                            <p className="text-sm text-zinc-700">{company.country ?? '—'}</p>
                        )}
                    </div>
                </div>
            </div>

            {editing && (
                <div className="flex items-center gap-3 justify-end">
                    <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-lg px-3 py-1.5 transition disabled:opacity-50"
                    >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-lg px-3 py-1.5 transition disabled:opacity-50"
                    >
                        <Check className="w-3.5 h-3.5" />
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            )}
        </div>
    )
}
