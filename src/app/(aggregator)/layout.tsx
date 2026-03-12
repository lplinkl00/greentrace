import { getSessionUser } from '@/lib/auth'
import UserMenu from '@/components/UserMenu'

export default async function AggregatorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getSessionUser()

    return (
        <div className="flex bg-gray-50 min-h-screen">
            <aside className="w-64 bg-white border-r p-4 flex flex-col">
                <h2 className="font-bold mb-4">Aggregator Panel</h2>
                <nav className="space-y-2 text-sm text-gray-700 flex-1">
                    <a href="/aggregator/dashboard" className="block p-2 hover:bg-gray-100 rounded">Dashboard</a>
                    <a href="/aggregator/mills" className="block p-2 hover:bg-gray-100 rounded">Mills</a>
                    <a href="/aggregator/checklists" className="block p-2 hover:bg-gray-100 rounded">Checklists</a>
                    <a href="/aggregator/users" className="block p-2 hover:bg-gray-100 rounded">Users</a>
                </nav>
                {user && <UserMenu name={user.name} email={user.email} role={user.role} />}
            </aside>
            <main className="flex-1 p-8">
                {children}
            </main>
        </div>
    )
}
