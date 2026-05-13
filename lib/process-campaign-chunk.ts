import { db } from './db'
import { buildTemplatePayload } from './wa-template-payload'
import { resolveSendMediaUrl } from './wa-media-url'

const CHUNK_SIZE = 15

export interface ProcessChunkResult {
  done: boolean
  processed: number
  remaining: number
  sentCount: number
  failedCount: number
  status: string
  reason?: string
}

// Processes ONE batch of up to CHUNK_SIZE messages for a campaign.
// Returns done=true when the campaign has no more patients. The caller is
// responsible for chaining the next batch (either via an inline loop, a
// background fetch, or the resume-stalled cron).
//
// Extracted from /api/campaigns/send-chunk so it can be invoked in-process
// from /api/campaigns/send-now — avoiding the HTTP self-fetch that was
// being blocked by the next-auth middleware (the original bug that left
// every Send Now campaign stuck on SENDING with 0 sent).
export async function processCampaignChunk(
  campaignId: string,
): Promise<ProcessChunkResult> {
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) {
    return {
      done: true, processed: 0, remaining: 0, sentCount: 0, failedCount: 0,
      status: 'NOT_FOUND',
    }
  }

  if (campaign.status === 'SENT' || campaign.status === 'FAILED') {
    return {
      done: true, processed: 0, remaining: 0,
      sentCount: campaign.sentCount, failedCount: campaign.failedCount,
      status: campaign.status,
    }
  }

  if (campaign.status === 'SCHEDULED') {
    await db.campaign.update({
      where: { id: campaign.id },
      data: { status: 'SENDING' },
    })
  }

  const template = await db.whatsAppTemplate.findUnique({
    where: { id: campaign.templateId },
  })
  if (!template) {
    await db.campaign.update({
      where: { id: campaign.id },
      data: { status: 'FAILED', sentAt: new Date() },
    })
    return {
      done: true, processed: 0, remaining: 0, sentCount: 0, failedCount: 0,
      status: 'FAILED', reason: 'Template deleted',
    }
  }

  const existingLogs = await db.campaignLog.findMany({
    where: { campaignId: campaign.id },
    select: { patientId: true },
  })
  const processedIds = new Set(existingLogs.map(l => l.patientId))
  const remaining = campaign.patientIds.filter(id => !processedIds.has(id))

  if (remaining.length === 0) {
    const totals = await db.campaignLog.groupBy({
      by: ['status'],
      where: { campaignId: campaign.id },
      _count: { status: true },
    })
    const sentCount = totals.find(t => t.status === 'SENT')?._count.status || 0
    const failedCount = totals.find(t => t.status === 'FAILED')?._count.status || 0
    await db.campaign.update({
      where: { id: campaign.id },
      data: { status: 'SENT', sentAt: new Date(), sentCount, failedCount },
    })
    return {
      done: true, processed: 0, remaining: 0,
      sentCount, failedCount, status: 'SENT',
    }
  }

  const batchIds = remaining.slice(0, CHUNK_SIZE)
  const patients = await db.lead.findMany({
    where: { id: { in: batchIds } },
    select: { id: true, name: true, phone: true, cities: true },
  })
  const patientMap = new Map(patients.map(p => [p.id, p]))

  const PHONE_ID = process.env.WHATSAPP_PHONE_ID
  const TOKEN = process.env.WHATSAPP_API_TOKEN

  // Count {{N}} placeholders in the template body so we send the exact
  // number of body parameters Meta expects. Mismatched count returns
  // error 132012 "Parameter format does not match" and the entire batch
  // would otherwise fail silently.
  const templateBody =
    (campaign.language === 'hi' ? template.bodyHi : template.bodyEn) || ''
  const placeholderCount = (templateBody.match(/\{\{\d+\}\}/g) || []).length

  for (const patientId of batchIds) {
    const patient = patientMap.get(patientId)
    let status = 'FAILED'
    let errorMsg: string | null = null
    let messageId: string | null = null
    let fullPhone = ''

    try {
      if (!patient) throw new Error('Patient not found')
      if (!patient.phone) throw new Error('No phone number')
      if (!PHONE_ID || !TOKEN) throw new Error('WhatsApp not configured')

      const phone = patient.phone.replace(/\D/g, '').replace(/^0/, '')
      fullPhone = phone.startsWith('91') ? phone : `91${phone}`

      // Fill body parameters by convention used elsewhere in the app:
      //   {{1}} → patient name, {{2}} → city. Pad the rest with '' so the
      //   parameter count always matches what the template declared.
      const bodyParameters: string[] = []
      for (let i = 0; i < placeholderCount; i++) {
        if (i === 0) bodyParameters.push(patient.name || '')
        else if (i === 1) bodyParameters.push(campaign.city || patient.cities || '')
        else bodyParameters.push('')
      }

      // For sending, prefer the publicly-accessible URL. The Meta
      // resumable handle stored in headerMediaUrl can't be used as `link`
      // at send time, and neither can Meta's own scontent.whatsapp.net /
      // *.fbcdn.net preview URLs (Meta returns "Media upload error"
      // when asked to refetch from its own CDN). resolveSendMediaUrl
      // filters both classes out and returns null if no usable URL
      // exists — in that case we send the message text-only rather than
      // failing the whole delivery.
      const sendMediaUrl = resolveSendMediaUrl(template)

      const payload = buildTemplatePayload(
        fullPhone,
        {
          metaName: template.metaName,
          language: campaign.language,
          headerType: template.headerType,
          headerMediaUrl: sendMediaUrl,
          headerText: template.headerText,
          buttonsJson: template.buttonsJson,
        },
        bodyParameters,
      )

      const res = await fetch(
        `https://graph.facebook.com/v22.0/${PHONE_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (res.ok) {
        status = 'SENT'
        messageId = data.messages?.[0]?.id || null
      } else {
        errorMsg = data.error?.message || 'WhatsApp API error'
      }

      await db.whatsAppMessageLog.create({
        data: {
          leadId: patientId,
          phone: fullPhone,
          templateName: template.metaName || template.name,
          language: campaign.language || 'hi',
          variables: bodyParameters,
          status,
          messageId,
          errorMsg,
          source: 'campaign',
        },
      }).catch(e => console.error('[MSG_LOG]', e))
    } catch (err) {
      status = 'FAILED'
      errorMsg = err instanceof Error ? err.message : String(err)
    }

    await db.campaignLog.create({
      data: {
        campaignId: campaign.id,
        patientId,
        patientName: patient?.name || '',
        phone: patient?.phone || fullPhone || '',
        status,
        messageId,
        error: errorMsg,
        sentAt: status === 'SENT' ? new Date() : null,
      },
    })

    // 100ms pause between sends — gentle on Meta rate limits.
    await new Promise(r => setTimeout(r, 100))
  }

  const totals = await db.campaignLog.groupBy({
    by: ['status'],
    where: { campaignId: campaign.id },
    _count: { status: true },
  })
  const sentCount = totals.find(t => t.status === 'SENT')?._count.status || 0
  const failedCount = totals.find(t => t.status === 'FAILED')?._count.status || 0

  const stillRemaining = remaining.length - batchIds.length
  const done = stillRemaining === 0

  await db.campaign.update({
    where: { id: campaign.id },
    data: {
      sentCount,
      failedCount,
      ...(done ? { status: 'SENT', sentAt: new Date() } : {}),
    },
  })

  return {
    done,
    processed: batchIds.length,
    remaining: stillRemaining,
    sentCount,
    failedCount,
    status: done ? 'SENT' : 'SENDING',
  }
}
