export default function AggregatorMassBalancePage({
    params,
}: {
    params: { companyId: string; checklistId: string }
}) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500">Mill: {params.companyId} / Checklist: {params.checklistId}</p>
                    <h1 className="text-2xl font-bold text-gray-900">Mass Balance Review</h1>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Opening</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cert In</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cert Out</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Closing</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {['FFB', 'CPO'].map((mt) => (
                            <tr key={mt}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mt}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">0.00</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">0.00</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">0.00</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 text-right">0.00</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        Valid
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {/* Example of a discrepancy row */}
                        <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">PK</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">10.00</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">5.00</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold text-right">20.00</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 text-right">-5.00</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                    Overscheduled
                                </span>
                                <button className="ml-2 text-xs text-blue-600 hover:text-blue-800">Override</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}
