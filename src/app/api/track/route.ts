/* ============================================================
   App-side first-party, cookieless analytics collector (Edge).
   Mirrors the marketing site's /api/track but tags site='app', so app
   traffic flows into the same `page_views` table and the same intel_* RPCs.
   Enriches with geo (server-side, from the request IP — never exposed),
   browser/OS/device (UA), and a daily-rotating, non-reversible visitor hash.
   No cookies, no PII. Insert-only via the anon key (RLS allows anon insert).
   ============================================================ */
export const runtime = 'edge'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SALT = 'tb-analytics-v1' // same salt as the website → one human = one vid across both

function parseUA(ua: string) {
  ua = ua || ''
  let device = 'desktop'
  if (/ipad|tablet/i.test(ua)) device = 'tablet'
  else if (/mobi|android|iphone|ipod/i.test(ua)) device = 'mobile'
  let os = 'Other'
  if (/windows/i.test(ua)) os = 'Windows'
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'
  else if (/mac os x|macintosh/i.test(ua)) os = 'macOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/linux/i.test(ua)) os = 'Linux'
  let browser = 'Other'
  if (/edg\//i.test(ua)) browser = 'Edge'
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera'
  else if (/chrome\//i.test(ua)) browser = 'Chrome'
  else if (/firefox\//i.test(ua)) browser = 'Firefox'
  else if (/safari\//i.test(ua)) browser = 'Safari'
  return { browser, os, device }
}

async function sha(str: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24)
}

function hostOf(url: string | undefined) {
  try { return url ? new URL(url).hostname.replace(/^www\./, '') : null } catch { return null }
}

export async function POST(req: Request) {
  let b: any = {}
  try { b = await req.json() } catch { return new Response('', { status: 204 }) }

  const ua = req.headers.get('user-agent') || ''
  if (/bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|bingpreview|headless/i.test(ua)) {
    return new Response('', { status: 204 })
  }

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || ''
  const today = new Date().toISOString().slice(0, 10)
  const vid = await sha(today + '|' + ip + '|' + ua + '|' + SALT)
  const { browser, os, device } = parseUA(ua)
  const dec = (s: string | null) => { try { return s ? decodeURIComponent(s) : null } catch { return s } }

  const row = {
    site: 'app',
    page: (b.page || '/').slice(0, 300),
    ref: (b.ref || '').slice(0, 500) || null,
    ref_host: hostOf(b.ref),
    ua: ua.slice(0, 500),
    w: Number(b.w) || null,
    lang: (b.lang || '').slice(0, 12) || null,
    sid: b.sid || null,
    pv: b.pv || null,
    duration: Number.isFinite(b.duration) ? Math.round(b.duration) : null,
    vid,
    browser, os, device,
    country: req.headers.get('x-vercel-ip-country') || null,
    region: dec(req.headers.get('x-vercel-ip-country-region')),
    city: dec(req.headers.get('x-vercel-ip-city')),
    utm_source: (b.utm_source || '').slice(0, 80) || null,
    utm_medium: (b.utm_medium || '').slice(0, 80) || null,
    utm_campaign: (b.utm_campaign || '').slice(0, 120) || null,
  }

  try {
    await fetch(`${SB_URL}/rest/v1/page_views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    })
  } catch { /* analytics must never break the app */ }

  return new Response('', { status: 204 })
}
