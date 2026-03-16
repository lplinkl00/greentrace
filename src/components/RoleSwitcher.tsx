'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

type Company = { id: string; name: string; code: string }
type View = 'aggregator' | 'company' | 'auditor'

function getCookie(name: string): string {
    if (typeof document === 'undefined') return ''
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    return match ? decodeURIComponent(match[2]) : ''
}

function setCookie(name: string, value: string) {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 30}`
}

const VIEW_LABELS: Record<View, string> = {
    aggregator: 'Aggregator',
    company: 'Company',
    auditor: 'Auditor',
}

export default function RoleSwitcher() {
    const router = useRouter()
    const [activeView, setActiveView] = useState<View>('aggregator')
    const [showCompanyPicker, setShowCompanyPicker] = useState(false)
    const [companies, setCompanies] = useState<Company[]>([])
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
    const [loadingCompanies, setLoadingCompanies] = useState(false)

    useEffect(() => {
        const view = getCookie('activeView') as View
        if (view) setActiveView(view)
    }, [])

    async function handleViewSelect(view: View) {
        if (view === 'company') {
            setShowCompanyPicker(true)
            if (companies.length === 0) {
                setLoadingCompanies(true)
                const res = await fetch('/api/companies')
                const data = await res.json()
                setCompanies(data.data ?? [])
                setLoadingCompanies(false)
            }
            return
        }
        setCookie('activeView', view)
        setActiveView(view)
        router.push(view === 'auditor' ? '/auditor/dashboard' : '/aggregator/dashboard')
    }

    function confirmCompanySelection() {
        if (!selectedCompany) return
        setCookie('activeView', 'company')
        setCookie('activeCompanyId', selectedCompany.id)
        setActiveView('company')
        setShowCompanyPicker(false)
        router.push('/company/dashboard')
    }

    const views: View[] = ['aggregator', 'company', 'auditor']

    return (
        <>
            <div className="flex rounded-md overflow-hidden border border-white/10 text-xs font-medium mt-3 mx-0.5">
                {views.map(view => (
                    <button
                        key={view}
                        onClick={() => handleViewSelect(view)}
                        className={[
                            'flex-1 py-1.5 transition-colors truncate',
                            activeView === view
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5',
                        ].join(' ')}
                    >
                        {VIEW_LABELS[view]}
                    </button>
                ))}
            </div>

            {showCompanyPicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl w-80 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-white">Select Company</h3>
                            <button onClick={() => setShowCompanyPicker(false)} className="text-zinc-500 hover:text-zinc-300 transition">
                                <X size={16} />
                            </button>
                        </div>

                        {loadingCompanies ? (
                            <div className="flex justify-center py-6">
                                <div className="w-5 h-5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                {companies.map(company => (
                                    <button
                                        key={company.id}
                                        onClick={() => setSelectedCompany(company)}
                                        className={[
                                            'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors',
                                            selectedCompany?.id === company.id
                                                ? 'bg-orange-500/20 text-orange-400'
                                                : 'text-zinc-300 hover:bg-white/5',
                                        ].join(' ')}
                                    >
                                        <span className="font-medium">{company.name}</span>
                                        <span className="text-xs text-zinc-500 ml-2">{company.code}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={confirmCompanySelection}
                            disabled={!selectedCompany}
                            className="mt-4 w-full py-2 rounded-lg text-white text-sm font-semibold bg-sunset-gradient hover:opacity-90 transition disabled:opacity-40"
                        >
                            View as Company
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
