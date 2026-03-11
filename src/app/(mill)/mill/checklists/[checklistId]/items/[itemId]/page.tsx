export default function ChecklistItemDetailPage({
    params,
}: {
    params: { checklistId: string; itemId: string }
}) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <p className="text-sm text-gray-500">Checklist {params.checklistId}</p>
                <h1 className="text-2xl font-bold text-gray-900">Item Detail</h1>
                <p className="text-sm text-gray-400 mt-1">Item ID: {params.itemId}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Data Entry Form */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="font-semibold text-gray-800 mb-4">Data Entry</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Entry Type</label>
                                <select className="mt-1 block w-full border rounded-md p-2 text-sm">
                                    <option>FORM01 — Absolute Quantity</option>
                                    <option>FORM02 — Rate</option>
                                    <option>Document Only</option>
                                    <option>Text Response</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Value</label>
                                    <input type="number" step="0.01" className="mt-1 block w-full border rounded-md p-2 text-sm" placeholder="Enter value" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Unit</label>
                                    <input type="text" className="mt-1 block w-full border rounded-md p-2 text-sm" placeholder="e.g. tCO2e, MWh" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Emission Factor</label>
                                <select className="mt-1 block w-full border rounded-md p-2 text-sm">
                                    <option value="">Select emission factor (optional)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Reporting Month</label>
                                <input type="month" className="mt-1 block w-full border rounded-md p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Notes</label>
                                <textarea className="mt-1 block w-full border rounded-md p-2 text-sm" rows={3} />
                            </div>
                            <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700">
                                Save Entry
                            </button>
                        </div>
                    </div>

                    {/* Document Upload */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="font-semibold text-gray-800 mb-4">Documents</h2>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <p className="text-sm text-gray-500">Drag & drop files here, or click to browse</p>
                            <p className="text-xs text-gray-400 mt-1">PDF, JPEG, PNG, XLSX, CSV, DOCX — max 25 MB</p>
                            <input type="file" className="mt-2" />
                        </div>
                        <div className="mt-4 text-sm text-gray-500">No documents uploaded yet.</div>
                    </div>
                </div>

                {/* Comment Thread + Status */}
                <div className="space-y-4">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="font-semibold text-gray-800 mb-4">Status</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Status</span>
                                <span className="font-medium">Not Started</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Assignee</span>
                                <span className="font-medium">Unassigned</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Due Date</span>
                                <span className="font-medium text-green-600">On Track</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="font-semibold text-gray-800 mb-4">Comments</h2>
                        <div className="space-y-3 text-sm text-gray-500">
                            <p>No comments yet.</p>
                        </div>
                        <div className="mt-4 border-t pt-4">
                            <textarea className="w-full border rounded-md p-2 text-sm" rows={2} placeholder="Add a comment…" />
                            <button className="mt-2 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700">
                                Post
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
