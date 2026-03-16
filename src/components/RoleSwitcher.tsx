'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

type Mill = { id: string; name: string; code: string }
type View = 'aggregator' | 'mill' | 'auditor'

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
    mill: 'Mill',
    auditor: 'Auditor',
}

export default function RoleSwitcher() {
    const router = useRouter()
    const [activeView, setActiveView] = useState<View>('aggregator')
    const [showMillPicker, setShowMillPicker] = useState(false)
    const [mills, setMills] = useState<Mill[]>([])
    const [selectedMill, setSelectedMill] = useState<Mill | null>(null)
    const [loadingMills, setLoadingMills] = useState(false)

    useEffect(() => {
        const view = getCookie('activeView') as View
        if (view) setActiveView(view)
    }, [])

    async function handleViewSelect(view: View) {
        if (view === 'mill') {
            setShowMillPicker(true)
            if (mills.length === 0) {
                setLoadingMills(true)
                const res = await fetch('/api/mills')
                const data = await res.json()
                setMills(data.data ?? [])
                setLoadingMills(false)
            }
            return
        }
        setCookie('activeView', view)
        setActiveView(view)
        router.push(view === 'auditor' ? '/auditor/dashboard' : '/aggregator/dashboard')
    }

    function confirmMillSelection() {
        if (!selectedMill) return
        setCookie('activeView', 'mill')
        setCookie('activeMillId', selectedMill.id)
        setActiveView('mill')
        setShowMillPicker(false)
        router.push('/mill/dashboard')
    }

    const views: View[] = ['aggregator', 'mill', 'auditor']

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

            {showMillPicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl w-80 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-white">Select Mill</h3>
                            <button onClick={() => setShowMillPicker(false)} className="text-zinc-500 hover:text-zinc-300 transition">
                                <X size={16} />
                            </button>
                        </div>

                        {loadingMills ? (
                            <div className="flex justify-center py-6">
                                <div className="w-5 h-5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                {mills.map(mill => (
                                    <button
                                        key={mill.id}
                                        onClick={() => setSelectedMill(mill)}
                                        className={[
                                            'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors',
                                            selectedMill?.id === mill.id
                                                ? 'bg-orange-500/20 text-orange-400'
                                                : 'text-zinc-300 hover:bg-white/5',
                                        ].join(' ')}
                                    >
                                        <span className="font-medium">{mill.name}</span>
                                        <span className="text-xs text-zinc-500 ml-2">{mill.code}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={confirmMillSelection}
                            disabled={!selectedMill}
                            className="mt-4 w-full py-2 rounded-lg text-white text-sm font-semibold bg-sunset-gradient hover:opacity-90 transition disabled:opacity-40"
                        >
                            View as Mill
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
