'use client'

import { useEffect, useState } from 'react'
import { toast } from '@/components/ui/Feedback'

/* -------------------------------------------------------------------------
   PushToggle — opt in/out of Web Push notifications for this device.

   Subscribes via the service worker's PushManager using the public VAPID key
   and stores the subscription server-side (/api/push/subscribe). Renders
   nothing on browsers without Push support. On iOS this only works once the
   PWA is installed to the Home Screen (iOS 16.4+) — the browser exposes
   PushManager only in that standalone context, so the toggle simply won't
   appear in a plain iOS Safari tab.
   ------------------------------------------------------------------------- */

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export default function PushToggle() {
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [denied, setDenied] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(ok)
    if (!ok) return
    if (Notification.permission === 'denied') setDenied(true)
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(!!sub))
      .catch(() => {})
  }, [])

  async function enable() {
    if (!VAPID) { toast('Notifications are not configured yet.', 'error'); return }
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setDenied(perm === 'denied')
        toast('Notifications were not allowed.', 'error')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      })
      const json = sub.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: { endpoint: sub.endpoint, keys: json.keys } }),
      })
      if (!res.ok) throw new Error('save failed')
      setEnabled(true)
      toast('Notifications are on.', 'success')
    } catch {
      toast('Could not enable notifications.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setEnabled(false)
      toast('Notifications are off.')
    } catch {
      toast('Could not turn off notifications.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!supported) return null

  return (
    <div className="glass p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-xl">🔔</span>
        <div>
          <div className="text-sm font-semibold text-ink">Notifications</div>
          <div className="text-xs text-muted">
            {denied
              ? 'Blocked — enable them in your browser settings'
              : enabled
                ? 'On — session reminders & news'
                : 'Get session reminders & news'}
          </div>
        </div>
      </div>
      <button
        onClick={enabled ? disable : enable}
        disabled={busy || denied}
        className="text-xs font-medium px-3.5 py-1.5 rounded-pill disabled:opacity-50"
        style={enabled
          ? { background: 'var(--cream-2)', color: 'var(--muted)', border: '1px solid var(--line)' }
          : { background: 'var(--grad)', color: '#fff' }}>
        {busy ? '…' : enabled ? 'Turn off' : 'Turn on'}
      </button>
    </div>
  )
}
