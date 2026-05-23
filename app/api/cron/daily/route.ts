import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const base = process.env.NEXTAUTH_URL ||
    'https://admin.drdubay.in'
  const secret = process.env.CAMPAIGN_INTERNAL_SECRET
  const authHeaders: Record<string, string> = secret
    ? { Authorization: `Bearer ${secret}` }
    : {}

  const [campaigns, reviews, resumed] = await Promise.all([
    fetch(`${base}/api/campaigns/run-scheduled`, {
      method: 'POST',
      headers: authHeaders,
    }).then(r => r.json()).catch(e => ({
      error: e.message
    })),
    fetch(`${base}/api/reviews/send`, {
      method: 'POST'
    }).then(r => r.json()).catch(e => ({
      error: e.message
    })),
    fetch(`${base}/api/campaigns/resume-stalled`, {
      method: 'POST',
      headers: authHeaders,
    }).then(r => r.json()).catch(e => ({
      error: e.message
    })),
  ])

  return NextResponse.json({ campaigns, reviews, resumed })
}
