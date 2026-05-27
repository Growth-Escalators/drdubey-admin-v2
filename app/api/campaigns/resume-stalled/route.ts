import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const STALL_THRESHOLD_MS = 30 * 60 * 1000

function getBaseUrl(req: Request): string {
  const envBase = process.env.NEXTAUTH_URL
  if (envBase) return envBase
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) return `https://${vercelUrl}`
  const host = req.headers.get('host') || 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

function isInternalCallAuthorized(req: Request): boolean {
  const secret = process.env.CAMPAIGN_INTERNAL_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

export async function POST(req: Request) {
  if (!isInternalCallAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cutoff = new Date(Date.now() - STALL_THRESHOLD_MS)
    const stalled = await db.campaign.findMany({
      where: {
        status: 'SENDING',
        updatedAt: { lt: cutoff },
      },
      select: { id: true },
    })

    const secret = process.env.CAMPAIGN_INTERNAL_SECRET
    const base = getBaseUrl(req)
    let dispatched = 0
    for (const c of stalled) {
      // Atomic claim: only re-poke if still in the stalled window. Without
      // this, daily cron + browser tick + cron-job.org pulse can all find
      // the same stalled campaign and all fire send-chunk → patient gets
      // multiple sends. updateMany with the cutoff guard moves the row out
      // of the stalled bucket via Prisma's @updatedAt; concurrent runners
      // see the refreshed row and skip.
      const claim = await db.campaign.updateMany({
        where: {
          id: c.id,
          status: 'SENDING',
          updatedAt: { lt: cutoff },
        },
        data: { status: 'SENDING' },
      })
      if (claim.count === 0) continue

      fetch(`${base}/api/campaigns/send-chunk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'Authorization': `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({ campaignId: c.id }),
      }).catch(() => {})
      dispatched++
    }

    return NextResponse.json({ resumed: dispatched })
  } catch (e: any) {
    console.error('[RESUME_STALLED]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
