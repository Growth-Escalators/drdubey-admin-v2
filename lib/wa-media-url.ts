// Determines whether a given URL is usable as the `link` field when
// sending a WhatsApp template message with a media header.
//
// Meta's `messages` endpoint requires a publicly-fetchable HTTPS URL.
// Two common non-sendable values end up in our `headerMediaUrl` column:
//   1. Resumable upload handles like "4::aW1hZ2UvanBlZw==:ARYxxx" — only
//      valid for the template CREATION step, not sending.
//   2. Meta's own CDN preview URLs (scontent.whatsapp.net,
//      *.fbcdn.net, lookaside.fbsbx.com) — populated by `extractHeader`
//      when syncing templates from Meta. These look like valid HTTPS
//      URLs, but Meta itself can't re-fetch them at send time and
//      returns a generic "Media upload error".
//
// Use `resolveSendMediaUrl(template)` to get the right URL (or null)
// in one call.

const META_HOSTS = [
  'scontent.whatsapp.net',
  'whatsapp.net',
  'fbcdn.net',
  'lookaside.fbsbx.com',
]

export function isSendableMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false
  if (!url.startsWith('http')) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    return !META_HOSTS.some(meta => host === meta || host.endsWith(`.${meta}`))
  } catch {
    return false
  }
}

interface TemplateWithMedia {
  headerMediaSendUrl?: string | null
  headerMediaUrl?: string | null
}

// Pick the URL we should pass to Meta as the `link` at send time, or null
// if the message should be sent WITHOUT the media header (better than
// failing the entire message because of a bad URL).
export function resolveSendMediaUrl(t: TemplateWithMedia): string | null {
  if (t.headerMediaSendUrl && isSendableMediaUrl(t.headerMediaSendUrl)) {
    return t.headerMediaSendUrl
  }
  if (t.headerMediaUrl && isSendableMediaUrl(t.headerMediaUrl)) {
    return t.headerMediaUrl
  }
  return null
}
