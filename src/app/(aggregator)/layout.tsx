export default function AggregatorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex bg-gray-50 min-h-screen">
            <aside className="w-64 bg-white border-r p-4">
                <h2 className="font-bold mb-4">Aggregator Panel</h2>
                <nav className="space-y-2 text-sm text-gray-700">
                    <a href="/aggregator/dashboard" className="block p-2 hover:bg-gray-100 rounded">Dashboard</a>
                    <a href="/aggregator/mills" className="block p-2 hover:bg-gray-100 rounded">Mills</a>
                    <a href="/aggregator/users" className="block p-2 hover:bg-gray-100 rounded">Users</a>
                </nav>
            </aside>
            <main className="flex-1 p-8">
                {children}
            </main>
        </div>
    )
}
