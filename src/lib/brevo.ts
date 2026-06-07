/* -------------------------------------------------------------------------
   Brevo transactional email — server-side only (BREVO_API_KEY, never
   NEXT_PUBLIC). Thin wrapper over Brevo's REST send endpoint so any server
   route can fire a transactional email without re-deriving the request shape.

   NOTE: I could not find an existing Brevo *code* integration anywhere in
   this repo to mirror (only a mention of Brevo as the email provider in the
   privacy policy text — likely it's wired at the Supabase Auth SMTP level for
   confirmation/reset emails, not called from app code). This is a fresh
   integration against Brevo's standard v3 transactional email API. It needs
   BREVO_API_KEY (and optionally BREVO_SENDER_EMAIL) set in the environment —
   please confirm those are present in Vercel.
   ------------------------------------------------------------------------- */

type Recipient = { email: string; name?: string }

export async function sendBrevoEmail(opts: {
  to: Recipient[]
  subject: string
  htmlContent: string
  replyTo?: Recipient
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.error('BREVO_API_KEY not set — skipping email send')
    return { ok: false, error: 'not configured' }
  }

  try {
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        sender: { email: process.env.BREVO_SENDER_EMAIL || 'hello@timebank.academy', name: 'TimeBank Academy' },
        to: opts.to,
        subject: opts.subject,
        htmlContent: opts.htmlContent,
        ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
      }),
    })
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '')
      console.error('Brevo send error', resp.status, detail)
      return { ok: false, error: detail || `HTTP ${resp.status}` }
    }
    return { ok: true }
  } catch (err: any) {
    console.error('Brevo send threw', err)
    return { ok: false, error: String(err?.message || err) }
  }
}
