import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

// Browser-driven scheduler tick. Polled every 30s from the admin layout
// while any admin page is open, so:
//   1. SCHEDULED campaigns fire within ~30s of their scheduledAt (Vercel
//      Hobby's cron is daily-only — this is the on-time path).
//   2. SENDING campaigns whose chunk chain has died on a serverless
//      shutdown get re-poked, so a Send-Now blast actually finishes even
//      if the admin never opens /admin/campaigns/[id]. processCampaignChunk
//      is idempotent (skips patients with an existing CampaignLog), so a
//      stale-then-resumed chunk doesn't double-send.
//
// Auth: NextAuth session (admin user). The actual send work is delegated
// to /api/campaigns/send-chunk (chunk-of-1 chain) via internal bearer.

// How long a SENDING campaign can sit without its updatedAt advancing
// before we consider the chain dead and re-poke. One chunk takes ~5s end-
// to-end (Meta API + DB writes + continuation dispatch), so 60s is a
// safe lower bound — long enough that we won't fire a parallel chunk
// against a still-live chain, short enough that a 500-patient blast
// recovers in seconds instead of waiting for the daily cron.
const STALLED_THRESHOLD_MS = 60 * 1000

function getBaseUrl(req: Request): string {
  const envBase = process.env.NEXTAUTH_URL
  if (envBase) return envBase
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) return `https://${vercelUrl}`
  const host = req.headers.get('host') || 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const secret = process.env.CAMPAIGN_INTERNAL_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  try {
    const now = new Date()
    const stalledCutoff = new Date(now.getTime() - STALLED_THRESHOLD_MS)

    // SCHEDULED campaigns whose time has arrived.
    const due = await db.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
      select: { id: true },
    })

    // SENDING campaigns whose chunk chain has stopped advancing. The
    // updatedAt timestamp is bumped at the end of every successful chunk
    // (see lib/process-campaign-chunk.ts), so anything older than the
    // threshold means no chunk has completed for it recently.
    const stalled = await db.campaign.findMany({
      where: {
        status: 'SENDING',
        updatedAt: { lt: stalledCutoff },
      },
      select: { id: true },
    })

    const base = getBaseUrl(req)
    const triggered: string[] = []
    const resumed: string[] = []

    for (const c of due) {
      await db.campaign.update({
        where: { id: c.id },
        data: { status: 'SENDING' },
      })

      fetch(`${base}/api/campaigns/send-chunk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`,
        },
        body: JSON.stringify({ campaignId: c.id }),
        keepalive: true,
      } as RequestInit).catch(() => {})

      triggered.push(c.id)
    }

    // Re-poke stalled SENDING campaigns. We don't change their status —
    // they're already SENDING. processCampaignChunk dedupes against
    // CampaignLog so any patient already attempted is skipped.
    for (const c of stalled) {
      fetch(`${base}/api/campaigns/send-chunk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`,
        },
        body: JSON.stringify({ campaignId: c.id }),
        keepalive: true,
      } as RequestInit).catch(() => {})

      resumed.push(c.id)
    }

    // Tiny wait so dispatches leave the host before the function returns.
    if (triggered.length + resumed.length > 0) {
      await new Promise(r => setTimeout(r, 500))
    }

    return NextResponse.json({
      triggered,
      count: triggered.length,
      resumed,
      resumedCount: resumed.length,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[TICK]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
