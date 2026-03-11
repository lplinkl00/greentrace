export default function MillShipmentsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Shipment Records</h1>
                <div className="flex gap-2">
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
                        Filter
                    </button>
                    <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700">
                        Add Manual Record
                    </button>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col">
                {/* Filters bar */}
                <div className="bg-gray-50 px-6 py-3 border-b flex gap-4">
                    <select className="border-gray-300 rounded-md text-sm py-1">
                        <option>All Materials</option>
                        <option>CPO</option>
                        <option>PK</option>
                    </select>
                    <select className="border-gray-300 rounded-md text-sm py-1">
                        <option>All Months</option>
                        <option>March 2024</option>
                        <option>February 2024</option>
                    </select>
                </div>

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
                        <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2024-03-15</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">DO-9921</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">CPO</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">30.50</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">ISCC_CERTIFIED</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    Import
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className="text-gray-400">—</span>
                            </td>
                        </tr>
                        {/* Double accounting example */}
                        <tr className="bg-red-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2024-03-16</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">WB-8812</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">CPO</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">45.00</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">MIXED</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                    Manual
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <button className="text-red-600 font-medium hover:text-red-800 underline text-xs">
                                    Resolve Allocation
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}
