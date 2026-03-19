import { ChecklistItemDataEntry } from '@/components/checklist-item-data-entry'
import { ChecklistItemStatus } from '@/components/checklist-item-status'

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
                    <ChecklistItemDataEntry checklistId={params.checklistId} itemId={params.itemId} />

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
                    <ChecklistItemStatus itemId={params.itemId} />

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
