import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function setupStorage() {
    const buckets = [
        { id: 'documents', public: false, fileSizeLimit: 52428800 },   // 50MB
        { id: 'imports', public: false, fileSizeLimit: 52428800 },     // 50MB
        { id: 'reports', public: false, fileSizeLimit: 104857600 },    // 100MB
    ]

    for (const bucket of buckets) {
        const { data, error } = await supabase.storage.createBucket(bucket.id, {
            public: bucket.public,
            fileSizeLimit: bucket.fileSizeLimit,
        })
        if (error && error.message !== 'The resource already exists') {
            console.error(`Failed to create bucket "${bucket.id}":`, error.message)
        } else {
            console.log(`Bucket "${bucket.id}" ready.`)
        }
    }
}

setupStorage()
