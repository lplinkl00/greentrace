# Prompt: GreenTrace — Supabase Cloud Integration & Deploy Prep

## Context

I'm building **GreenTrace**, a Next.js 14 App Router compliance platform. The codebase already has:
- Prisma schema at `prisma/schema.prisma` with all models defined
- Supabase client code in `src/lib/supabase.ts` and `src/lib/supabase-server.ts`
- Auth helpers in `src/lib/auth.ts`
- Middleware in `src/middleware.ts`
- Seed script in `prisma/seed.ts`
- API routes under `src/app/api/`
- `.env.local` with Supabase Cloud project URL, anon key, and service role key already set

Refer to `PLAN.md` for the authoritative specification. All tech choices are locked:
Bun runtime, Next.js 14, Prisma, Supabase (Auth + Storage + Postgres), Vercel deployment.

## Task

Complete the Supabase Cloud integration and prepare the project for GitHub + Vercel. Do each step in order. Verify each step works before moving to the next.

### Step 1: Fix the Prisma schema datasource

`prisma/schema.prisma` is missing `url` and `directUrl` in the datasource block. Fix it:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Do NOT remove or change the `prisma.config.ts` file — it can coexist.

### Step 2: Fix the middleware import bug

`src/middleware.ts` line 1 imports `NextResponse` and `NextRequest` from `'next/headers'`. This is wrong — they must come from `'next/server'`. Fix the import.

### Step 3: Update DATABASE_URL and DIRECT_URL in .env.local

The current `.env.local` has `DATABASE_URL` and `DIRECT_URL` pointing to `localhost:54326`. These need to point to the Supabase Cloud Postgres instance.

Ask me for the connection strings from my Supabase Dashboard (Settings > Database > Connection string). The format will be:
- `DATABASE_URL` = the **pooled** connection string (Transaction mode, port 6543), with `?pgbouncer=true` appended
- `DIRECT_URL` = the **direct** connection string (Session mode, port 5432)

Do NOT proceed until I provide these.

### Step 4: Sanitize .env files for Git safety

1. Rename the existing `.env` file to `.env.example`
2. Replace all real values in `.env.example` with placeholder descriptions:
   ```
   # Supabase
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
   NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

   # AI Providers
   ANTHROPIC_API_KEY="sk-ant-..."
   GOOGLE_AI_API_KEY="AIza..."

   # Application
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```
3. Remove the `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` line from `.env.local` — it's not used anywhere in the codebase and is not part of the PLAN.md spec
4. Update `.gitignore` to also ignore bare `.env` (add a line: `.env`)

### Step 5: Generate Prisma client and run initial migration

Run these commands in order:
```bash
bunx prisma generate
bunx prisma migrate dev --name init
```

Verify the migration succeeds by checking that a `prisma/migrations/` directory is created with a migration SQL file. Read the generated SQL and confirm it creates all the tables from the schema.

If the migration fails due to connection issues, report the exact error so we can debug the connection string.

### Step 6: Seed the database

The seed script uses `npx ts-node` which conflicts with the Bun-first approach. Update the `db:seed` script in `package.json` to:
```json
"db:seed": "bunx tsx prisma/seed.ts"
```

Then run:
```bash
bun run db:seed
```

Verify by confirming the seed output shows the organisation, profile, requirements, and emission factors were created.

### Step 7: Set up Supabase Storage buckets

Create three storage buckets via the Supabase JS client. Create a one-time setup script at `scripts/setup-storage.ts`:

```typescript
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
```

Add a script to `package.json`:
```json
"setup:storage": "bunx tsx scripts/setup-storage.ts"
```

Run it: `bun run setup:storage`

### Step 8: Verify the build

Run:
```bash
bun run build
```

Fix any TypeScript or build errors. The build must succeed cleanly before we can deploy to Vercel. Common issues to watch for:
- The middleware import fix from Step 2
- Any Prisma client import issues (make sure `postinstall` runs `prisma generate`)
- Missing type imports from `@prisma/client`

### Step 9: Prepare the Git repository

Initialize git (if not already), create an initial commit:
```bash
git init
git add .
git commit -m "GreenTrace: foundation with Supabase Cloud integration

- Next.js 14 App Router with TypeScript
- Full Prisma schema (all models from PLAN.md)
- Supabase Auth (email/password) with SSR cookie handling
- Supabase Storage buckets (documents, imports, reports)
- Role-based middleware routing
- API routes for auth, mills, users, checklists, data entries,
  mass balance, shipments, imports, audits, emission factors,
  documents, and dashboard
- Seed data: org, super admin, ISCC EU profile, emission factors
- Ready for Vercel deployment"
```

## Constraints

- Use `bun` for all commands (install, run, exec). Never use `npm` or `yarn`.
- Do not modify the Prisma schema models — only fix the datasource block.
- Do not create new pages or API routes — this prompt is only about Supabase integration and deploy prep.
- Do not add any UI libraries or components.
- Keep `.env.local` untouched except for updating DATABASE_URL and DIRECT_URL when I provide the connection strings.

## Don't

- Don't set up RLS policies yet — that's a separate task once the basic connection is verified working.
- Don't set up Vercel — that's the next step after the GitHub repo is created.
- Don't restructure the project or rename files beyond what's specified above.
- Don't add error handling, tests, or refactor existing code.

## Done when

- `bunx prisma migrate dev` has run successfully against Supabase Cloud Postgres
- `bun run db:seed` has populated the database with seed data
- `bun run setup:storage` has created the three storage buckets
- `bun run build` completes with zero errors
- `.env.example` exists with placeholder values (no secrets)
- `.gitignore` prevents `.env` and `.env.local` from being committed
- Git repo initialized with a clean initial commit
- All code changes are limited to: schema datasource, middleware import, package.json scripts, .env files, .gitignore, and the new setup-storage script
