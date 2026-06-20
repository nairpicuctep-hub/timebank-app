'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/* -------------------------------------------------------------------------
   TrackBeacon — first-party, cookieless app analytics.
   Posts a page-view to /api/track on every route change, then the engaged
   time when the page is hidden/left. Only fires when the user has granted
   ANALYTICS consent (CookieConsent → tb_cookie_consent cookie), so nothing
   is sent before consent — same GDPR posture as the rest of the app.
   Production only. No PII, no client storage beyond a per-tab session id.
   ------------------------------------------------------------------------- */

function analyticsAllowed(): boolean {
  if (typeof document === 'undefined') return false
  const m = document.cookie.split('; ').find(c => c.startsWith('tb_cookie_consent='))
  if (!m) return false
  try { return JSON.parse(decodeURIComponent(m.split('=')[1]))?.analytics === true } catch { return false }
}

function post(body: Record<string, unknown>, useBeacon = false) {
  try {
    const data = JSON.stringify(body)
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([data], { type: 'application/json' }))
    } else {
      fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data, keepalive: true }).catch(() => {})
    }
  } catch { /* ignore */ }
}

function sessionId(): string {
  let sid = sessionStorage.getItem('tb_sid')
  if (!sid) { sid = (crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2)); sessionStorage.setItem('tb_sid', sid) }
  return sid
}

export default function TrackBeacon() {
  const pathname = usePathname()
  const pvRef = useRef('')
  const startRef = useRef(0)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof window === 'undefined') return

    let sentEngaged = false
    const page = pathname || window.location.pathname

    const fireView = () => {
      if (!analyticsAllowed()) return false
      const sid = sessionId()
      const pv = crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2)
      pvRef.current = pv
      startRef.current = Date.now()
      const params = new URLSearchParams(window.location.search)
      post({
        page, ref: document.referrer || '', w: window.innerWidth, lang: navigator.language,
        sid, pv,
        utm_source: params.get('utm_source') || '', utm_medium: params.get('utm_medium') || '', utm_campaign: params.get('utm_campaign') || '',
      })
      return true
    }

    const sendEngaged = () => {
      if (sentEngaged || !pvRef.current || !analyticsAllowed()) return
      sentEngaged = true
      post({ page, sid: sessionId(), pv: pvRef.current, duration: Math.round((Date.now() - startRef.current) / 1000) }, true)
    }

    const tracked = fireView()
    // If consent isn't granted yet, track this page the moment it is.
    const onConsent = () => { if (!pvRef.current) fireView() }
    if (!tracked) window.addEventListener('tb-consent-changed', onConsent)

    const onVis = () => { if (document.visibilityState === 'hidden') sendEngaged() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', sendEngaged)

    return () => {
      sendEngaged()
      window.removeEventListener('tb-consent-changed', onConsent)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', sendEngaged)
    }
  }, [pathname])

  return null
}
