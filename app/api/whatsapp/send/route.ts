import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildTemplatePayload } from '@/lib/wa-template-payload'
import { resolveSendMediaUrl } from '@/lib/wa-media-url'

export const dynamic = 'force-dynamic'

const PHONE_ID = process.env.WHATSAPP_PHONE_ID
const TOKEN = process.env.WHATSAPP_API_TOKEN
const GRAPH_URL = `https://graph.facebook.com/v22.0/${PHONE_ID}/messages`

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').replace(/^0/, '')
  return digits.startsWith('91') ? digits : `91${digits}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      phone,
      templateName,
      language = 'hi',
      parameters = [],
      headerImageUrl,
      headerTextParams = [],
      buttonUrlParams = {},
      leadId,
    } = body

    if (!phone || !templateName) {
      return NextResponse.json(
        { error: 'phone and templateName required' },
        { status: 400 }
      )
    }

    if (!PHONE_ID || !TOKEN) {
      return NextResponse.json(
        { error: 'WhatsApp not configured — missing env vars' },
        { status: 500 }
      )
    }

    const to = formatPhone(phone)
    const langCode = language === 'hi' ? 'hi' : 'en_US'

    const dbTemplate = await db.whatsAppTemplate.findFirst({
      where: { metaName: templateName },
    })

    // headerImageUrl param wins (explicit override). Otherwise resolve
    // the template's send-time media URL — rejecting both resumable
    // handles and Meta's own non-refetchable CDN URLs.
    const sendMediaUrl = dbTemplate
      ? resolveSendMediaUrl(dbTemplate)
      : null

    const payload = buildTemplatePayload(
      to,
      {
        metaName: templateName,
        language,
        headerType: dbTemplate?.headerType || 'NONE',
        headerMediaUrl: sendMediaUrl,
        headerText: dbTemplate?.headerText || null,
        buttonsJson: dbTemplate?.buttonsJson || null,
      },
      parameters,
      headerImageUrl,
      headerTextParams,
      buttonUrlParams,
    )

    const res = await fetch(GRAPH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    await db.whatsAppMessageLog.create({
      data: {
        leadId: leadId || null,
        phone: to,
        templateName,
        language: langCode,
        variables: parameters,
        status: res.ok ? 'SENT' : 'FAILED',
        messageId: data.messages?.[0]?.id || null,
        errorMsg: res.ok ? null : (data.error?.message || 'Send failed'),
        source: 'individual',
      }
    }).catch(e => console.error('[MSG_LOG]', e))

    if (!res.ok) {
      console.error('WhatsApp API error:', data)
      return NextResponse.json(
        { error: data.error?.message || 'Send failed' },
        { status: res.status }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: data.messages?.[0]?.id,
    })

  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    )
  }
}
