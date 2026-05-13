import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Vercel Blob upload for WhatsApp template header media.
//
// Why Vercel Blob:
// - Free tier covers our usage (1 GB storage, 50 GB egress / month).
// - Single env var (BLOB_READ_WRITE_TOKEN) auto-provisioned when the
//   Blob store is connected in the Vercel dashboard.
// - put() returns a public URL directly — no proxy route needed.
// - Files served from a public CDN domain Meta can fetch.
//
// Limits match Meta's WhatsApp Cloud API send-time limits.
const ALLOWED = {
  IMAGE:    { types: ['image/jpeg', 'image/png'],                      max: 5 * 1024 * 1024 },
  VIDEO:    { types: ['video/mp4', 'video/3gpp'],                      max: 16 * 1024 * 1024 },
  DOCUMENT: { types: ['application/pdf'],                              max: 100 * 1024 * 1024 },
} as const

type Format = keyof typeof ALLOWED

function sanitizeName(name: string): string {
  const dot = name.lastIndexOf('.')
  const stem = (dot > 0 ? name.slice(0, dot) : name)
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60)
  const ext = (dot > 0 ? name.slice(dot) : '').toLowerCase()
  return (stem || 'file') + ext
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData()
    const file = fd.get('file') as File | null
    const format = (fd.get('format') as string | null)?.toUpperCase() as Format | undefined

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }
    if (!format || !(format in ALLOWED)) {
      return NextResponse.json({ error: 'format must be IMAGE / VIDEO / DOCUMENT' }, { status: 400 })
    }

    const rules = ALLOWED[format]
    if (!rules.types.includes(file.type as never)) {
      return NextResponse.json({
        error: `Invalid file type for ${format}. Got ${file.type || 'unknown'}, expected ${rules.types.join(' / ')}`,
      }, { status: 400 })
    }
    if (file.size > rules.max) {
      return NextResponse.json({
        error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max for ${format}: ${Math.round(rules.max / 1024 / 1024)} MB`,
      }, { status: 400 })
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({
        error:
          'Vercel Blob is not connected. In Vercel dashboard go to ' +
          'Storage → Create → Blob → connect to this project, then redeploy.',
      }, { status: 500 })
    }

    const key = `wa-headers/${Date.now()}-${sanitizeName(file.name)}`
    const blob = await put(key, file, {
      access: 'public',
      contentType: file.type,
      // Random suffix off — we already prefix the timestamp ourselves,
      // and a deterministic path is easier to debug.
      addRandomSuffix: false,
    })

    return NextResponse.json({ url: blob.url, key, size: file.size })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload failed'
    console.error('[WA_TEMPLATE_MEDIA_UPLOAD]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
