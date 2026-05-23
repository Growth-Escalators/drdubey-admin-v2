import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

// All campaign logs across all campaigns
const allLogs = await db.campaignLog.findMany({
  select: { phone: true, status: true, patientName: true, sentAt: true, campaignId: true, patientId: true },
  orderBy: { sentAt: 'desc' },
})

// Group by phone: phone was SENT if ANY of its logs are SENT
const phoneStatus = new Map()
for (const l of allLogs) {
  if (!l.phone) continue
  const existing = phoneStatus.get(l.phone)
  if (!existing || (existing.status !== 'SENT' && l.status === 'SENT')) {
    phoneStatus.set(l.phone, l)
  }
}

const sent = [...phoneStatus.values()].filter(l => l.status === 'SENT')
const failed = [...phoneStatus.values()].filter(l => l.status === 'FAILED')

console.log(`Unique phones attempted: ${phoneStatus.size}`)
console.log(`  Successfully sent to Meta: ${sent.length}`)
console.log(`  Failed (Meta rejected):    ${failed.length}`)

console.log('\n=== Phones successfully sent (DO NOT resend the same template) ===')
for (const l of sent.sort((a, b) => a.phone.localeCompare(b.phone))) {
  console.log(`  ${l.phone.padEnd(15)}  ${l.patientName || ''}`)
}

console.log('\n=== Phones that FAILED (safe to retry) ===')
for (const l of failed.sort((a, b) => a.phone.localeCompare(b.phone))) {
  console.log(`  ${l.phone.padEnd(15)}  ${l.patientName || ''}`)
}

// Also check: in the 50-batch test specifically, what was sent
const test = await db.campaign.findUnique({ where: { id: '6a058616107fa8fb34ceab65' } })
if (test) {
  const logs = await db.campaignLog.findMany({ where: { campaignId: test.id } })
  console.log(`\n=== "Test 50 batch 08:21" campaign breakdown ===`)
  console.log(`Total logs created: ${logs.length} (of ${test.patientCount} patients)`)
  const sentInTest = logs.filter(l => l.status === 'SENT').map(l => l.phone)
  console.log(`SENT in test:`)
  for (const p of sentInTest.sort()) console.log(`  ${p}`)
}

await db.$disconnect()
