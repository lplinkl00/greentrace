import { MaterialType } from '@prisma/client'

export default function CompanyMassBalancePage({
    params,
}: {
    params: { checklistId: string }
}) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500">Checklist {params.checklistId}</p>
                    <h1 className="text-2xl font-bold text-gray-900">Mass Balance</h1>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
                        Confirm Opening Stock
                    </button>
                    <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700">
                        Save All
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['FFB', 'CPO', 'PK', 'PKO', 'POME', 'EFB'].map((mt) => (
                    <div key={mt} className="bg-white shadow rounded-lg p-6">
                        <h2 className="font-semibold text-gray-800 mb-4">{mt}</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Opening Stock</label>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-lg font-medium">0.00 MT</span>
                                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Unconfirmed</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase">Certified In</label>
                                    <input type="number" step="0.01" className="mt-1 block w-full border rounded-md p-2 text-sm" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase">Non-Cert In</label>
                                    <input type="number" step="0.01" className="mt-1 block w-full border rounded-md p-2 text-sm" placeholder="0.00" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase">Certified Out</label>
                                    <input type="number" step="0.01" className="mt-1 block w-full border rounded-md p-2 text-sm" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase">Non-Cert Out</label>
                                    <input type="number" step="0.01" className="mt-1 block w-full border rounded-md p-2 text-sm" placeholder="0.00" />
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <label className="block text-sm font-medium text-gray-700">Closing Stock</label>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-lg font-medium text-blue-600">0.00 MT</span>
                                    <span className="text-xs text-gray-500">Auto-calculated</span>
                                </div>
                            </div>

                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
