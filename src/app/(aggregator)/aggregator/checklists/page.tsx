export default function ChecklistsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Checklists</h1>
                <a
                    href="/checklists/new"
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                >
                    Assign Regulation to Mill
                </a>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
                <p className="text-sm text-gray-500">
                    Assign a regulation profile to a mill for a specific reporting period.
                    The system will auto-generate one checklist item per active requirement.
                </p>
                <div className="mt-6 border rounded divide-y">
                    <div className="px-4 py-3 flex gap-4 text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        <span className="flex-1">Mill</span>
                        <span className="flex-1">Regulation</span>
                        <span className="flex-1">Period</span>
                        <span className="flex-1">Status</span>
                    </div>
                    <div className="px-4 py-3 text-sm text-gray-500">
                        No checklists yet.
                    </div>
                </div>
            </div>
        </div>
    )
}
