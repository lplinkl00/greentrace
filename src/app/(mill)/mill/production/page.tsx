import { getSessionUser } from '@/lib/auth'
import { getProductionRecords, calcOer, calcKer } from '@/lib/production'
import { redirect } from 'next/navigation'
import { Factory, Plus } from 'lucide-react'
import Link from 'next/link'
import { Prisma } from '@prisma/client'

export default async function MillProductionPage() {
    const user = await getSessionUser()
    if (!user?.companyId) redirect('/login')

    const records = await getProductionRecords(user.companyId)

    // Summary stats
    const totalFfb = records.reduce(
        (sum, r) => sum.add(r.ffbReceivedMt),
        new Prisma.Decimal(0),
    )
    const avgOer = records.length > 0
        ? records.reduce((sum, r) => sum + calcOer(r.ffbReceivedMt, r.cpoProducedMt), 0) / records.length
        : 0
    const avgKer = records.length > 0
        ? records.reduce((sum, r) => sum + calcKer(r.ffbReceivedMt, r.pkoProducedMt), 0) / records.length
        : 0

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">Production Records</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">Daily FFB intake and CPO/PKO output logs.</p>
                </div>
                <Link
                    href="/company/production/new"
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                >
                    <Plus size={14} /> New Record
                </Link>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total FFB Received', value: `${Number(totalFfb).toLocaleString(undefined, { maximumFractionDigits: 1 })} MT` },
                    { label: 'Avg OER', value: records.length > 0 ? `${avgOer.toFixed(2)}%` : '—' },
                    { label: 'Avg KER', value: records.length > 0 ? `${avgKer.toFixed(2)}%` : '—' },
                ].map(card => (
                    <div key={card.label} className="bg-white rounded-xl border border-zinc-100 shadow-card px-5 py-4">
                        <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium">{card.label}</p>
                        <p className="text-2xl font-bold text-zinc-900 mt-1">{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-zinc-50 bg-zinc-50/60">
                            {['Date', 'FFB (MT)', 'CPO (MT)', 'PKO (MT)', 'OER', 'KER', 'Notes'].map((h, i) => (
                                <th key={h} className={`px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide ${i >= 1 && i <= 5 ? 'text-right' : 'text-left'}`}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {records.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center">
                                    <Factory size={28} className="mx-auto mb-2 text-zinc-200" />
                                    <p className="text-sm text-zinc-400">No production records yet.</p>
                                </td>
                            </tr>
                        ) : records.map(r => {
                            const oer = calcOer(r.ffbReceivedMt, r.cpoProducedMt)
                            const ker = calcKer(r.ffbReceivedMt, r.pkoProducedMt)
                            return (
                                <tr key={r.id} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-6 py-3.5 text-zinc-400 text-xs whitespace-nowrap">
                                        {new Date(r.productionDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-3.5 text-right text-xs font-medium text-zinc-800 tabular-nums">
                                        {Number(r.ffbReceivedMt).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-3.5 text-right text-xs font-medium text-orange-600 tabular-nums">
                                        {Number(r.cpoProducedMt).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-3.5 text-right text-xs font-medium text-blue-600 tabular-nums">
                                        {Number(r.pkoProducedMt).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-3.5 text-right text-xs text-zinc-500 tabular-nums">{oer.toFixed(2)}%</td>
                                    <td className="px-6 py-3.5 text-right text-xs text-zinc-500 tabular-nums">{ker.toFixed(2)}%</td>
                                    <td className="px-6 py-3.5 text-xs text-zinc-400 max-w-xs truncate">{r.notes ?? '—'}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
