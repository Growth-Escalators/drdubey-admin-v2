import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

export const dynamic = 'force-dynamic'

// Client-side chain driver. The campaign detail page calls this every
// ~15s while the campaign is SENDING. Each call fires one send-chunk
// invocation, which processes one patient and (best-effort) chains a
// continuation. Even if the server-side chain dies after a few hops,
// the client keeps poking the chain awake.
//
// This is a workaround for Vercel Hobby's serverless shutdown behavior:
// fire-and-forget fetches from a dying function don't reliably reach
// their target, so server-side chains stall after 4-5 iterations.
// Driving from the client guarantees forward progress as long as
// someone has the campaign page open.
//
// /api/campaigns/resume-stalled (daily cron) is the safety net for
// campaigns where no one has the page open.

function getBaseUrl(req: Request): string {
  const envBase = process.env.NEXTAUTH_URL
  if (envBase) return envBase
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) return `https://${vercelUrl}`
  const host = req.headers.get('host') || 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  // Session check — only signed-in admin users can poke
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const secret = process.env.CAMPAIGN_INTERNAL_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Fire send-chunk for this campaign. We don't await the full response —
  // the chunk takes ~5s and we don't want the client poking to block.
  // The chunk handles its own continuation; we just need to keep the
  // chain primed.
  const base = getBaseUrl(req)
  fetch(`${base}/api/campaigns/send-chunk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secret}`,
    },
    body: JSON.stringify({ campaignId: params.id }),
    // @ts-expect-error - keepalive helps Node flush the request
    keepalive: true,
  }).catch(() => {})

  // Short wait so the fetch leaves the host before this function returns.
  await new Promise(r => setTimeout(r, 500))

  return NextResponse.json({ poked: true })
}
