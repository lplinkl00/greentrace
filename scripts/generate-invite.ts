import { createHash, randomBytes } from 'crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
    const raw = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(raw).digest('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await prisma.inviteToken.create({ data: { tokenHash, expiresAt } })

    console.log('\n✅ Invite token created')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Token (share this):', raw)
    console.log('Expires at:', expiresAt.toISOString())
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
