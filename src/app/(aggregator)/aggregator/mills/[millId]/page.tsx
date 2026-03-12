export default function MillDetailPage({ params }: { params: { millId: string } }) {
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Mill {params.millId}</h1>
            <p>Mill details</p>
            <div>
                <a href={`/aggregator/mills/${params.millId}/integrations`} className="text-blue-600 hover:underline">Manage Integrations</a>
            </div>
        </div>
    )
}
