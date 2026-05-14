import { NextResponse } from 'next/server'
import { processCampaignChunk } from '@/lib/process-campaign-chunk'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

function getBaseUrl(req: Request): string {
  const envBase = process.env.NEXTAUTH_URL
  if (envBase) return envBase
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) return `https://${vercelUrl}`
  const host = req.headers.get('host') || 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

// Verifies the shared-secret used by internal fetches (send-now and the
// chunk's own continuation). Without this check the middleware would
// block internal API self-calls because they don't carry a session cookie.
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
    const { campaignId } = await req.json()
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const result = await processCampaignChunk(campaignId)

    // Fire the next chunk. The chain was previously dying after 4-5 hops
    // because the fire-and-forget fetch wasn't fully on the wire before
    // Vercel killed the lambda. Two changes here:
    //   - keepalive: true — hints Node to complete the request even if
    //     the calling context shuts down.
    //   - 2-second wait after dispatch — gives the request enough time
    //     to be acknowledged by the target host. We don't await the
    //     full response (that would extend our duration) — just race
    //     against a hard timeout.
    if (!result.done) {
      const base = getBaseUrl(req)
      const dispatch = fetch(`${base}/api/campaigns/send-chunk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CAMPAIGN_INTERNAL_SECRET}`,
        },
        body: JSON.stringify({ campaignId }),
        keepalive: true,
      } as RequestInit).catch(() => {})

      await Promise.race([
        dispatch,
        new Promise(r => setTimeout(r, 2000)),
      ])
    }

    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[SEND_CHUNK]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
