import { getSessionUser } from '@/lib/auth'
import { getShipments } from '@/lib/shipments'
import { redirect } from 'next/navigation'
import { MaterialType } from '@prisma/client'
import { Ship, AlertTriangle } from 'lucide-react'
import { AddShipmentButton } from '@/components/add-shipment-button'

const MATERIAL_LABELS: Partial<Record<MaterialType, string>> = {
    FFB: 'FFB',
    CRUDE_PALM_OIL: 'CPO',
    PALM_KERNEL_OIL: 'PKO',
    PALM_KERNEL_EXPELLER: 'PKE',
    PALM_FATTY_ACID_DISTILLATE: 'PFAD',
    REFINED_BLEACHED_DEODORISED_OIL: 'RBDO',
}

const MATERIAL_BADGE: Record<string, { bg: string; color: string }> = {
    FFB: { bg: '#f0fdf4', color: '#15803d' },
    CPO: { bg: '#fff7ed', color: '#c2410c' },
    PKO: { bg: '#eff6ff', color: '#2563eb' },
    PKE: { bg: '#faf5ff', color: '#7e22ce' },
    PFAD: { bg: '#fef9c3', color: '#92400e' },
    RBDO: { bg: '#f4f4f5', color: '#52525b' },
}

const MONTHS = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

export default async function CompanyShipmentsPage({
    searchParams,
}: {
    searchParams: { materialType?: string; year?: string; month?: string }
}) {
    const user = await getSessionUser()
    if (!user?.companyId) redirect('/login')

    const shipments = await getShipments({
        companyId: user.companyId,
        materialType: searchParams.materialType as MaterialType | undefined,
        year: searchParams.year,
        month: searchParams.month,
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">Company Trade &amp; Imports</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">Manage real-time palm oil compliance records and trade volumes.</p>
                </div>
                <AddShipmentButton companyId={user.companyId} />
            </div>

            <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                {/* Filters */}
                <form method="GET" className="flex flex-wrap gap-3 items-center px-6 py-3.5 border-b border-zinc-50 bg-zinc-50/40">
                    <select name="materialType" defaultValue={searchParams.materialType ?? ''}
                        className="text-xs border border-zinc-200 rounded-lg px-3 py-1.5 bg-white text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-400/30">
                        <option value="">All Sources</option>
                        {Object.entries(MATERIAL_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                    <select name="year" defaultValue={searchParams.year ?? ''}
                        className="text-xs border border-zinc-200 rounded-lg px-3 py-1.5 bg-white text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-400/30">
                        <option value="">All Years</option>
                        {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                    </select>
                    <select name="month" defaultValue={searchParams.month ?? ''}
                        className="text-xs border border-zinc-200 rounded-lg px-3 py-1.5 bg-white text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-400/30">
                        <option value="">All Months</option>
                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <button type="submit" className="text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition">
                        Filter
                    </button>
                    <a href="/company/shipments" className="text-xs text-zinc-400 hover:text-zinc-600 transition">Clear</a>
                </form>

                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-zinc-50 bg-zinc-50/40">
                            {['Date', 'Shipment ID', 'Type', 'Supplier / Buyer', 'Volume (MT)', 'Compliance Status', 'Actions'].map(h => (
                                <th key={h} className={`px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide ${h === 'Volume (MT)' ? 'text-right' : 'text-left'}`}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {shipments.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center">
                                    <Ship size={28} className="mx-auto mb-2 text-zinc-200" />
                                    <p className="text-sm text-zinc-400">No shipments recorded yet.</p>
                                </td>
                            </tr>
                        ) : shipments.map(s => {
                            const matLabel = MATERIAL_LABELS[s.materialType as keyof typeof MATERIAL_LABELS] ?? s.materialType
                            const matStyle = MATERIAL_BADGE[matLabel] ?? { bg: '#f4f4f5', color: '#52525b' }
                            const needsAllocation = s.isccAllocationPct !== null && s.allocationConfirmedAt === null

                            const certStyle: { bg: string; color: string; label: string } =
                                s.certificationStatus === 'CERTIFIED'
                                    ? { bg: '#f0fdf4', color: '#15803d', label: 'Certified' }
                                    : { bg: '#f4f4f5', color: '#71717a', label: 'Non-Certified' }

                            return (
                                <tr key={s.id} className={`hover:bg-zinc-50/50 transition-colors ${needsAllocation ? 'bg-red-50/40' : ''}`}>
                                    <td className="px-5 py-3.5 text-zinc-500 text-xs whitespace-nowrap">
                                        {new Date(s.shipmentDate).toLocaleDateString()}
                                    </td>
                                    <td className={`px-5 py-3.5 font-medium whitespace-nowrap text-xs ${needsAllocation ? 'text-red-600' : 'text-zinc-800'}`}>
                                        {s.referenceNumber}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
                                            style={{ backgroundColor: matStyle.bg, color: matStyle.color }}>
                                            {matLabel}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-zinc-600 text-xs whitespace-nowrap">
                                        {s.counterpartyName ?? '—'}
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-medium text-zinc-800 tabular-nums">
                                        {Number(s.volumeMt).toFixed(2)}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                            style={{ backgroundColor: certStyle.bg, color: certStyle.color }}>
                                            {certStyle.label}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        {needsAllocation ? (
                                            <button className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 transition">
                                                <AlertTriangle size={11} /> Resolve
                                            </button>
                                        ) : (
                                            <span className="text-zinc-300 text-xs">—</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
