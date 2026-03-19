import { ChecklistItemComments } from '@/components/checklist-item-comments'
import { ChecklistItemDataEntry } from '@/components/checklist-item-data-entry'
import { ChecklistItemDocuments } from '@/components/checklist-item-documents'
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

                    <ChecklistItemDocuments itemId={params.itemId} />
                </div>

                {/* Comment Thread + Status */}
                <div className="space-y-4">
                    <ChecklistItemStatus itemId={params.itemId} />

                    <ChecklistItemComments itemId={params.itemId} />
                </div>
            </div>
        </div>
    )
}
