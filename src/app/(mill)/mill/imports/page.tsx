import { getSessionUser } from '@/lib/auth'
import { getImportJobs } from '@/lib/imports'
import { redirect } from 'next/navigation'
import { ImportStatus } from '@prisma/client'

const STATUS_STYLES: Record<ImportStatus, string> = {
    PENDING:        'bg-yellow-100 text-yellow-800',
    PROCESSING:     'bg-blue-100 text-blue-800',
    NEEDS_MAPPING:  'bg-purple-100 text-purple-800',
    COMPLETED:      'bg-green-100 text-green-800',
    PARTIAL_SUCCESS:'bg-orange-100 text-orange-800',
    FAILED:         'bg-red-100 text-red-800',
}

export default async function MillImportsPage() {
    const user = await getSessionUser()
    if (!user?.millId) redirect('/login')

    const jobs = await getImportJobs(user.millId)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Shipment Imports</h1>
                <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700">
                    New Import
                </button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Imported</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Failed</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {jobs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                                    No imports yet.
                                </td>
                            </tr>
                        ) : jobs.map(job => (
                            <tr key={job.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(job.createdAt).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {job.fileName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_STYLES[job.status]}`}>
                                        {job.status.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{job.rowCountImported}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{job.rowCountFailed}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{job.rowCountTotal}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
