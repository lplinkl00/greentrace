import { getSessionUser } from '@/lib/auth'
import AppSidebar from '@/components/AppSidebar'

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
    const user = await getSessionUser()
    return (
        <div className="flex min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
            <AppSidebar role="company" user={user} />
            <main className="flex-1 p-8 overflow-auto min-w-0">{children}</main>
        </div>
    )
}
