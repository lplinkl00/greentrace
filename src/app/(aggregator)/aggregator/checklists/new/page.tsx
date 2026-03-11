export default function NewChecklistPage() {
    return (
        <div className="space-y-6 max-w-xl">
            <h1 className="text-2xl font-bold text-gray-900">Assign Regulation to Mill</h1>
            <div className="bg-white shadow rounded-lg p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Mill</label>
                    <select className="mt-1 block w-full border rounded-md p-2 text-sm">
                        <option value="">Select a mill…</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Regulation Profile</label>
                    <select className="mt-1 block w-full border rounded-md p-2 text-sm">
                        <option value="">Select a profile…</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Period Start</label>
                        <input type="date" className="mt-1 block w-full border rounded-md p-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Period End</label>
                        <input type="date" className="mt-1 block w-full border rounded-md p-2 text-sm" />
                    </div>
                </div>
                <button
                    type="submit"
                    className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                >
                    Create Checklist
                </button>
            </div>
        </div>
    )
}
