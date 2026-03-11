import { getSessionUser } from '@/lib/auth'
import UserMenu from '@/components/UserMenu'

export default async function AuditorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getSessionUser()

    return (
        <div className="flex bg-gray-50 min-h-screen">
            <aside className="w-64 bg-white border-r p-4 flex flex-col">
                <h2 className="font-bold mb-1 text-gray-900">Auditor Panel</h2>
                <p className="text-xs text-gray-400 mb-4">External Audit Portal</p>
                <nav className="space-y-2 text-sm text-gray-700 flex-1">
                    <a href="/auditor/dashboard" className="block p-2 hover:bg-gray-100 rounded">Dashboard</a>
                    <a href="/auditor/audits" className="block p-2 hover:bg-gray-100 rounded">My Audits</a>
                </nav>
                {user && <UserMenu name={user.name} email={user.email} role={user.role} />}
            </aside>
            <main className="flex-1 p-8">
                {children}
            </main>
        </div>
    )
}
