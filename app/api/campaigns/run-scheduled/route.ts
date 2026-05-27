import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

// Scheduler trigger. Called by /api/cron/daily and by the client-side
// poller on /admin/campaigns. Finds SCHEDULED campaigns whose time has
// arrived, transitions them to SENDING, and fires the chunk-of-1 send
// chain at /api/campaigns/send-chunk for each. No patient processing
// happens inline — that would blow the Vercel 10s cap on large campaigns.
//
// Auth: shared bearer secret. The campaigns page's tick poller uses the
// session-authed /api/campaigns/tick which calls into the same send-chunk
// chain; this route is the cron entry point.

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
    const now = new Date()
    const dueCampaigns = await db.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
      select: { id: true },
    })

    const secret = process.env.CAMPAIGN_INTERNAL_SECRET!
    const base = getBaseUrl(req)
    const triggered: string[] = []

    for (const c of dueCampaigns) {
      // Atomic claim: see /api/campaigns/tick and /api/campaigns/pulse.
      // Daily Vercel cron, browser tick, and external pulse all converge
      // on this transition — without the status guard the same campaign
      // can be claimed twice and dispatched twice.
      const claim = await db.campaign.updateMany({
        where: { id: c.id, status: 'SCHEDULED' },
        data: { status: 'SENDING' },
      })
      if (claim.count === 0) continue

      const dispatch = fetch(`${base}/api/campaigns/send-chunk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`,
        },
        body: JSON.stringify({ campaignId: c.id }),
        keepalive: true,
      } as RequestInit).catch(() => {})

      // Same pattern as send-chunk's continuation: race the dispatch against
      // a 2s timeout so the fetch leaves the host before we return.
      await Promise.race([
        dispatch,
        new Promise(r => setTimeout(r, 2000)),
      ])

      triggered.push(c.id)
    }

    return NextResponse.json({ triggered, count: triggered.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[RUN_SCHEDULED]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
