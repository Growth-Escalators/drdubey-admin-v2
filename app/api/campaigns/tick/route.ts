import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

// Browser-driven scheduler tick. The /admin/campaigns page polls this
// every 60s while open, so scheduled campaigns fire within ~1 minute of
// their scheduledAt time even though Vercel Hobby's cron is daily-only.
//
// Auth: NextAuth session (admin user). The actual send work is delegated
// to /api/campaigns/send-chunk (chunk-of-1 chain) via internal bearer.

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
    const due = await db.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
      select: { id: true },
    })

    const base = getBaseUrl(req)
    const triggered: string[] = []

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

    // Tiny wait so dispatches leave the host before the function returns.
    if (triggered.length > 0) {
      await new Promise(r => setTimeout(r, 500))
    }

    return NextResponse.json({ triggered, count: triggered.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[TICK]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
