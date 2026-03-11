export default function RegulationProfilesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Regulation Profiles</h1>
                <a
                    href="/regulation-profiles/new"
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                >
                    New Profile
                </a>
            </div>
            <div className="bg-white shadow rounded-lg">
                <p className="p-6 text-sm text-gray-500">
                    Regulation profiles define the pillars, categories, and requirements that mills must track.
                    Profiles are versioned — each checklist is pinned to the profile version it was created from.
                </p>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Regulation</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        <tr>
                            <td className="px-6 py-4 text-sm text-gray-900" colSpan={4}>
                                No profiles yet — create one to get started.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}
