'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Campaign {
  id: string
  name: string
  city: string
  patientCount: number
  status: string
  scheduledAt: string
  sentAt: string | null
  sentCount: number
  failedCount: number
  language: string
}

const STATUS_STYLES: Record<string, {
  bg: string; color: string; label: string
}> = {
  SCHEDULED: { bg: '#eff6ff', color: '#1d4ed8', label: 'Scheduled' },
  SENDING: { bg: '#fef9c3', color: '#92400e', label: 'Sending...' },
  SENT: { bg: '#f0fdf4', color: '#15803d', label: 'Sent' },
  FAILED: { bg: '#fef2f2', color: '#dc2626', label: 'Failed' },
  CANCELLED: { bg: '#f1f5f9', color: '#64748b', label: 'Cancelled' },
}

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () =>
      fetch('/api/campaigns')
        .then(r => r.json())
        .then(data => {
          setCampaigns(Array.isArray(data) ? data : [])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    load()
    const refresh = setInterval(load, 30000)
    return () => clearInterval(refresh)
  }, [])

  // Note: the /api/campaigns/tick poller used to live here, but it's now
  // run from app/admin/layout.tsx so scheduled campaigns fire and stalled
  // SENDING campaigns recover on ANY admin page, not just this one.

  const cancelCampaign = async (id: string) => {
    if (!confirm('Cancel this scheduled campaign?')) return
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const scheduled = campaigns.filter(c => c.status === 'SCHEDULED')
  const sent = campaigns.filter(c => c.status === 'SENT')

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
        paddingBottom: '20px',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
            WhatsApp Campaigns
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Schedule and manage patient messaging campaigns
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/patients')}
          style={{
            backgroundColor: '#25D366',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          + New Campaign (via Patients)
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '28px',
      }}>
        {[
          { label: 'Scheduled', value: scheduled.length, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Campaigns Sent', value: sent.length, color: '#16a34a', bg: '#f0fdf4' },
          {
            label: 'Total Patients Reached',
            value: sent.reduce((acc, c) => acc + c.sentCount, 0).toLocaleString(),
            color: '#9333ea',
            bg: '#faf5ff',
          },
        ].map(card => (
          <div key={card.label} style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            borderLeft: `4px solid ${card.color}`,
            padding: '16px 20px',
          }}>
            <p style={{
              fontSize: '12px',
              color: '#64748b',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
            }}>
              {card.label}
            </p>
            <p style={{ fontSize: '26px', fontWeight: '700', color: card.color }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>Loading campaigns...</p>
      ) : campaigns.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>📢</p>
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
            No campaigns yet
          </p>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
            Go to the Patients tab, select patients, and schedule a campaign
          </p>
          <button
            onClick={() => router.push('/admin/patients')}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Go to Patients →
          </button>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px',
            backgroundColor: '#f8fafc',
            borderBottom: '2px solid #e2e8f0',
            padding: '10px 16px',
          }}>
            {['Campaign', 'City', 'Patients', 'Language', 'Scheduled', 'Action'].map(h => (
              <span key={h} style={{
                fontSize: '11px',
                fontWeight: '600',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {h}
              </span>
            ))}
          </div>

          {campaigns.map((c, i) => {
            const style = STATUS_STYLES[c.status] || STATUS_STYLES.SCHEDULED
            return (
              <div key={c.id} style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px',
                padding: '14px 16px',
                borderBottom: i < campaigns.length - 1 ? '1px solid #f1f5f9' : 'none',
                alignItems: 'center',
                backgroundColor: i % 2 === 0 ? 'white' : '#fafafa',
              }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b', marginBottom: '2px' }}>
                    {c.name}
                  </p>
                  <span style={{
                    fontSize: '11px',
                    padding: '1px 7px',
                    borderRadius: '99px',
                    backgroundColor: style.bg,
                    color: style.color,
                    fontWeight: '500',
                  }}>
                    {style.label}
                  </span>
                </div>
                <span style={{ fontSize: '13px', color: '#374151' }}>{c.city}</span>
                <span style={{ fontSize: '13px', color: '#374151' }}>
                  {c.status === 'SENT' ? `${c.sentCount} sent` : `${c.patientCount} selected`}
                </span>
                <span style={{ fontSize: '13px', color: '#374151' }}>
                  {c.language === 'hi' ? '🇮🇳 Hindi' : '🇬🇧 English'}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {formatDate(c.scheduledAt)}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => router.push(`/admin/campaigns/${c.id}`)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: 'white',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: '#374151',
                    }}
                  >
                    View
                  </button>
                  {c.status === 'SCHEDULED' && (
                    <button
                      onClick={() => cancelCampaign(c.id)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        backgroundColor: '#fef2f2',
                        fontSize: '12px',
                        cursor: 'pointer',
                        color: '#dc2626',
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
