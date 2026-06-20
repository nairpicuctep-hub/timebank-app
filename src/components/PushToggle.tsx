'use client'

import { useEffect, useState } from 'react'
import { toast } from '@/components/ui/Feedback'
import { pushSupported, permissionDenied, isPushEnabled, enablePush, disablePush } from '@/lib/pushClient'

/* -------------------------------------------------------------------------
   PushToggle — opt in/out of Web Push notifications for this device.

   Renders nothing on browsers without Push support. On iOS this only works
   once the PWA is installed to the Home Screen (iOS 16.4+) — the browser
   exposes PushManager only in that standalone context, so the toggle simply
   won't appear in a plain iOS Safari tab. Subscribe logic lives in
   @/lib/pushClient (shared with the install hook).
   ------------------------------------------------------------------------- */

export default function PushToggle() {
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [denied, setDenied] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const ok = pushSupported()
    setSupported(ok)
    if (!ok) return
    setDenied(permissionDenied())
    isPushEnabled().then(setEnabled)
  }, [])

  async function enable() {
    setBusy(true)
    const r = await enablePush()
    if (r === 'enabled') { setEnabled(true); toast('Notifications are on.', 'success') }
    else if (r === 'denied') { setDenied(true); toast('Notifications were not allowed.', 'error') }
    else if (r === 'unsupported') toast('Notifications are not available here.', 'error')
    else toast('Could not enable notifications.', 'error')
    setBusy(false)
  }

  async function disable() {
    setBusy(true)
    const ok = await disablePush()
    if (ok) { setEnabled(false); toast('Notifications are off.') }
    else toast('Could not turn off notifications.', 'error')
    setBusy(false)
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
