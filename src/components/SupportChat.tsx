'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

/* -------------------------------------------------------------------------
   Support chat — standalone help agent overlay (cream/glass).
   Talks to /api/support, which answers ONLY from timebank-knowledge-base.md
   via Gemini (server-side). When the agent flags `escalate`, we collect the
   user's email (if not already known from their account) and call back with
   finalizeEscalation — the server inserts a support_requests row, emails
   hello@timebank.academy via Brevo, and replies with a fixed "passed to the
   team — they'll reply by email" sentence (never an instant-human promise).
   ------------------------------------------------------------------------- */

type Msg = { role: 'user' | 'assistant'; content: string }

function Bubble({ mine, text }: { mine: boolean; text: string }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className="px-3 py-2 rounded-2xl text-sm max-w-[85%] whitespace-pre-wrap"
        style={mine
          ? { background: 'var(--grad)', color: '#fff' }
          : { background: 'var(--cream-2)', color: 'var(--text)', border: '1px solid var(--line)' }}>
        {text}
      </div>
    </div>
  )
}

export default function SupportChat({ onClose }: { onClose: () => void }) {
  const t = useTranslations('support')
  const tc = useTranslations('common')
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: t('greeting') }])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [needsEmail, setNeedsEmail] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [knownEmail, setKnownEmail] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setKnownEmail(session?.user?.email || null)
    })
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, needsEmail, sending])

  async function finalize(conv: Msg[], email: string) {
    setSending(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: conv, finalizeEscalation: true, email }),
      })
      const json = await res.json().catch(() => ({}))
      const reply = typeof json.reply === 'string' && json.reply.trim() ? json.reply.trim() : t('escalatedFallback', { email })
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setNeedsEmail(false)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t('genericError') }])
    } finally {
      setSending(false)
    }
  }

  async function send() {
    const body = input.trim()
    if (!body || sending) return
    setInput('')
    const next = [...messages, { role: 'user' as const, content: body }]
    setMessages(next)
    setSending(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: next }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: json?.error || t('genericError') }])
        return
      }
      const reply = typeof json.reply === 'string' && json.reply.trim() ? json.reply.trim() : t('genericError')
      const withReply = [...next, { role: 'assistant' as const, content: reply }]
      setMessages(withReply)
      if (json.escalate) {
        if (knownEmail) await finalize(withReply, knownEmail)
        else setNeedsEmail(true)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t('genericError') }])
    } finally {
      setSending(false)
    }
  }

  async function submitEmail() {
    const email = emailInput.trim()
    if (!email || !email.includes('@') || sending) return
    setKnownEmail(email)
    await finalize(messages, email)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ height: '100dvh', background: 'var(--cream-1)' }}>
      {/* header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 glass" style={{ borderRadius: 0 }}>
        <button onClick={onClose} className="text-muted text-base" aria-label={tc('back')}>←</button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0" style={{ background: 'var(--grad)' }}>✦</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink truncate">{t('title')}</div>
          <div className="text-[11px] text-muted truncate">{t('subtitle')}</div>
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 no-scrollbar">
        {messages.map((m, i) => <Bubble key={i} mine={m.role === 'user'} text={m.content} />)}
        {sending && <p className="text-xs text-faint px-1">{t('typing')}</p>}
        <div ref={endRef} />
      </div>

      {/* composer — either the normal input, or the email-collection prompt during escalation */}
      {needsEmail ? (
        <div className="p-3 flex flex-col gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--line-2)' }}>
          <p className="text-xs text-muted px-1">{t('emailPrompt')}</p>
          <div className="flex gap-2">
            <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitEmail()}
              placeholder={t('emailPlaceholder')} style={{ fontSize: 13 }} disabled={sending} />
            <button onClick={submitEmail} disabled={sending || !emailInput.trim()} className="btn-grad px-4 text-sm flex-shrink-0">→</button>
          </div>
        </div>
      ) : (
        <div className="p-3 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--line-2)' }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={t('placeholder')} style={{ fontSize: 13 }} disabled={sending} />
          <button onClick={send} disabled={sending || !input.trim()} className="btn-grad px-4 text-sm flex-shrink-0">→</button>
        </div>
      )}
    </div>
  )
}
