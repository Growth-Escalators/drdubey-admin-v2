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

    // Chain the next chunk via self-fetch BEFORE returning. This used to
    // happen sequentially and worked fine when chunks were fast, but at
    // 4s/chunk on the slow path the function gets killed before this
    // code runs. Now firing as soon as the current chunk's DB writes
    // complete and giving 400ms for the request to actually leave the
    // host before the lambda freezes.
    if (!result.done) {
      const base = getBaseUrl(req)
      fetch(`${base}/api/campaigns/send-chunk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CAMPAIGN_INTERNAL_SECRET}`,
        },
        body: JSON.stringify({ campaignId }),
      }).catch(() => {})
      // Slightly shorter than before — at CHUNK_SIZE=1 we have headroom
      // but want to minimise dead time at the end of every invocation.
      await new Promise(r => setTimeout(r, 400))
    }

    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[SEND_CHUNK]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
