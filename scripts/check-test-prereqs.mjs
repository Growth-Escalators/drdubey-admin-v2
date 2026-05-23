import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

// Find Jatin's lead (likely phone ending 9309320001)
const jatin = await db.lead.findFirst({
  where: { phone: { contains: '9309320001' } },
  select: { id: true, name: true, phone: true, cities: true },
})
console.log('Jatin lead:', jatin || 'NOT FOUND')

// Approved templates available
const templates = await db.whatsAppTemplate.findMany({
  where: { isApproved: true },
  select: { id: true, name: true, metaName: true, language: true, headerType: true, bodyHi: true, bodyEn: true },
  orderBy: { updatedAt: 'desc' },
  take: 10,
})
console.log(`\nApproved templates (${templates.length}):`)
for (const t of templates) {
  const body = (t.language === 'hi' ? t.bodyHi : t.bodyEn) || ''
  const placeholders = (body.match(/\{\{\d+\}\}/g) || []).length
  console.log(`  ${t.id}  [${t.language}] ${t.metaName}  header=${t.headerType}  placeholders=${placeholders}`)
}

// Any campaigns currently in SCHEDULED state? (to check feature has been used)
const scheduled = await db.campaign.findMany({
  where: { status: 'SCHEDULED' },
  select: { id: true, name: true, scheduledAt: true, patientCount: true },
})
console.log(`\nCampaigns currently SCHEDULED: ${scheduled.length}`)
for (const c of scheduled) console.log(`  ${c.scheduledAt?.toISOString()}  ${c.name}  (${c.patientCount} patients)`)

await db.$disconnect()
