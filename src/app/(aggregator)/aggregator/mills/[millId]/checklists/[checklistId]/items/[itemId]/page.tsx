export default function AggregatorChecklistItemDetailPage({
    params,
}: {
    params: { millId: string; checklistId: string; itemId: string }
}) {
    return (
        <div className="space-y-6">
            <div>
                <p className="text-sm text-gray-500">Mill: {params.millId} / Checklist: {params.checklistId}</p>
                <h1 className="text-2xl font-bold text-gray-900">Item Review</h1>
                <p className="text-sm text-gray-400 mt-1">Item: {params.itemId}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Read-only data view */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="font-semibold text-gray-800 mb-4">Data Entries (Read Only)</h2>
                        <p className="text-sm text-gray-500">No data entries yet.</p>
                    </div>
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="font-semibold text-gray-800 mb-4">Documents</h2>
                        <p className="text-sm text-gray-500">No documents uploaded.</p>
                    </div>
                </div>

                {/* Aggregator review controls */}
                <div className="space-y-4">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="font-semibold text-gray-800 mb-4">Aggregator Review</h2>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="reviewed" className="rounded" />
                                <label htmlFor="reviewed" className="text-sm text-gray-700">Mark as reviewed</label>
                            </div>
                            <button className="w-full px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700">
                                Confirm Review
                            </button>
                        </div>
                    </div>
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="font-semibold text-gray-800 mb-4">Comments</h2>
                        <div className="space-y-3 text-sm text-gray-500">
                            <p>No comments yet.</p>
                        </div>
                        <div className="mt-4 border-t pt-4">
                            <textarea className="w-full border rounded-md p-2 text-sm" rows={2} placeholder="Add review comment…" />
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
