import webpush from 'web-push'

/* -------------------------------------------------------------------------
   Web Push (PWA) sender — VAPID, no Firebase needed.
   Server-side only. Configured lazily from env so a missing key degrades
   gracefully (pushConfigured() === false) instead of crashing the build.

     NEXT_PUBLIC_VAPID_PUBLIC_KEY  — public key (also used in the browser)
     VAPID_PRIVATE_KEY             — private key (server only, never shipped)
     VAPID_SUBJECT                 — mailto: or https: contact (optional)
   ------------------------------------------------------------------------- */

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const PRIVATE = process.env.VAPID_PRIVATE_KEY
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@timebank.academy'

let configured = false

export function pushConfigured(): boolean {
  return Boolean(PUBLIC && PRIVATE)
}

function ensure() {
  if (configured) return
  if (!PUBLIC || !PRIVATE) throw new Error('VAPID keys not configured')
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE)
  configured = true
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string }
export type Sub = { endpoint: string; p256dh: string; auth: string }
export type SendResult = { ok: true } | { ok: false; gone: boolean; error?: string }

/* Send one notification. `gone` is true when the endpoint is dead (404/410)
   and should be pruned from the database by the caller. */
export async function sendToSub(sub: Sub, payload: PushPayload): Promise<SendResult> {
  ensure()
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 } // hold up to 24h if the device is offline
    )
    return { ok: true }
  } catch (e: any) {
    const status = e?.statusCode
    return { ok: false, gone: status === 404 || status === 410, error: e?.body || e?.message }
  }
}
