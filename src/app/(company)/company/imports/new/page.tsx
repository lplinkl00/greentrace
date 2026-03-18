export default function CompanyImportWizardPage() {
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">New Import</h1>
                <p className="text-sm text-gray-500">Step 2: Map Columns</p>
            </div>

            <div className="bg-white shadow rounded-lg p-6 space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-lg font-medium">Map your CSV columns</h2>
                    <select className="border rounded-md p-2 text-sm">
                        <option>Load saved template...</option>
                        <option>Standard SAP Export</option>
                    </select>
                </div>

                <div className="space-y-4">
                    {/* Example mapping row */}
                    <div className="grid grid-cols-2 gap-4 items-center">
                        <div>
                            <p className="text-sm font-medium text-gray-700">GreenTrace Field <span className="text-red-500">*</span></p>
                            <p className="text-sm font-bold mt-1">Shipment Date</p>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 uppercase mb-1">CSV Column</label>
                            <select className="block w-full border rounded-md p-2 text-sm bg-gray-50">
                                <option>Select column</option>
                                <option selected>Delivery Date</option>
                                <option>Ticket No</option>
                                <option>Net Wt (MT)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-center border-t pt-4">
                        <div>
                            <p className="text-sm font-medium text-gray-700">GreenTrace Field <span className="text-red-500">*</span></p>
                            <p className="text-sm font-bold mt-1">Volume (MT)</p>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 uppercase mb-1">CSV Column</label>
                            <select className="block w-full border rounded-md p-2 text-sm bg-gray-50">
                                <option>Select column</option>
                                <option>Delivery Date</option>
                                <option>Ticket No</option>
                                <option selected>Net Wt (MT)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="border-t pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="saveTemplate" className="rounded" />
                        <label htmlFor="saveTemplate" className="text-sm text-gray-700">Save as new template</label>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
                        Process Import
                    </button>
                </div>
            </div>
        </div>
    )
}
