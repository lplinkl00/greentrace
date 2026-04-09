import { getSessionUser } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import SettingsClient from './SettingsClient'

const SAVE_ALLOWED_ROLES: UserRole[] = [
    UserRole.COMPANY_MANAGER,
    UserRole.AGGREGATOR_MANAGER,
    UserRole.SUPER_ADMIN,
]

export default async function CompanySettingsPage() {
    const user = await getSessionUser()
    const canSave = user ? SAVE_ALLOWED_ROLES.includes(user.role) : false
    return <SettingsClient canSave={canSave} />
}
