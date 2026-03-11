export default function RegulationProfileDetailPage({
    params,
}: {
    params: { profileId: string }
}) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Profile: {params.profileId}</h1>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700">
                        Add Pillar
                    </button>
                </div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
                <p className="text-sm text-gray-500">
                    Requirement tree for this profile. Pillars → Categories → Requirements.
                </p>
                <div className="mt-4 space-y-4">
                    <div className="border rounded p-4">
                        <h2 className="font-semibold text-gray-800">Pillar placeholder</h2>
                        <div className="ml-4 mt-2 space-y-2">
                            <div className="border rounded p-3">
                                <h3 className="text-sm font-medium">Category placeholder</h3>
                                <div className="ml-4 mt-1 space-y-1 text-sm text-gray-600">
                                    <p>Requirement placeholder</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
