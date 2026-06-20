/* -------------------------------------------------------------------------
   Client-side Web Push helpers (browser only). Shared by the Profile toggle
   and the PWA install hook so the subscribe logic lives in one place.
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

export function pushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

export function permissionDenied(): boolean {
  return pushSupported() && Notification.permission === 'denied'
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    return !!(await reg.pushManager.getSubscription())
  } catch {
    return false
  }
}

export type EnableResult = 'enabled' | 'denied' | 'unsupported' | 'error'

export async function enablePush(): Promise<EnableResult> {
  if (!pushSupported() || !VAPID) return 'unsupported'
  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'error'
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      })
    }
    const json = sub.toJSON()
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: { endpoint: sub.endpoint, keys: json.keys } }),
    })
    return res.ok ? 'enabled' : 'error'
  } catch {
    return 'error'
  }
}

export async function disablePush(): Promise<boolean> {
  if (!pushSupported()) return false
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
    return true
  } catch {
    return false
  }
}

/* Show a one-off local notification (no server round-trip) — used to welcome
   the user the moment they install the PWA. */
export async function showLocalNotification(title: string, body: string, url = '/home') {
  if (!pushSupported() || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url },
      tag: 'welcome',
    })
  } catch {
    /* ignore */
  }
}
