import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

// Public bearer-authed counterpart to /api/campaigns/tick. Designed to
// be called by an external cron-style pinger (cron-job.org, UptimeRobot,
// GitHub Actions schedule, etc.) every 1-2 minutes so:
//   1. SCHEDULED campaigns fire on time without anyone keeping an admin
//      tab open (Vercel Hobby allows only one daily cron — this is the
//      always-on path).
//   2. SENDING campaigns whose chunk chain has died on a serverless
//      shutdown get re-poked, so a Send-Now blast actually finishes even
//      when the admin's browser is closed entirely.
//
// Auth: shared bearer secret via Authorization: Bearer <CAMPAIGN_INTERNAL_SECRET>.
// Add /api/campaigns/pulse to middleware.ts exclusions so the NextAuth
// middleware doesn't block this unauthenticated-but-bearer-protected
// path. The actual send work is delegated to /api/campaigns/send-chunk
// (the same chunk-of-1 chain the in-app tick uses).
//
// processCampaignChunk is idempotent (skips patients already in
// CampaignLog), so a re-poke of a stalled chain doesn't double-send.

// Same 60s threshold as /api/campaigns/tick — long enough that a
// healthy chain (≈5s per chunk) won't be racing a parallel chunk,
// short enough that recovery from a serverless shutdown is seconds,
// not hours.
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

function isAuthorized(req: Request): boolean {
  const secret = process.env.CAMPAIGN_INTERNAL_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

async function runPulse(req: Request) {
  const secret = process.env.CAMPAIGN_INTERNAL_SECRET!
  const now = new Date()
  const stalledCutoff = new Date(now.getTime() - STALLED_THRESHOLD_MS)

  const due = await db.campaign.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: now },
    },
    select: { id: true },
  })

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
    // Atomic claim: see comment in /api/campaigns/tick. Without this,
    // a tick+pulse fire within ~ms of each other and the patient gets
    // two messages.
    const claim = await db.campaign.updateMany({
      where: { id: c.id, status: 'SCHEDULED' },
      data: { status: 'SENDING' },
    })
    if (claim.count === 0) continue

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

  for (const c of stalled) {
    // Same atomic-claim pattern for stalled re-poke. Bumping updatedAt
    // (via a same-value status write) only succeeds if the row is still
    // older than the cutoff — concurrent pingers see updatedAt fresh and
    // skip the dispatch.
    const claim = await db.campaign.updateMany({
      where: {
        id: c.id,
        status: 'SENDING',
        updatedAt: { lt: stalledCutoff },
      },
      data: { status: 'SENDING' },
    })
    if (claim.count === 0) continue

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

  if (triggered.length + resumed.length > 0) {
    await new Promise(r => setTimeout(r, 500))
  }

  return { triggered, count: triggered.length, resumed, resumedCount: resumed.length }
}

// POST is the canonical method. GET is supported too so naive pingers
// (most free cron services default to GET) work out of the box. Both
// require the same bearer token.
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runPulse(req)
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[PULSE]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runPulse(req)
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[PULSE]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
