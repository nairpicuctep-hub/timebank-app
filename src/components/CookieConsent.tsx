'use client'

import { useEffect, useState } from 'react'

/* -------------------------------------------------------------------------
   CookieConsent — GDPR-compliant cookie banner.
   • Shows until the user makes a choice (stored in a first-party cookie).
   • Granular: Essential (always on) + Analytics + Marketing.
   • NO non-essential cookies/scripts fire before consent (the GDPR rule).
   • Re-openable later from settings via window.dispatchEvent('open-cookie-prefs').

   IMPORTANT: this stores the *choice* in a cookie named tb_cookie_consent.
   Any analytics/marketing scripts must check this before loading. We expose
   window.__tbConsent = { analytics, marketing } for that.
   ------------------------------------------------------------------------- */

type Prefs = { essential: true; analytics: boolean; marketing: boolean }

const COOKIE = 'tb_cookie_consent'

function readPrefs(): Prefs | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.split('; ').find(c => c.startsWith(COOKIE + '='))
  if (!m) return null
  try { return JSON.parse(decodeURIComponent(m.split('=')[1])) } catch { return null }
}

function writePrefs(p: Prefs) {
  const v = encodeURIComponent(JSON.stringify(p))
  // 6-month expiry, SameSite=Lax, first-party
  document.cookie = `${COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 182}; SameSite=Lax`
  ;(window as any).__tbConsent = { analytics: p.analytics, marketing: p.marketing }
}

export default function CookieConsent() {
  const [show, setShow] = useState(false)
  const [customize, setCustomize] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    const existing = readPrefs()
    if (existing) {
      ;(window as any).__tbConsent = { analytics: existing.analytics, marketing: existing.marketing }
    } else {
      setShow(true)
    }
    // allow reopening from a settings link
    const reopen = () => { const e = readPrefs(); setAnalytics(e?.analytics || false); setMarketing(e?.marketing || false); setCustomize(true); setShow(true) }
    window.addEventListener('open-cookie-prefs', reopen)
    return () => window.removeEventListener('open-cookie-prefs', reopen)
  }, [])

  function acceptAll() { writePrefs({ essential: true, analytics: true, marketing: true }); setShow(false) }
  function rejectAll() { writePrefs({ essential: true, analytics: false, marketing: false }); setShow(false) }
  function saveCustom() { writePrefs({ essential: true, analytics, marketing }); setShow(false) }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(40,20,10,0.25)', backdropFilter: 'blur(4px)' }}>
      <div className="glass w-full max-w-md" style={{ padding: 24 }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🍪</span>
          <h2 className="font-display font-semibold text-lg text-ink">Your privacy</h2>
        </div>

        {!customize ? (
          <>
            <p className="text-sm text-muted mb-4">
              We use essential cookies to make TimeBank work. With your consent, we also use analytics to improve the product.
              We <b className="text-ink">never sell your personal data</b> — we only publish anonymized, aggregated insights.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={acceptAll} className="btn-grad w-full py-3 text-sm">Accept all</button>
              <div className="flex gap-2">
                <button onClick={rejectAll} className="btn-ghost flex-1 py-2.5 text-sm">Reject non-essential</button>
                <button onClick={() => setCustomize(true)} className="btn-ghost flex-1 py-2.5 text-sm">Customize</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2 mb-4">
              <Row title="Essential" desc="Login, security, core features. Always on." checked disabled />
              <Row title="Analytics" desc="Helps us understand usage and improve. Anonymized." checked={analytics} onChange={setAnalytics} />
              <Row title="Marketing" desc="Measure campaigns. Off by default." checked={marketing} onChange={setMarketing} />
            </div>
            <div className="flex gap-2">
              <button onClick={saveCustom} className="btn-grad flex-1 py-2.5 text-sm">Save choices</button>
              <button onClick={() => setCustomize(false)} className="btn-ghost flex-1 py-2.5 text-sm">Back</button>
            </div>
          </>
        )}

        <p className="text-[11px] text-muted mt-3 text-center">
          See our <a href="/privacy" className="grad-text font-medium">Privacy Policy</a> &amp; <a href="/terms" className="grad-text font-medium">Terms</a>.
        </p>
      </div>
    </div>
  )
}

function Row({ title, desc, checked, onChange, disabled }: { title: string; desc: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button onClick={() => !disabled && onChange?.(!checked)} disabled={disabled}
      className="glass p-3 flex items-start gap-3 text-left" style={{ opacity: disabled ? 0.7 : 1 }}>
      <div className="flex-shrink-0 mt-0.5 rounded-md flex items-center justify-center"
        style={{ width: 20, height: 20, background: checked ? 'var(--grad)' : 'rgba(255,255,255,0.6)', border: checked ? '1.5px solid transparent' : '1.5px solid var(--line)' }}>
        {checked && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
      </div>
      <div>
        <div className="text-sm font-semibold text-ink">{title}</div>
        <div className="text-[11px] text-muted">{desc}</div>
      </div>
    </button>
  )
}
