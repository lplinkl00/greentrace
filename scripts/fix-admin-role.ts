import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
    const { data, error } = await supabase.auth.admin.updateUserById(
        'e580ca97-4d6a-4bed-b3ff-451ec665dc87',
        { user_metadata: { role: 'SUPER_ADMIN' } }
    )

    if (error) {
        console.error('Error:', error.message)
        process.exit(1)
    } else {
        console.log('Success! Updated user_metadata.role =', data.user?.user_metadata?.role)
    }
}

main()
