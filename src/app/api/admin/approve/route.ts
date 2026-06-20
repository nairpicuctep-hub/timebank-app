import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendBrevoEmail } from '@/lib/brevo'

/* -------------------------------------------------------------------------
   POST /api/admin/approve  — admin sets a user's approval and, when
   approving, sends the branded "you're in" email (Brevo).
   Body: { user_id: string, approve: boolean }

   Runs as the admin's session: admin_set_approved + admin_user_email are
   both admin-gated SECURITY DEFINER RPCs. The email is best-effort — the
   approval itself always applies even if the send fails.
   ------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const userId: string | undefined = body?.user_id
  const approve = body?.approve === true
  if (!userId) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

  const { error: rpcErr } = await supabase.rpc('admin_set_approved', { p_user_id: userId, p_is_approved: approve })
  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 })

  // Only email on approval; best-effort (the approval already applied).
  let emailed = false
  if (approve) {
    try {
      const { data: email } = await supabase.rpc('admin_user_email', { p_user_id: userId })
      if (email) {
        const sent = await sendBrevoEmail({
          to: [{ email }],
          subject: "You're in · TimeBank Academy",
          htmlContent: approvalEmailHtml(),
        })
        emailed = sent.ok
        if (!sent.ok) console.error('approval email failed (user already approved):', sent.error)
      }
    } catch (e) {
      console.error('approval email threw (user already approved):', e)
    }
  }

  return NextResponse.json({ ok: true, emailed })
}

/* Branded "you're in" email — mirrors Email-templates/07-approval-youre-in.html.
   Aurora dark + hosted header PNG, Outlook-safe (VML button). */
function approvalEmailHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>You're in</title>
<!--[if mso]><style>*{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
  body{margin:0;padding:0;background:#0b0b0d;}
  a{text-decoration:none;}
  @media (max-width:620px){.container{width:100%!important;}.px{padding-left:22px!important;padding-right:22px!important;}}
</style>
</head>
<body style="margin:0;padding:0;background:#0b0b0d;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">Your TimeBank Academy account has been approved — welcome in.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0d;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
      <tr><td style="line-height:0;font-size:0;">
        <a href="https://timebank.academy"><img src="https://timebank.academy/email-header.png" width="600" alt="TimeBank Academy" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:18px 18px 0 0;"></a>
      </td></tr>
      <tr><td class="px" style="background:#141417;border-left:1px solid #26262b;border-right:1px solid #26262b;padding:36px 40px 6px;font-family:'Plus Jakarta Sans',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
        <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;font-weight:800;color:#f5f5f7;">You&rsquo;re in. Welcome to TimeBank Academy.</h1>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#b8b3ac;">Great news — your account has been approved and the door is open. You can now log in, set up your skills, and start exchanging hours with people around the world.</p><p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#b8b3ac;">Teach an hour, earn a TimeCredit, spend it to learn anything. No fees, ever.</p>
      </td></tr>
        <tr><td class="px" align="center" style="background:#141417;border-left:1px solid #26262b;border-right:1px solid #26262b;padding:18px 40px 6px;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://app.timebank.academy" style="height:52px;v-text-anchor:middle;width:300px;" arcsize="22%" strokecolor="#e85030" fillcolor="#e85030">
          <w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Open the app</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-- -->
          <a href="https://app.timebank.academy" style="display:inline-block;background:#e85030;color:#ffffff;font-family:'Plus Jakarta Sans',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:52px;text-align:center;text-decoration:none;border-radius:12px;padding:0 34px;">Open the app &rarr;</a>
          <!--<![endif]-->
        </td></tr>
      <tr><td class="px" style="background:#141417;border-left:1px solid #26262b;border-right:1px solid #26262b;padding:14px 40px 34px;font-family:'Plus Jakarta Sans',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#6f6a63;">Questions? Just reply to this email — a real person reads it.</p>
      </td></tr>
      <tr><td style="background:#0f0f12;border:1px solid #26262b;border-top:0;border-radius:0 0 18px 18px;padding:24px 40px;font-family:'Plus Jakarta Sans',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
        <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#8a857d;">Thanks for being early. We&rsquo;re glad you&rsquo;re here.</p>
        <p style="margin:0;font-size:12px;line-height:1.7;color:#6f6a63;">
          <a href="https://timebank.academy" style="color:#9a948c;">timebank.academy</a> &nbsp;&middot;&nbsp;
          <a href="https://app.timebank.academy" style="color:#9a948c;">open the app</a> &nbsp;&middot;&nbsp;
          <a href="https://timebank.academy/privacy" style="color:#9a948c;">privacy</a><br>
          &copy; 2026 TimeBank Academy &middot; Antwerp, Belgium
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}
