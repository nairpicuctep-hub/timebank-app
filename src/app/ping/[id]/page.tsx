'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

/* -------------------------------------------------------------------------
   Ping thread (/ping/[id]) — the lightweight message thread that opens once a
   ping request has been accepted. Messages live in ping_messages; inserts are
   RLS-gated server-side on the ping being 'accepted', so this thread is only
   usable for connected pairs. The original request (session_pings.message) is
   shown as the first bubble.
   ------------------------------------------------------------------------- */

function Bubble({ mine, text }: { mine: boolean; text: string }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className="px-3 py-2 rounded-2xl text-sm max-w-[80%]"
        style={mine
          ? { background: 'var(--grad)', color: '#fff' }
          : { background: 'var(--cream-2)', color: 'var(--text)', border: '1px solid var(--line)' }}>
        {text}
      </div>
    </div>
  )
}

export default function PingThreadPage() {
  const t = useTranslations('ping')
  const tc = useTranslations('common')
  const ts = useTranslations('session')
  const { id: pingId } = useParams()
  const router = useRouter()
  const [ping, setPing] = useState<any>(null)
  const [me, setMe] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    let channel: any
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      setMe(session.user.id)

      const { data: p } = await supabase.from('session_pings')
        .select('*, from:from_user(id, full_name, avatar_url), to:to_user(id, full_name, avatar_url), skill:skill_id(name, icon)')
        .eq('id', pingId).single()
      if (!p) { setLoading(false); return }
      setPing(p)

      const { data: msgs } = await supabase.from('ping_messages')
        .select('*').eq('ping_id', pingId).order('created_at')
      setMessages(msgs || [])
      setLoading(false)

      channel = supabase.channel(`ping-${pingId}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'ping_messages', filter: `ping_id=eq.${pingId}` },
          (payload) => setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]))
        .subscribe()
    }
    load()
    return () => { if (channel) createClient().removeChannel(channel) }
  }, [pingId, router])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    if (!msg.trim() || !ping) return
    const supabase = createClient()
    const body = msg.trim()
    setMsg('')
    // optimistically append the returned row so the sender always sees it,
    // independent of realtime delivery; realtime dedupes by id for the recipient.
    const { data, error } = await supabase.from('ping_messages')
      .insert({ ping_id: pingId, user_id: me, body }).select().single()
    if (error) { setMsg(body); alert(error.message); return }
    if (data) setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data])
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm font-mono text-muted">{tc('loading')}</p>
    </div>
  )
  if (!ping) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-muted">{t('notFound')}</p>
    </div>
  )

  const other = ping.from?.id === me ? ping.to : ping.from

  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: 'var(--cream-1)' }}>
      {/* header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 glass" style={{ borderRadius: 0 }}>
        <Link href="/session" className="text-muted text-base" aria-label={tc('back')}>←</Link>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0"
          style={{ background: other?.avatar_url ? 'transparent' : 'var(--grad)' }}>
          {other?.avatar_url
            ? <img src={other.avatar_url} className="w-full h-full object-cover" alt="" />
            : (other?.full_name?.[0]?.toUpperCase() || '?')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink truncate">{t('threadWith', { name: other?.full_name || '' })}</div>
          {ping.skill?.name && <div className="text-[11px] text-muted truncate">{ping.skill.icon} {ping.skill.name}</div>}
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 no-scrollbar">
        <p className="text-xs text-center text-faint py-2">{t('connected')}</p>
        {ping.message && <Bubble mine={ping.from?.id === me} text={ping.message} />}
        {messages.map(m => <Bubble key={m.id} mine={m.user_id === me} text={m.body} />)}
        <div ref={endRef} />
      </div>

      {/* composer */}
      <div className="p-3 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--line-2)' }}>
        <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={ts('messagePlaceholder')} style={{ fontSize: 13 }} />
        <button onClick={send} className="btn-grad px-4 text-sm flex-shrink-0">→</button>
      </div>
    </div>
  )
}
