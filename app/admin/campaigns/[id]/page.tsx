'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface CampaignLog {
  id: string
  patientName: string
  phone: string
  status: string
  messageId: string | null
  error: string | null
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
}

interface Campaign {
  id: string
  name: string
  templateId: string
  language: string
  city: string | null
  patientCount: number
  status: string
  scheduledAt: string
  sentAt: string | null
  sentCount: number
  failedCount: number
  deliveredCount: number
  readCount: number
  logs: CampaignLog[]
}

type LogFilter = 'all' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  SCHEDULED:  { bg: '#eff6ff', color: '#2563eb' },
  SENDING:    { bg: '#fffbeb', color: '#d97706' },
  PENDING:    { bg: '#f1f5f9', color: '#64748b' },
  SENT:       { bg: '#eff6ff', color: '#2563eb' },
  DELIVERED:  { bg: '#ecfdf5', color: '#0d9488' },
  READ:       { bg: '#f0fdf4', color: '#16a34a' },
  FAILED:     { bg: '#fef2f2', color: '#dc2626' },
}

const formatTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) : '—'

export default function CampaignDetailPage() {
  const params = useParams()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [logFilter, setLogFilter] = useState<LogFilter>('all')

  useEffect(() => {
    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    const load = () => {
      fetch(`/api/campaigns/${params.id}`)
        .then(r => r.json())
        .then(d => {
          if (cancelled) return
          setCampaign(d)
          setLoading(false)
          // Keep polling even after the send completes — webhook callbacks
          // for delivered / read continue trickling in for up to a day.
        })
        .catch(() => { if (!cancelled) setLoading(false) })
    }

    load()
    intervalId = setInterval(load, 5000)

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
    }
  }, [params.id])

  // Client-side chain driver: while the campaign is SENDING, poke the
  // server every 15s to fire another send-chunk. Vercel Hobby's
  // serverless shutdown behavior was killing the server-side chain
  // after 4-5 iterations; the client-side poke loop guarantees forward
  // progress as long as someone has this page open.
  useEffect(() => {
    if (campaign?.status !== 'SENDING') return
    const poke = () => {
      fetch(`/api/campaigns/${params.id}/poke`, { method: 'POST' })
        .catch(() => {})
    }
    poke() // fire one immediately
    const t = setInterval(poke, 15000)
    return () => clearInterval(t)
  }, [campaign?.status, params.id])

  if (loading) {
    return <div style={{ padding: '24px', color: '#94a3b8' }}>Loading campaign...</div>
  }

  if (!campaign) {
    return <div style={{ padding: '24px', color: '#dc2626' }}>Campaign not found</div>
  }

  // Filter logs by the selected status bucket. "SENT" here means "Meta
  // accepted but not yet delivered" so the bucket is exclusive of
  // DELIVERED/READ. "DELIVERED" similarly excludes READ.
  const filteredLogs = (() => {
    if (logFilter === 'all') return campaign.logs
    return campaign.logs.filter(l => (l.status || '').toUpperCase() === logFilter)
  })()

  const total = campaign.patientCount
  const sent = campaign.sentCount
  const delivered = campaign.deliveredCount
  const read = campaign.readCount
  const failed = campaign.failedCount
  const sentNotYetDelivered = Math.max(sent - delivered, 0)
  const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0
  const readRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0

  const sc = STATUS_COLORS[campaign.status] || STATUS_COLORS.SENT

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0',
      }}>
        <div>
          <Link href="/admin/campaigns" style={{
            fontSize: '13px', color: '#2563eb', textDecoration: 'none', marginBottom: '8px',
            display: 'inline-block',
          }}>
            ← All Campaigns
          </Link>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
            {campaign.name || 'Campaign'}
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            {campaign.city || 'All cities'} · {campaign.language === 'hi' ? 'Hindi' : 'English'}
          </p>
        </div>
        <span style={{
          padding: '6px 14px', borderRadius: '99px', fontSize: '13px',
          fontWeight: '600', backgroundColor: sc.bg, color: sc.color,
        }}>
          {campaign.status}
        </span>
      </div>

      {/* Funnel stat cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '10px', marginBottom: '20px',
      }}>
        {[
          { label: 'Total', value: total, color: '#64748b', sub: 'recipients' },
          { label: 'Sent', value: sent, color: '#2563eb', sub: 'Meta accepted' },
          { label: 'Delivered', value: delivered, color: '#0d9488', sub: 'reached device' },
          { label: 'Read', value: read, color: '#16a34a', sub: 'opened by recipient' },
          { label: 'Failed', value: failed, color: '#dc2626', sub: 'send failed' },
          { label: 'Delivery rate', value: `${deliveryRate}%`, color: '#9333ea', sub: 'of sent' },
        ].map(s => (
          <div key={s.label} style={{
            backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e2e8f0',
            padding: '14px', borderLeft: `4px solid ${s.color}`,
          }}>
            <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px',
              textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 500 }}>
              {s.label}
            </p>
            <p style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a',
              lineHeight: 1.1 }}>
              {s.value}
            </p>
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Secondary funnel hint */}
      <div style={{
        backgroundColor: '#f8fafc', borderRadius: '8px', padding: '10px 14px',
        marginBottom: '20px', fontSize: '12px', color: '#475569',
        display: 'flex', gap: '20px', flexWrap: 'wrap',
      }}>
        <span><strong style={{ color: '#0d9488' }}>{delivered}</strong> of {sent} sent messages delivered ({deliveryRate}%)</span>
        <span><strong style={{ color: '#16a34a' }}>{read}</strong> of {delivered} delivered messages read ({readRate}%)</span>
        {sentNotYetDelivered > 0 && (
          <span><strong style={{ color: '#2563eb' }}>{sentNotYetDelivered}</strong> still in transit (waiting for delivery callback)</span>
        )}
      </div>

      {/* Timing */}
      <div style={{
        display: 'flex', gap: '24px', marginBottom: '20px', fontSize: '13px', color: '#64748b',
      }}>
        <span>Scheduled: {new Date(campaign.scheduledAt).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })} IST</span>
        {campaign.sentAt && (
          <span>Completed: {new Date(campaign.sentAt).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })} IST</span>
        )}
      </div>

      {/* Log Filters */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {([
            { key: 'all',       label: `All (${campaign.logs.length})` },
            { key: 'SENT',      label: `Sent (${sentNotYetDelivered})` },
            { key: 'DELIVERED', label: `Delivered (${Math.max(delivered - read, 0)})` },
            { key: 'READ',      label: `Read (${read})` },
            { key: 'FAILED',    label: `Failed (${failed})` },
          ] as { key: LogFilter; label: string }[]).map(f => (
            <button key={f.key} onClick={() => setLogFilter(f.key)}
              style={{
                padding: '6px 14px', borderRadius: '6px', fontSize: '13px',
                fontWeight: logFilter === f.key ? '600' : '400', cursor: 'pointer',
                border: `1px solid ${logFilter === f.key ? '#2563eb' : '#e2e8f0'}`,
                backgroundColor: logFilter === f.key ? '#eff6ff' : 'white',
                color: logFilter === f.key ? '#2563eb' : '#64748b',
              }}>
              {f.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>
          {filteredLogs.length} recipients
        </span>
      </div>

      {/* Log Table */}
      {filteredLogs.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px', backgroundColor: 'white',
          borderRadius: '10px', border: '1px solid #e2e8f0',
        }}>
          <p style={{ color: '#94a3b8' }}>
            {campaign.status === 'SCHEDULED' ? 'Campaign has not been sent yet' : 'No results to show'}
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['#', 'Patient', 'Phone', 'Status', 'Sent', 'Delivered', 'Read', 'Error'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: '11px',
                    fontWeight: '600', color: '#64748b', textTransform: 'uppercase',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, i) => {
                const lc = STATUS_COLORS[(log.status || '').toUpperCase()] || STATUS_COLORS.PENDING
                return (
                  <tr key={log.id} style={{
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: i % 2 === 0 ? 'white' : '#fafafa',
                  }}>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: '#94a3b8' }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '500', color: '#1e293b' }}>
                      {log.patientName || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: '#64748b' }}>
                      {log.phone}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        fontSize: '12px', fontWeight: '600', padding: '2px 10px',
                        borderRadius: '99px',
                        backgroundColor: lc.bg, color: lc.color,
                      }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#94a3b8' }}>
                      {formatTime(log.sentAt)}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#94a3b8' }}>
                      {formatTime(log.deliveredAt)}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#94a3b8' }}>
                      {formatTime(log.readAt)}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#dc2626', maxWidth: '200px' }}>
                      {log.error || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
