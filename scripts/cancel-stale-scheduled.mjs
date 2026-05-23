import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

// Cancel any SCHEDULED campaigns older than 12 hours. These are stragglers
// from before the scheduler trigger was fixed — they would otherwise fire
// the moment the tick poller comes online.
const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000)
const stale = await db.campaign.findMany({
  where: {
    status: 'SCHEDULED',
    scheduledAt: { lt: cutoff },
  },
  select: { id: true, name: true, scheduledAt: true, patientCount: true },
})

console.log(`Found ${stale.length} stale SCHEDULED campaign(s) (>12h overdue):`)
for (const c of stale) {
  console.log(`  ${c.scheduledAt?.toISOString()}  ${c.name}  (${c.patientCount} patients)  [${c.id}]`)
}

if (stale.length > 0) {
  const result = await db.campaign.updateMany({
    where: { id: { in: stale.map(c => c.id) } },
    data: { status: 'CANCELLED', sentAt: new Date() },
  })
  console.log(`\nMarked ${result.count} as CANCELLED.`)
}

await db.$disconnect()
