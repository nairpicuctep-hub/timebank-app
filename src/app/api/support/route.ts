import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendBrevoEmail } from '@/lib/brevo'
import fs from 'node:fs/promises'
import path from 'node:path'

/* -------------------------------------------------------------------------
   POST /api/support
   Body (chat turn):  { conversation: [{ role: 'user'|'assistant', content }] }
   Body (escalation): { conversation, finalizeEscalation: true, email }
   Returns:           { reply: string, escalate?: boolean }

   Server-side only — GEMINI_API_KEY never reaches the browser (same pattern
   as /api/extract-skills and /api/lesson-plan). The agent answers ONLY from
   timebank-knowledge-base.md (app root), loaded ONCE per request into
   Gemini's `systemInstruction` — not re-prepended per message — so token
   cost stays flat regardless of conversation length. The KB's own "When to
   escalate" / "What the agent must NOT do" sections are folded into that
   system prompt verbatim as the agent's behavior rules; we do not feed it
   any code or other context.

   Escalation (per the KB triggers — unanswerable question, bug/payment/
   safety report, explicit request for a human, account-deletion/legal, …):
   Gemini sets `escalate: true`; the client then collects the user's email
   if unknown and calls back with finalizeEscalation, which — in this exact
   order, so nothing is lost if the email send fails —
     1. inserts a row into support_requests,
     2. emails the full conversation to hello@timebank.academy via Brevo,
     3. replies with a FIXED, hard-coded sentence (not model-authored) that
        the request was passed to the team and they'll reply by EMAIL —
        never an instant-human promise.
   ------------------------------------------------------------------------- */

const GEMINI_MODEL = 'gemini-2.0-flash'
let kbCache: string | null = null

async function loadKb(): Promise<string> {
  if (kbCache) return kbCache
  const file = await fs.readFile(path.join(process.cwd(), 'timebank-knowledge-base.md'), 'utf-8')
  kbCache = file
  return file
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function escapeHtml(s: string) {
  return s.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const conversation = Array.isArray(body?.conversation) ? body.conversation : []
    const turns: { role: 'user' | 'assistant'; content: string }[] = conversation
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-30) // cap context — this is a support chat, not a transcript archive
      .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: String(m.content).trim().slice(0, 4000) }))

    const supabase = createClient()
    const { data: { session: auth } } = await supabase.auth.getSession()
    if (!auth) return NextResponse.json({ error: 'Please sign in to use Help.' }, { status: 401 })

    /* ---- branch 1: finalize an escalation — insert, email, fixed reply ---- */
    if (body?.finalizeEscalation) {
      const email = String(body?.email || auth.user.email || '').trim().toLowerCase()
      if (!isValidEmail(email)) {
        return NextResponse.json({ error: 'A valid email address is needed to reach you.' }, { status: 400 })
      }

      // (b) insert FIRST — nothing is lost if the email send below fails
      const { data: row, error: insErr } = await supabase.from('support_requests')
        .insert({ user_id: auth.user.id, email, conversation: turns, status: 'open' })
        .select('id').single()
      if (insErr) {
        console.error('support_requests insert error', insErr)
        return NextResponse.json({ error: 'Could not save your request — please try again in a moment.' }, { status: 500 })
      }

      // (c) notify the team — best effort; the row is already saved either way
      const transcript = turns.map(m => `${m.role === 'user' ? 'User' : 'Agent'}: ${m.content}`).join('\n')
      const html = `
        <p><strong>New support escalation</strong> (request <code>${row?.id || ''}</code>)</p>
        <p><strong>From:</strong> ${escapeHtml(email)} (user ${auth.user.id})</p>
        <hr/>
        <pre style="white-space:pre-wrap;font-family:inherit;font-size:13px">${escapeHtml(transcript)}</pre>
      `.trim()
      const sent = await sendBrevoEmail({
        to: [{ email: 'hello@timebank.academy' }],
        subject: `Support escalation from ${email}`,
        htmlContent: html,
        replyTo: { email },
      })
      if (!sent.ok) console.error('support escalation email failed (row already saved, id=' + row?.id + ')', sent.error)

      // (d) fixed sentence — guarantees we never promise an instant human reply
      return NextResponse.json({
        reply: `Thanks — I've passed this to the team. They'll reply to you by email at ${email}. Is there anything else I can help with in the meantime?`,
        escalate: false,
      })
    }

    /* ---- branch 2: normal chat turn — answer from the KB only ---- */
    if (!turns.length) {
      return NextResponse.json({ error: 'No message to respond to.' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'AI service not configured.' }, { status: 503 })

    const kb = await loadKb()
    const systemPrompt = `You are the in-app help assistant for TimeBank Academy, a peer-to-peer skill-exchange community where members trade time, not money. You answer ONLY using the knowledge base below — you have no access to the app's source code or internal systems, and must never guess or invent.

Keep replies warm, brief, and conversational — plain text suitable for a chat bubble (no markdown headers, asterisks, or bullet symbols; use short sentences, or "1) … 2) …" only if you must list a few things).

=== KNOWLEDGE BASE START ===
${kb}
=== KNOWLEDGE BASE END ===

Always answer with ONLY valid JSON, no markdown fencing, in exactly this shape:
{"reply": "<your chat reply, plain text>", "escalate": <true or false>}

Set "escalate" to true — per the knowledge base's "When to escalate to the team" section — when:
- the question isn't covered by the knowledge base,
- the user reports a bug, a payment/credit discrepancy, or an account problem you can't resolve from the KB alone,
- the user explicitly asks to talk to a human / a real person / the team,
- the user is reporting a safety issue or another user, or
- anything involves account deletion, data requests, or legal questions.

When "escalate" is true, write "reply" to kindly say you can't fully resolve this yourself and that you're passing it on to the team — do NOT promise an instant human reply or give a time estimate; the app will handle collecting their email and notifying the team right after your reply.

Follow the knowledge base's "What the agent must NOT do" section as hard rules: never invent features or answers not in the document, never give legal/financial/investment advice, never promise response times beyond "the team will email you back", never expose internal/technical/code/infrastructure details, and never claim TimeCredits have monetary value or can be cashed out.`

    const contents = turns.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
        }),
      }
    )

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '')
      console.error('Gemini error', resp.status, detail)
      return NextResponse.json({ error: "I'm having trouble answering right now — please try again in a moment." }, { status: 502 })
    }

    const data = await resp.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch {
      try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) } catch { parsed = {} }
    }

    const reply = typeof parsed.reply === 'string' && parsed.reply.trim()
      ? parsed.reply.trim().slice(0, 2000)
      : "Sorry, I'm not sure how to help with that — would you like me to pass it to the team?"
    const escalate = parsed.escalate === true

    return NextResponse.json({ reply, escalate })
  } catch (err) {
    console.error('support route error', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
