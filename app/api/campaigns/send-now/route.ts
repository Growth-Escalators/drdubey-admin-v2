import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, templateId, language, city, patientIds } = body

    if (!templateId) {
      return NextResponse.json({ error: 'templateId required' }, { status: 400 })
    }
    if (!Array.isArray(patientIds) || patientIds.length === 0) {
      return NextResponse.json({ error: 'patientIds required' }, { status: 400 })
    }

    let template = null
    if (OBJECT_ID_RE.test(templateId)) {
      template = await db.whatsAppTemplate.findUnique({ where: { id: templateId } })
    }
    if (!template) {
      template = await db.whatsAppTemplate.findFirst({ where: { metaName: templateId } })
    }
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    if (!template.isApproved) {
      return NextResponse.json({ error: 'Template not approved on Meta' }, { status: 400 })
    }

    // Auto-generated name uses today's date in IST. Plain toISOString()
    // returns UTC, which crosses midnight at 05:30 IST — names like
    // "Send Now - 2026-05-25" appearing at 1 AM IST on 2026-05-26 are
    // confusing for the admin team.
    const istToday = new Date().toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
    })
    const campaign = await db.campaign.create({
      data: {
        name: name || `Send Now - ${istToday}`,
        templateId: template.id,
        language: language || 'hi',
        city: city || '',
        patientIds,
        patientCount: patientIds.length,
        status: 'SENDING',
        scheduledAt: new Date(),
      },
    })

    // Fire off the first chunk via the dedicated send-chunk route — NOT
    // inline. Each chunk processes up to 15 patients at ~1s/patient
    // (Meta API + DB write), which can easily exceed this route's 10s
    // Vercel-Hobby cap. Awaiting it inline used to surface a misleading
    // "Failed to start campaign" alert even though the campaign was
    // actually launching successfully — the response had just timed
    // out while the work continued on the server.
    //
    // send-chunk is auth-whitelisted in middleware and validates the
    // shared secret itself, so this self-fetch is safe and recursive
    // chunks chain themselves until the campaign finishes.
    const secret = process.env.CAMPAIGN_INTERNAL_SECRET
    if (secret) {
      const base = getBaseUrl(req)
      fetch(`${base}/api/campaigns/send-chunk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`,
        },
        body: JSON.stringify({ campaignId: campaign.id }),
      }).catch(() => {})
      // Tiny pause so the function host has time to flush the fetch
      // before the Lambda freezes / shuts down.
      await new Promise(r => setTimeout(r, 300))
    } else {
      console.warn('[SEND_NOW] CAMPAIGN_INTERNAL_SECRET missing — first chunk will not start')
    }

    return NextResponse.json({
      campaignId: campaign.id,
      patientCount: campaign.patientCount,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[SEND_NOW]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
