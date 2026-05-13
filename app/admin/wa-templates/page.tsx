'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import {
  parseButtonsJson,
  validateButtons,
  type TemplateButton,
  type ButtonType,
  MAX_BUTTONS,
  MAX_URL_BUTTONS,
  MAX_PHONE_BUTTONS,
  MAX_BUTTON_TEXT,
} from '@/lib/wa-template-buttons'
import { formatWhatsAppText } from '@/lib/wa-format'

interface WATemplate {
  id: string
  name: string
  nameHi?: string
  category: string
  language: string
  bodyEn: string
  bodyHi: string
  metaName?: string
  headerType?: string
  headerText?: string
  headerMediaUrl?: string
  headerMediaSendUrl?: string
  footerText?: string
  buttonsJson?: string | null
  isApproved: boolean
  isActive: boolean
  metaStatus?: string
  metaError?: string
  metaSubmittedAt?: string
  source?: 'new' | 'legacy'
}

type HeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
const HEADER_TYPES: HeaderType[] = ['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT']
const BUTTON_TYPES: ButtonType[] = ['QUICK_REPLY', 'URL', 'PHONE_NUMBER']
const BUTTON_TYPE_LABELS: Record<ButtonType, string> = {
  QUICK_REPLY: 'Quick Reply',
  URL: 'Visit URL',
  PHONE_NUMBER: 'Call Phone',
}

interface LegacyTemplate {
  id: string
  name: string
  displayName?: string
  bodyContent?: string
  content?: string
  body?: string
  language?: string
  category?: string
}

const CATEGORIES = [
  'MARKETING',
  'UTILITY',
  'AUTHENTICATION',
]

function WhatsAppBubble({
  text,
  headerType = 'NONE',
  headerText = '',
  headerMediaReady = false,
  footerText = '',
  buttons = [],
}: {
  text: string
  headerType?: string
  headerText?: string
  headerMediaReady?: boolean
  footerText?: string
  buttons?: TemplateButton[]
}) {
  if (!text && !headerText && !headerMediaReady && !footerText && !buttons.length) return (
    <div style={{
      backgroundColor: '#f0f0f0',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      color: '#94a3b8',
      fontSize: '13px',
    }}>
      Preview will appear here as you type
    </div>
  )

  const mediaPlaceholder = (() => {
    if (headerType === 'IMAGE') return headerMediaReady ? '🖼️ Image' : '🖼️ Image will appear here'
    if (headerType === 'VIDEO') return headerMediaReady ? '🎬 Video' : '🎬 Video will appear here'
    if (headerType === 'DOCUMENT') return headerMediaReady ? '📄 Document' : '📄 PDF will appear here'
    return ''
  })()

  return (
    <div style={{
      backgroundColor: '#e5ddd5',
      borderRadius: '12px',
      padding: '16px',
      minHeight: '120px',
    }}>
      <div style={{
        maxWidth: '85%',
        backgroundColor: '#dcf8c6',
        borderRadius: '0 8px 8px 8px',
        padding: '10px 14px',
        position: 'relative',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      }}>
        {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && (
          <div style={{
            backgroundColor: '#cce8b8',
            borderRadius: '6px',
            padding: '24px 12px',
            textAlign: 'center',
            color: '#3a6b21',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '8px',
          }}>
            {mediaPlaceholder}
          </div>
        )}
        {headerType === 'TEXT' && headerText && (
          <p style={{
            fontSize: '14px',
            color: '#111b21',
            fontWeight: 700,
            margin: '0 0 6px',
          }}>
            {headerText}
          </p>
        )}
        <p style={{
          fontSize: '13.5px',
          color: '#111b21',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.5,
          margin: 0,
          fontFamily: '-apple-system, sans-serif',
        }}>
          {formatWhatsAppText(
            text
              .replace('{{1}}', 'रमेश कुमार')
              .replace('{{2}}', 'बीकानेर')
              .replace('{{3}}', '15 अप्रैल 2026')
              .replace('{{4}}', 'सिटी हॉल, बीकानेर')
              .replace('{{5}}', 'सुबह 10 बजे')
          )}
        </p>
        {footerText && (
          <p style={{
            fontSize: '12px',
            color: '#667781',
            margin: '6px 0 0',
          }}>
            {footerText}
          </p>
        )}
        <p style={{
          fontSize: '11px',
          color: '#667781',
          textAlign: 'right',
          margin: '4px 0 0',
        }}>
          9:41 AM ✓✓
        </p>
      </div>

      {/* Buttons rendered as WhatsApp does — Quick Replies as light chips
          below the bubble, CTA (URL / Phone) as full-width tappable rows
          with the appropriate icon. */}
      {buttons.length > 0 && (
        <div style={{
          marginTop: '8px',
          maxWidth: '85%',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {buttons.map((b, i) => {
            const baseRow: React.CSSProperties = {
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '10px 14px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: '#1d4ed8',
              fontSize: '13.5px',
              fontWeight: 500,
            }
            if (b.type === 'URL') {
              return (
                <div key={i} style={baseRow}>
                  <span>🔗</span><span>{b.text || 'Visit'}</span>
                </div>
              )
            }
            if (b.type === 'PHONE_NUMBER') {
              return (
                <div key={i} style={baseRow}>
                  <span>📞</span><span>{b.text || 'Call'}</span>
                </div>
              )
            }
            return (
              <div key={i} style={baseRow}>
                {b.text || 'Quick Reply'}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TemplateCard({
  template,
  language,
  onEdit,
  onDelete,
  onSubmitToMeta,
}: {
  template: WATemplate
  language: 'hi' | 'en'
  onEdit: (t: WATemplate) => void
  onDelete: (id: string) => void
  onSubmitToMeta: (id: string) => void
}) {
  const body = language === 'hi'
    ? template.bodyHi
    : template.bodyEn
  const preview = body?.slice(0, 100) +
    (body?.length > 100 ? '...' : '')

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '6px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#1e293b',
          }}>
            {language === 'hi' && template.nameHi
              ? template.nameHi
              : template.name}
          </span>
          <span style={{
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '99px',
            backgroundColor:
              template.category === 'MARKETING'
                ? '#faf5ff' : '#eff6ff',
            color:
              template.category === 'MARKETING'
                ? '#7c3aed' : '#1d4ed8',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
          }}>
            {template.category}
          </span>
          {(() => {
            const s = template.metaStatus || 'DRAFT'
            const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
              DRAFT: { bg: '#f1f5f9', color: '#64748b', label: 'Draft' },
              PENDING: { bg: '#fef9c3', color: '#92400e', label: 'Under Review' },
              APPROVED: { bg: '#f0fdf4', color: '#15803d', label: 'Approved' },
              REJECTED: { bg: '#fef2f2', color: '#dc2626', label: 'Rejected' },
            }
            const cfg = statusConfig[s] || statusConfig.DRAFT
            return (
              <span style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '99px',
                backgroundColor: cfg.bg,
                color: cfg.color,
                fontWeight: '500',
              }}>
                {s === 'APPROVED' ? '✓ ' : s === 'REJECTED' ? '✗ ' : s === 'PENDING' ? '⏳ ' : ''}{cfg.label}
              </span>
            )
          })()}
          {template.source === 'legacy' && (
            <span style={{
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '99px',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              fontWeight: '500',
            }}>
              Legacy
            </span>
          )}
        </div>
        <p style={{
          fontSize: '13px',
          color: '#64748b',
          lineHeight: 1.5,
          margin: 0,
          fontFamily: language === 'hi'
            ? 'sans-serif' : 'inherit',
        }}>
          {preview || 'No content'}
        </p>
        {template.metaName && (
          <p style={{
            fontSize: '11px',
            color: '#94a3b8',
            marginTop: '6px',
            fontFamily: 'monospace',
          }}>
            {template.metaName}
          </p>
        )}
        {template.metaStatus === 'REJECTED' && template.metaError && (
          <p style={{
            fontSize: '11px',
            color: '#dc2626',
            marginTop: '4px',
            backgroundColor: '#fef2f2',
            padding: '4px 8px',
            borderRadius: '4px',
          }}>
            Error: {template.metaError}
          </p>
        )}
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        flexShrink: 0,
      }}>
        {template.source !== 'legacy' && (!template.metaStatus || template.metaStatus === 'DRAFT' || template.metaStatus === 'REJECTED') && (
          <button
            onClick={() => onSubmitToMeta(template.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#2563eb',
              fontSize: '12px',
              cursor: 'pointer',
              color: 'white',
              fontWeight: '600',
            }}
          >
            Submit to Meta
          </button>
        )}
        <button
          onClick={() => onEdit(template)}
          disabled={template.source === 'legacy'}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: template.source === 'legacy' ? '#f8fafc' : 'white',
            fontSize: '12px',
            cursor: template.source === 'legacy' ? 'not-allowed' : 'pointer',
            color: template.source === 'legacy' ? '#94a3b8' : '#374151',
            fontWeight: '500',
          }}
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(template.id)}
          disabled={template.source === 'legacy'}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            border: template.source === 'legacy' ? '1px solid #e2e8f0' : '1px solid #fecaca',
            backgroundColor: template.source === 'legacy' ? '#f8fafc' : '#fef2f2',
            fontSize: '12px',
            cursor: template.source === 'legacy' ? 'not-allowed' : 'pointer',
            color: template.source === 'legacy' ? '#94a3b8' : '#dc2626',
            fontWeight: '500',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function TemplateForm({
  language,
  initial,
  onSave,
  onCancel,
}: {
  language: 'hi' | 'en'
  initial?: WATemplate | null
  onSave: (data: Record<string, unknown>) => Promise<void>
  onCancel: () => void
}) {
  // Template name field consolidated: only metaName is shown in the UI.
  // The internal `name` / `nameHi` fields in the DB are derived from metaName
  // on save (kept for backward-compat with existing rows + the listing view).
  const [category, setCategory] = useState(
    initial?.category || 'UTILITY'
  )
  const [bodyHi, setBodyHi] = useState(
    initial?.bodyHi || ''
  )
  const [bodyEn, setBodyEn] = useState(
    initial?.bodyEn || ''
  )
  const [metaName, setMetaName] = useState(
    initial?.metaName || initial?.name || ''
  )
  const [headerType, setHeaderType] = useState<HeaderType>(
    ((initial?.headerType as HeaderType) || 'NONE')
  )
  const [headerText, setHeaderText] = useState(
    initial?.headerText || ''
  )
  const [headerMediaUrl, setHeaderMediaUrl] = useState(
    initial?.headerMediaUrl || ''
  )
  const [headerMediaSendUrl, setHeaderMediaSendUrl] = useState(
    initial?.headerMediaSendUrl || ''
  )
  const [headerFileName, setHeaderFileName] = useState('')
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [footerText, setFooterText] = useState(
    initial?.footerText || ''
  )
  const [buttons, setButtons] = useState<TemplateButton[]>(
    parseButtonsJson(initial?.buttonsJson)
  )
  const [skipMetaSubmit, setSkipMetaSubmit] = useState(false)
  const [isApproved, setIsApproved] = useState(
    initial?.isApproved || false
  )
  const [saving, setSaving] = useState(false)
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Counters used by the Add-button row to grey out types that hit a per-type
  // limit. Keeps the UI honest with what the API will accept.
  const urlButtonCount = buttons.filter(b => b.type === 'URL').length
  const phoneButtonCount = buttons.filter(b => b.type === 'PHONE_NUMBER').length
  const canAddMoreButtons = buttons.length < MAX_BUTTONS

  const addButton = (type: ButtonType) => {
    if (!canAddMoreButtons) return
    if (type === 'URL' && urlButtonCount >= MAX_URL_BUTTONS) return
    if (type === 'PHONE_NUMBER' && phoneButtonCount >= MAX_PHONE_BUTTONS) return
    setButtons([...buttons, { type, text: '' }])
  }

  const updateButton = (i: number, patch: Partial<TemplateButton>) => {
    setButtons(buttons.map((b, idx) => idx === i ? { ...b, ...patch } : b))
  }

  const removeButton = (i: number) => {
    setButtons(buttons.filter((_, idx) => idx !== i))
  }

  // Wraps the current textarea selection with WhatsApp markdown markers.
  // If nothing is selected we insert the marker pair and place the caret
  // between them so the user can start typing right away.
  const wrapBodySelection = (marker: string) => {
    const ta = bodyTextareaRef.current
    if (!ta) return
    const start = ta.selectionStart ?? 0
    const end = ta.selectionEnd ?? 0
    const value = language === 'hi' ? bodyHi : bodyEn
    const before = value.slice(0, start)
    const selected = value.slice(start, end)
    const after = value.slice(end)
    const inner = selected || 'text'
    const next = `${before}${marker}${inner}${marker}${after}`
    if (language === 'hi') setBodyHi(next); else setBodyEn(next)
    // Restore selection so the user sees the result wrapped
    requestAnimationFrame(() => {
      ta.focus()
      const newStart = start + marker.length
      const newEnd = newStart + inner.length
      ta.setSelectionRange(newStart, newEnd)
    })
  }

  const acceptForType = (t: HeaderType) =>
    t === 'IMAGE' ? 'image/jpeg,image/png'
      : t === 'VIDEO' ? 'video/mp4,video/3gpp'
        : t === 'DOCUMENT' ? 'application/pdf'
          : ''

  const handleMediaUpload = async (file: File) => {
    if (!['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) return
    setUploadingMedia(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('format', headerType)
      const res = await fetch('/api/wa-templates/media', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Upload failed')
        return
      }
      setHeaderMediaUrl(data.handle)
      setHeaderFileName(file.name)
      toast.success('Media uploaded — ready to submit')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      toast.error(msg)
    } finally {
      setUploadingMedia(false)
    }
  }

  const previewText = language === 'hi'
    ? bodyHi : bodyEn

  const headerNeedsMedia =
    ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && !headerMediaUrl
  const headerNeedsText = headerType === 'TEXT' && !headerText.trim()
  const buttonsCheck = validateButtons(buttons)
  const canSave =
    !!metaName.trim() &&
    !headerNeedsMedia &&
    !headerNeedsText &&
    !uploadingMedia &&
    buttonsCheck.ok

  const handleSave = async () => {
    setSaving(true)
    // Derive a human-friendly display name from the snake_case metaName for
    // the listing view (e.g. "opd_camp_hi" → "OPD Camp Hi"). DB still stores
    // both fields.
    const displayName = metaName
      .split('_')
      .map(w => w ? w[0].toUpperCase() + w.slice(1) : w)
      .join(' ')
      .trim()
    await onSave({
      name: displayName || metaName,
      nameHi: null,
      category,
      language,
      bodyHi,
      bodyEn,
      metaName,
      headerType,
      headerText: headerType === 'TEXT' ? headerText : '',
      headerMediaUrl:
        ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)
          ? headerMediaUrl : '',
      headerMediaSendUrl:
        ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)
          ? headerMediaSendUrl : '',
      footerText,
      buttons,
      skipMetaSubmit,
      isApproved,
      isActive: true,
    })
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: language === 'hi' ? 'sans-serif' : 'inherit',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '2px solid #2563eb',
      padding: '24px',
      marginBottom: '20px',
    }}>
      <h3 style={{
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: '20px',
      }}>
        {initial ? 'Edit template' : `New ${language === 'hi' ? 'Hindi 🇮🇳' : 'English 🇬🇧'} template`}
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
      }}>
        {/* Left column — form fields */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div>
            <label style={labelStyle}>
              Template name{' '}
              <span style={{
                color: '#94a3b8',
                fontWeight: '400',
                textTransform: 'none',
                letterSpacing: '0',
                marginLeft: '6px',
              }}>
                (lowercase, underscores, submitted to Meta)
              </span>
            </label>
            <input
              value={metaName}
              onChange={e => setMetaName(
                // Sanitize live: Meta only accepts [a-z0-9_]
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_\s]/g, '')
                  .replace(/\s+/g, '_')
              )}
              placeholder="e.g. opd_camp_hi"
              style={{
                ...inputStyle,
                fontFamily: 'monospace',
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{
                ...inputStyle,
                cursor: 'pointer',
              }}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Header section */}
          <div>
            <label style={labelStyle}>Header (optional)</label>
            <select
              value={headerType}
              onChange={e => {
                const next = e.target.value as HeaderType
                setHeaderType(next)
                if (next === 'NONE' || next === 'TEXT') {
                  setHeaderMediaUrl('')
                  setHeaderFileName('')
                }
                if (next !== 'TEXT') setHeaderText('')
              }}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {HEADER_TYPES.map(t => (
                <option key={t} value={t}>
                  {t === 'NONE' ? 'No header' : t}
                </option>
              ))}
            </select>

            {headerType === 'TEXT' && (
              <input
                value={headerText}
                onChange={e => setHeaderText(e.target.value)}
                maxLength={60}
                placeholder="Header text (max 60 chars)"
                style={{ ...inputStyle, marginTop: '8px' }}
              />
            )}

            {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && (
              <div style={{ marginTop: '8px' }}>
                <input
                  type="file"
                  accept={acceptForType(headerType)}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) handleMediaUpload(f)
                  }}
                  disabled={uploadingMedia}
                  style={{
                    width: '100%',
                    fontSize: '13px',
                    padding: '8px 0',
                    color: '#475569',
                  }}
                />
                <p style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  marginTop: '4px',
                }}>
                  {headerType === 'IMAGE' && 'JPG or PNG, max 5 MB'}
                  {headerType === 'VIDEO' && 'MP4 or 3GPP, max 16 MB'}
                  {headerType === 'DOCUMENT' && 'PDF, max 100 MB'}
                </p>
                {uploadingMedia && (
                  <p style={{
                    fontSize: '12px',
                    color: '#2563eb',
                    marginTop: '6px',
                  }}>
                    Uploading to Meta…
                  </p>
                )}
                {headerMediaUrl && !uploadingMedia && (
                  <p style={{
                    fontSize: '12px',
                    color: '#16a34a',
                    marginTop: '6px',
                  }}>
                    ✓ Uploaded
                    {headerFileName ? ` — ${headerFileName}` : ''}
                  </p>
                )}

                {/* Public send URL — required for the message to actually
                    arrive with the media attached. The resumable handle
                    above is only used during template creation; Meta
                    needs a publicly-fetchable URL when sending. */}
                <div style={{ marginTop: '10px' }}>
                  <label style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '4px',
                    display: 'block',
                  }}>
                    Public media URL{' '}
                    <span style={{
                      color: '#dc2626',
                      fontWeight: '400',
                      textTransform: 'none',
                    }}>
                      (required for sending the same image in messages)
                    </span>
                  </label>
                  <input
                    type="url"
                    value={headerMediaSendUrl}
                    onChange={e => setHeaderMediaSendUrl(e.target.value)}
                    placeholder="https://admin.drdubay.in/images/wa-headers/poster.jpg"
                    style={{
                      ...inputStyle,
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      padding: '8px 10px',
                    }}
                  />
                  <p style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    marginTop: '4px',
                    lineHeight: 1.4,
                  }}>
                    Paste any publicly-accessible HTTPS URL hosting the same
                    file. Without this, messages will send WITHOUT the media
                    header. You can host images under public/images/wa-headers/
                    or use any image hosting service.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>
              {language === 'hi'
                ? 'Message body (Hindi 🇮🇳)'
                : 'Message body (English 🇬🇧)'}
            </label>

            {/* Formatting toolbar — wraps the textarea selection with
                WhatsApp markdown so users don't have to type the markers
                manually. Same as Wati / AISensy / DoubleTick. */}
            <div style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '6px',
            }}>
              {[
                { label: 'B', marker: '*', title: 'Bold (*text*)', weight: 700 },
                { label: 'I', marker: '_', title: 'Italic (_text_)', style: 'italic' },
                { label: 'S', marker: '~', title: 'Strikethrough (~text~)', deco: 'line-through' },
                { label: '</>', marker: '```', title: 'Monospace (```text```)', mono: true },
              ].map(b => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => wrapBodySelection(b.marker)}
                  title={b.title}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white',
                    fontSize: '13px',
                    fontWeight: b.weight || 500,
                    fontStyle: b.style || 'normal',
                    textDecoration: b.deco || 'none',
                    fontFamily: b.mono ? 'monospace' : 'inherit',
                    color: '#374151',
                    cursor: 'pointer',
                    minWidth: '36px',
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>

            <textarea
              ref={bodyTextareaRef}
              value={language === 'hi' ? bodyHi : bodyEn}
              onChange={e => {
                if (language === 'hi') {
                  setBodyHi(e.target.value)
                } else {
                  setBodyEn(e.target.value)
                }
              }}
              placeholder={language === 'hi'
                ? 'नमस्ते {{1}}, ...'
                : 'Hello {{1}}, ...'}
              rows={7}
              style={{
                ...inputStyle,
                resize: 'vertical',
                lineHeight: 1.6,
              }}
            />
            <p style={{
              fontSize: '11px',
              color: '#94a3b8',
              marginTop: '4px',
            }}>
              Use {'{{1}}'} {'{{2}}'} {'{{3}}'} for dynamic variables.
              Format with *bold*, _italic_, ~strike~, ```mono```.
            </p>
          </div>

          <div>
            <label style={labelStyle}>Footer (optional)</label>
            <input
              value={footerText}
              onChange={e => setFooterText(e.target.value)}
              maxLength={60}
              placeholder="e.g. Dr. Dheeraj Dubay Clinic"
              style={inputStyle}
            />
          </div>

          {/* Buttons section — Quick Reply / URL / Phone, up to 10 total
              with per-type caps (max 2 URL, max 1 phone). The shape we
              store in DB matches what extractButtonsJson() saves when
              syncing from Meta, so the send pipeline is unchanged. */}
          <div>
            <label style={labelStyle}>
              Buttons (optional)
              <span style={{
                color: '#94a3b8',
                fontWeight: '400',
                textTransform: 'none',
                letterSpacing: '0',
                marginLeft: '8px',
              }}>
                {buttons.length} / {MAX_BUTTONS} used
              </span>
            </label>

            {buttons.length > 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '8px',
              }}>
                {buttons.map((btn, i) => {
                  const isOverText = btn.text.length > MAX_BUTTON_TEXT
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'stretch',
                        padding: '8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <select
                        value={btn.type}
                        onChange={e => updateButton(i, {
                          type: e.target.value as ButtonType,
                          // Clear the irrelevant field so the DB row stays clean
                          url: undefined,
                          phone_number: undefined,
                        })}
                        style={{
                          ...inputStyle,
                          width: '140px',
                          cursor: 'pointer',
                          padding: '8px 10px',
                          fontSize: '13px',
                        }}
                      >
                        {BUTTON_TYPES.map(t => (
                          <option key={t} value={t}>{BUTTON_TYPE_LABELS[t]}</option>
                        ))}
                      </select>

                      <input
                        value={btn.text}
                        onChange={e => updateButton(i, { text: e.target.value })}
                        maxLength={MAX_BUTTON_TEXT}
                        placeholder={`Button text (${MAX_BUTTON_TEXT} max)`}
                        style={{
                          ...inputStyle,
                          flex: 1,
                          padding: '8px 10px',
                          fontSize: '13px',
                          borderColor: isOverText ? '#dc2626' : '#e2e8f0',
                        }}
                      />

                      {btn.type === 'URL' && (
                        <input
                          value={btn.url || ''}
                          onChange={e => updateButton(i, { url: e.target.value })}
                          placeholder="https://..."
                          style={{
                            ...inputStyle,
                            flex: 1.5,
                            padding: '8px 10px',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                          }}
                        />
                      )}
                      {btn.type === 'PHONE_NUMBER' && (
                        <input
                          value={btn.phone_number || ''}
                          onChange={e => updateButton(i, { phone_number: e.target.value })}
                          placeholder="+918955373205"
                          style={{
                            ...inputStyle,
                            flex: 1.5,
                            padding: '8px 10px',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                          }}
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => removeButton(i)}
                        aria-label="Remove button"
                        style={{
                          padding: '0 12px',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 600,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {BUTTON_TYPES.map(t => {
                const disabled =
                  !canAddMoreButtons ||
                  (t === 'URL' && urlButtonCount >= MAX_URL_BUTTONS) ||
                  (t === 'PHONE_NUMBER' && phoneButtonCount >= MAX_PHONE_BUTTONS)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addButton(t)}
                    disabled={disabled}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px dashed #cbd5e1',
                      backgroundColor: disabled ? '#f1f5f9' : 'white',
                      color: disabled ? '#94a3b8' : '#1e40af',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    + {BUTTON_TYPE_LABELS[t]}
                  </button>
                )
              })}
            </div>

            <p style={{
              fontSize: '11px',
              color: '#94a3b8',
              marginTop: '6px',
            }}>
              Max {MAX_BUTTONS} buttons. Up to {MAX_URL_BUTTONS} URL,
              {' '}{MAX_PHONE_BUTTONS} phone. Quick replies invite users to
              tap a pre-defined reply.
            </p>
            {!buttonsCheck.ok && (
              <p style={{
                fontSize: '12px',
                color: '#dc2626',
                marginTop: '4px',
              }}>
                {buttonsCheck.error}
              </p>
            )}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <input
              type="checkbox"
              id="skip-meta"
              checked={skipMetaSubmit}
              onChange={e => setSkipMetaSubmit(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <label htmlFor="skip-meta" style={{
              fontSize: '13px',
              color: '#374151',
              cursor: 'pointer',
            }}>
              Save as draft (don&apos;t submit to Meta yet)
            </label>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <input
              type="checkbox"
              id="approved"
              checked={isApproved}
              onChange={e => setIsApproved(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <label htmlFor="approved" style={{
              fontSize: '13px',
              color: '#374151',
              cursor: 'pointer',
            }}>
              Mark as approved by Meta
            </label>
          </div>
        </div>

        {/* Right column — preview */}
        <div>
          <label style={labelStyle}>
            Live preview
          </label>
          <WhatsAppBubble
            text={previewText}
            headerType={headerType}
            headerText={headerText}
            headerMediaReady={!!headerMediaUrl}
            footerText={footerText}
            buttons={buttons}
          />
          <div style={{
            marginTop: '12px',
            padding: '10px 14px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}>
            <p style={{
              fontSize: '11px',
              color: '#94a3b8',
              lineHeight: 1.6,
            }}>
              Variables filled with sample values:{' '}
              {`{{1}}`} → रमेश कुमार,{' '}
              {`{{2}}`} → बीकानेर,{' '}
              {`{{3}}`} → 15 अप्रैल 2026
            </p>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '10px',
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid #e2e8f0',
      }}>
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          style={{
            padding: '10px 28px',
            backgroundColor: (saving || !canSave) ? '#93c5fd' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: (saving || !canSave) ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Save template'}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '10px 20px',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function WATemplatesPage() {
  const [language, setLanguage] = useState<'hi' | 'en'>('hi')
  const [templates, setTemplates] = useState<WATemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] =
    useState<WATemplate | null>(null)

  // useCallback so the polling effect below can list this in its deps
  // without re-firing on every render (which would tear down + re-create
  // the setInterval each render).
  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const [newRes, legacyRes] = await Promise.all([
        fetch('/api/wa-templates'),
        fetch('/api/templates'),
      ])
      const newTemplates = await newRes.json()
      let legacyTemplates: WATemplate[] = []

      if (legacyRes.ok) {
        const legacy = await legacyRes.json()
        legacyTemplates = (
          Array.isArray(legacy) ? legacy : []
        ).map((t: LegacyTemplate) => ({
          id: t.id,
          name: t.name || 'Unnamed',
          nameHi: undefined,
          category: t.category || 'UTILITY',
          language: t.language || 'hi',
          bodyHi: t.bodyContent || t.content || t.body || '',
          bodyEn: t.bodyContent || t.content || t.body || '',
          metaName: undefined,
          isApproved: false,
          isActive: true,
          source: 'legacy' as const,
        }))
      }

      const all: WATemplate[] = [
        ...(Array.isArray(newTemplates)
          ? newTemplates.map((t: WATemplate) => ({
            ...t, source: 'new' as const,
          }))
          : []
        ),
        ...legacyTemplates,
      ]
      setTemplates(all)
    } catch {
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // List of templates currently PENDING Meta review, memoized so the
  // polling effect below only re-fires when this list actually changes.
  // Previously a complex expression sat directly in the dep array, which
  // the linter flagged because it can't statically check what triggers
  // a re-run.
  const pendingTemplates = useMemo(
    () => templates.filter(t => t.source === 'new' && t.metaStatus === 'PENDING'),
    [templates],
  )

  // Auto-poll PENDING templates every 60 seconds for 5 minutes
  useEffect(() => {
    if (pendingTemplates.length === 0) return

    const interval = setInterval(async () => {
      let anyChanged = false
      for (const t of pendingTemplates) {
        try {
          const res = await fetch(`/api/wa-templates/${t.id}/status`)
          const data = await res.json()
          if (data.changed) {
            anyChanged = true
            if (data.metaStatus === 'APPROVED') {
              toast.success(`"${t.name}" approved by Meta!`)
            } else if (data.metaStatus === 'REJECTED') {
              toast.error(`"${t.name}" was rejected by Meta`)
            }
          }
        } catch {}
      }
      if (anyChanged) fetchTemplates()
    }, 60000) // Check every 60 seconds

    // Stop after 5 minutes
    const timeout = setTimeout(() => clearInterval(interval), 5 * 60 * 1000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [pendingTemplates, fetchTemplates])

  const filtered = templates.filter(t => {
    if (t.source === 'legacy') {
      return t.language === language || !t.language
    }
    return language === 'hi' ? !!t.bodyHi : !!t.bodyEn
  })

  const handleSave = async (data: Record<string, unknown>) => {
    const url = editingTemplate
      ? `/api/wa-templates/${editingTemplate.id}`
      : '/api/wa-templates'
    const method = editingTemplate ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (!res.ok) {
      alert(result.error || 'Failed to save template')
      return
    }

    toast.success('Template saved successfully')
    setShowForm(false)
    setEditingTemplate(null)
    await fetchTemplates()
  }

  const handleEdit = (t: WATemplate) => {
    if (t.source === 'legacy') return
    setEditingTemplate(t)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return
    await fetch(`/api/wa-templates/${id}`, { method: 'DELETE' })
    toast.success('Template deleted')
    await fetchTemplates()
  }

  const handleSubmitToMeta = async (id: string) => {
    toast.loading('Submitting to Meta...', { id: 'submit-meta' })
    try {
      const res = await fetch(`/api/wa-templates/${id}/submit`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Submitted to Meta! Status will update after review.', { id: 'submit-meta' })
        await fetchTemplates()
      } else {
        toast.error(`Failed: ${data.error || 'Unknown error'}`, { id: 'submit-meta', duration: 5000 })
        await fetchTemplates()
      }
    } catch {
      toast.error('Failed to submit', { id: 'submit-meta' })
    }
  }

  const handleSyncStatus = async () => {
    toast.loading('Syncing with Meta...', { id: 'sync-meta' })
    try {
      const res = await fetch('/api/wa-templates/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        const parts: string[] = []
        if (data.updated) parts.push(`${data.updated} updated`)
        if (data.imported) parts.push(`${data.imported} imported from Meta`)
        const msg = parts.length ? `Synced! ${parts.join(', ')}.` : 'Synced! No changes.'
        toast.success(msg, { id: 'sync-meta' })
        await fetchTemplates()
      } else {
        toast.error('Sync failed', { id: 'sync-meta' })
      }
    } catch {
      toast.error('Sync failed', { id: 'sync-meta' })
    }
  }

  const hiCount = templates.filter(t => t.source === 'new' && !!t.bodyHi).length
  const enCount = templates.filter(t => t.source === 'new' && !!t.bodyEn).length
  const legacyCount = templates.filter(t => t.source === 'legacy').length

  return (
    <div style={{ padding: '24px', maxWidth: '1000px' }}>
      <Toaster position="top-right" />
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
        paddingBottom: '20px',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: '700',
            color: '#0f172a',
            marginBottom: '4px',
          }}>
            WhatsApp Templates
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            {hiCount} Hindi · {enCount} English · {legacyCount} Legacy
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditingTemplate(null)
              setShowForm(true)
            }}
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
            + New {language === 'hi' ? 'Hindi 🇮🇳' : 'English 🇬🇧'} Template
          </button>
        )}
        <button
          onClick={handleSyncStatus}
          style={{
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          Sync from Meta
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <>
          <TemplateForm
            language={language}
            initial={editingTemplate}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false)
              setEditingTemplate(null)
            }}
          />
          {/* Best Practices */}
          <div style={{
            backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0',
            padding: '16px 20px', marginBottom: '24px',
          }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '10px' }}>
              Template Best Practices
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', color: '#64748b', lineHeight: 1.7 }}>
              <div>
                <p style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Naming</p>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  <li>Use lowercase with underscores: <code style={{ fontSize: '11px', backgroundColor: '#e2e8f0', padding: '1px 4px', borderRadius: '3px' }}>opd_camp_jaipur</code></li>
                  <li>Keep names unique and descriptive</li>
                  <li>Don&apos;t reuse deleted template names (Meta remembers for 30 days)</li>
                </ul>
              </div>
              <div>
                <p style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Category</p>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  <li><strong>UTILITY</strong>: reminders, follow-ups, OPD (approved faster)</li>
                  <li><strong>MARKETING</strong>: promotions, campaigns (takes 24-48h)</li>
                  <li>Avoid promotional language in UTILITY templates</li>
                </ul>
              </div>
              <div>
                <p style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Body Content</p>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  <li>Keep under 1024 characters</li>
                  <li>Use {'{{1}}'}, {'{{2}}'} for variables</li>
                  <li>Hindi: use <code style={{ fontSize: '11px', backgroundColor: '#e2e8f0', padding: '1px 4px', borderRadius: '3px' }}>hi</code> language code</li>
                </ul>
              </div>
              <div>
                <p style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Approval</p>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  <li>UTILITY templates: usually approved in minutes</li>
                  <li>MARKETING templates: 24-48 hours</li>
                  <li>Auto-check runs every 60s for 5 minutes after submission</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Language Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '20px',
      }}>
        <span style={{
          fontSize: '13px',
          color: '#64748b',
          fontWeight: '500',
        }}>
          Showing:
        </span>
        <div style={{
          display: 'flex',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
          padding: '3px',
          gap: '2px',
        }}>
          {([
            { key: 'hi' as const, label: '🇮🇳 Hindi' },
            { key: 'en' as const, label: '🇬🇧 English' },
          ]).map(lang => (
            <button
              key={lang.key}
              onClick={() => {
                setLanguage(lang.key)
                setShowForm(false)
                setEditingTemplate(null)
              }}
              style={{
                padding: '7px 20px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: language === lang.key ? '600' : '400',
                backgroundColor: language === lang.key ? 'white' : 'transparent',
                color: language === lang.key ? '#1e293b' : '#64748b',
                boxShadow: language === lang.key
                  ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>
          {filtered.length} templates
        </span>
      </div>

      {/* Template list */}
      {loading ? (
        <p style={{
          color: '#94a3b8',
          textAlign: 'center',
          padding: '40px',
        }}>
          Loading templates...
        </p>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px dashed #e2e8f0',
        }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>
            {language === 'hi' ? '🇮🇳' : '🇬🇧'}
          </p>
          <p style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '8px',
          }}>
            No {language === 'hi' ? 'Hindi' : 'English'} templates yet
          </p>
          <p style={{
            fontSize: '14px',
            color: '#64748b',
            marginBottom: '20px',
          }}>
            Click the button above to create your first{' '}
            {language === 'hi' ? 'Hindi' : 'English'} template
          </p>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          {filtered.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              language={language}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSubmitToMeta={handleSubmitToMeta}
            />
          ))}
        </div>
      )}
    </div>
  )
}
