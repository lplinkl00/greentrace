import { getSessionUser } from '@/lib/auth'
import { getShipments } from '@/lib/shipments'
import { redirect } from 'next/navigation'
import { MaterialType } from '@prisma/client'

const MATERIAL_LABELS: Partial<Record<MaterialType, string>> = {
    FFB:                           'FFB',
    CRUDE_PALM_OIL:                'CPO',
    PALM_KERNEL_OIL:               'PKO',
    PALM_KERNEL_EXPELLER:          'PKE',
    PALM_FATTY_ACID_DISTILLATE:    'PFAD',
    REFINED_BLEACHED_DEODORISED_OIL: 'RBDO',
}

const MONTHS = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' },   { value: '04', label: 'April' },
    { value: '05', label: 'May' },     { value: '06', label: 'June' },
    { value: '07', label: 'July' },    { value: '08', label: 'August' },
    { value: '09', label: 'September' },{ value: '10', label: 'October' },
    { value: '11', label: 'November' },{ value: '12', label: 'December' },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

export default async function MillShipmentsPage({
    searchParams,
}: {
    searchParams: { materialType?: string; year?: string; month?: string }
}) {
    const user = await getSessionUser()
    if (!user?.millId) redirect('/login')

    const shipments = await getShipments({
        millId: user.millId,
        materialType: searchParams.materialType as MaterialType | undefined,
        year: searchParams.year,
        month: searchParams.month,
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Shipment Records</h1>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700">
                        Add Manual Record
                    </button>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col">
                {/* Filters bar — GET form so filters work without JS */}
                <form method="GET" className="bg-gray-50 px-6 py-3 border-b flex gap-4 items-center">
                    <select name="materialType" defaultValue={searchParams.materialType ?? ''} className="border-gray-300 rounded-md text-sm py-1">
                        <option value="">All Materials</option>
                        {Object.entries(MATERIAL_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                    <select name="year" defaultValue={searchParams.year ?? ''} className="border-gray-300 rounded-md text-sm py-1">
                        <option value="">All Years</option>
                        {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                    </select>
                    <select name="month" defaultValue={searchParams.month ?? ''} className="border-gray-300 rounded-md text-sm py-1">
                        <option value="">All Months</option>
                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <button type="submit" className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-100">
                        Filter
                    </button>
                    <a href="/mill/shipments" className="text-xs text-gray-500 hover:text-gray-700">Clear</a>
                </form>

                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref No</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Volume (MT)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cert Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DA Flag</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {shipments.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                                    No shipments recorded yet.
                                </td>
                            </tr>
                        ) : shipments.map(s => {
                            const needsAllocation = s.isccAllocationPct !== null && s.allocationConfirmedAt === null
                            return (
                                <tr key={s.id} className={needsAllocation ? 'bg-red-50' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(s.shipmentDate).toLocaleDateString()}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${needsAllocation ? 'text-red-600' : 'text-gray-900'}`}>
                                        {s.referenceNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {MATERIAL_LABELS[s.materialType as keyof typeof MATERIAL_LABELS] ?? s.materialType}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                        {Number(s.volumeMt).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {s.certificationStatus}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            s.source === 'CSV_IMPORT' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {s.source === 'CSV_IMPORT' ? 'Import' : 'Manual'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {needsAllocation ? (
                                            <button className="text-red-600 font-medium hover:text-red-800 underline text-xs">
                                                Resolve Allocation
                                            </button>
                                        ) : (
                                            <span className="text-gray-400">—</span>
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
