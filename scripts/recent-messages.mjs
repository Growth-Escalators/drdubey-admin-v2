import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

// CampaignLog has the full delivery lifecycle (SENT -> DELIVERED -> READ).
const recent = await db.campaignLog.findMany({
  orderBy: { createdAt: 'desc' },
  take: 60,
  select: {
    createdAt: true, phone: true, patientName: true, status: true,
    error: true, deliveredAt: true, readAt: true, sentAt: true,
    campaignId: true, messageId: true,
  },
})

console.log(`=== Last ${recent.length} campaign message attempts ===\n`)
for (const m of recent) {
  const time = m.createdAt.toISOString().replace('T', ' ').slice(0, 19)
  const d = m.deliveredAt ? ' D' : '  '
  const r = m.readAt ? ' R' : '  '
  const err = m.error ? ` -- ${m.error.slice(0, 60)}` : ''
  console.log(`${time}  ${m.phone.padEnd(14)} ${m.status.padEnd(10)}${d}${r}  ${(m.patientName || '').slice(0, 22).padEnd(22)}${err}`)
}

const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
const last24 = await db.campaignLog.findMany({
  where: { createdAt: { gte: since } },
  select: { status: true, deliveredAt: true, readAt: true, error: true },
})
console.log(`\n=== Last 24 hours: ${last24.length} message attempts ===`)
const sent = last24.filter(m => ['SENT', 'DELIVERED', 'READ'].includes(m.status)).length
const delivered = last24.filter(m => m.deliveredAt).length
const read = last24.filter(m => m.readAt).length
const failed = last24.filter(m => m.status === 'FAILED').length
const pending = last24.filter(m => m.status === 'PENDING' || m.status === 'SENDING').length
console.log(`  Accepted by Meta (SENT+): ${sent}`)
console.log(`  Delivered to phone:       ${delivered}`)
console.log(`  Read by recipient:        ${read}`)
console.log(`  Failed:                   ${failed}`)
console.log(`  Pending:                  ${pending}`)

if (failed > 0) {
  const failures = last24.filter(m => m.status === 'FAILED')
  const byReason = new Map()
  for (const f of failures) {
    const key = (f.error || 'Unknown').slice(0, 100)
    byReason.set(key, (byReason.get(key) || 0) + 1)
  }
  console.log(`\n=== Failure reasons (last 24h) ===`)
  for (const [reason, count] of [...byReason.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}x ${reason}`)
  }
}

await db.$disconnect()
