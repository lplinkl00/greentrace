import { getSessionUser } from '@/lib/auth'
import { getImportJobs } from '@/lib/imports'
import { redirect } from 'next/navigation'
import { ImportStatus } from '@prisma/client'
import { Upload, Package } from 'lucide-react'
import Link from 'next/link'

const STATUS_STYLES: Record<ImportStatus, { bg: string; color: string }> = {
    PENDING:         { bg: '#fef9c3', color: '#92400e' },
    PROCESSING:      { bg: '#eff6ff', color: '#2563eb' },
    NEEDS_MAPPING:   { bg: '#faf5ff', color: '#7e22ce' },
    COMPLETED:       { bg: '#f0fdf4', color: '#15803d' },
    PARTIAL_SUCCESS: { bg: '#fff7ed', color: '#c2410c' },
    FAILED:          { bg: '#fef2f2', color: '#dc2626' },
}

export default async function MillImportsPage() {
    const user = await getSessionUser()
    if (!user?.millId) redirect('/login')

    const jobs = await getImportJobs(user.millId)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900">Shipment Imports</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">Upload and manage CSV imports for shipment records.</p>
                </div>
                <Link
                    href="/mill/imports/new"
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                >
                    <Upload size={14} /> New Import
                </Link>
            </div>

            <div className="bg-white rounded-xl border border-zinc-100 shadow-card overflow-hidden">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-zinc-50 bg-zinc-50/60">
                            {['Date', 'File Name', 'Status', 'Imported', 'Failed', 'Total'].map((h, i) => (
                                <th key={h} className={`px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide ${i >= 3 ? 'text-right' : 'text-left'}`}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {jobs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center">
                                    <Package size={28} className="mx-auto mb-2 text-zinc-200" />
                                    <p className="text-sm text-zinc-400">No imports yet.</p>
                                </td>
                            </tr>
                        ) : jobs.map(job => {
                            const s = STATUS_STYLES[job.status] ?? STATUS_STYLES.PENDING
                            const successRate = job.rowCountTotal > 0
                                ? Math.round((job.rowCountImported / job.rowCountTotal) * 100)
                                : 0
                            return (
                                <tr key={job.id} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-6 py-3.5 text-zinc-400 text-xs whitespace-nowrap">
                                        {new Date(job.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3.5 font-medium text-zinc-800 text-xs">
                                        {job.fileName}
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                            style={{ backgroundColor: s.bg, color: s.color }}>
                                            {job.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                        <span className="text-xs font-medium text-green-600 tabular-nums">{job.rowCountImported}</span>
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                        <span className={`text-xs font-medium tabular-nums ${job.rowCountFailed > 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                                            {job.rowCountFailed}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-xs text-zinc-500 tabular-nums">{job.rowCountTotal}</span>
                                            {job.rowCountTotal > 0 && (
                                                <div className="w-12 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-green-500"
                                                        style={{ width: `${successRate}%` }} />
                                                </div>
                                            )}
                                        </div>
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
