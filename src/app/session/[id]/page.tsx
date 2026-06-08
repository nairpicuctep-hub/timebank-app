'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

/* -------------------------------------------------------------------------
   Session room (/session/[id]) — light/Bricolage + integrity hooks.
   • Jitsi embed (room from sessions.daily_room_name)
   • Realtime chat via session_messages
   • Integrity: marks presence (session_mark_joined) + heartbeats active time
     (session_heartbeat) every 30s while the tab is visible. Feeds the
     anti-gaming engine that scores the session at settlement.
   • End → complete_session → /review
   ------------------------------------------------------------------------- */

// Load the JaaS external_api.js once (per App ID) and resolve when the global is ready.
let jaasScriptPromise: Promise<void> | null = null
function loadJaasScript(appId: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if ((window as any).JitsiMeetExternalAPI) return Promise.resolve()
  if (jaasScriptPromise) return jaasScriptPromise
  jaasScriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://8x8.vc/${appId}/external_api.js`
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => { jaasScriptPromise = null; reject(new Error('Failed to load video library')) }
    document.body.appendChild(s)
  })
  return jaasScriptPromise
}

export default function SessionRoomPage() {
  const t = useTranslations('session')
  const tc = useTranslations('common')
  const { id: sessionId } = useParams()
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isTeacher, setIsTeacher] = useState(false)
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState<'chat' | 'ai' | 'info'>('chat')
  const [messages, setMessages] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [plan, setPlan] = useState<any[]>([])
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [ending, setEnding] = useState(false)
  const [videoError, setVideoError] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const jitsiBoxRef = useRef<HTMLDivElement>(null)
  const jitsiApiRef = useRef<any>(null)

  useEffect(() => {
    const supabase = createClient()
    let channel: any

    async function load() {
      const { data: { session: auth } } = await supabase.auth.getSession()
      if (!auth) { router.push('/auth'); return }
      setCurrentUser(auth.user)

      const { data: s } = await supabase.from('sessions')
        .select('*, skill:skill_id(name, icon), teacher:teacher_id(full_name), learner:learner_id(full_name)')
        .eq('id', sessionId).single()
      if (!s) { setLoading(false); return }
      setSession(s)
      setIsTeacher(s.teacher_id === auth.user.id)

      const [msgRes, planRes] = await Promise.all([
        supabase.from('session_messages').select('*').eq('session_id', sessionId).order('created_at'),
        supabase.from('course_plans').select('plan').eq('session_id', sessionId).single(),
      ])
      setMessages(msgRes.data || [])
      setPlan(Array.isArray(planRes.data?.plan) ? planRes.data.plan : [])
      setLoading(false)

      // INTEGRITY: mark presence on join
      supabase.rpc('session_mark_joined', { p_session_id: sessionId })

      channel = supabase.channel(`session-${sessionId}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'session_messages', filter: `session_id=eq.${sessionId}` },
          (payload) => setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]))
        .subscribe()
    }
    load()
    return () => { if (channel) createClient().removeChannel(channel) }
  }, [sessionId, router])

  // INTEGRITY: heartbeat active time every 30s, only while tab is visible
  useEffect(() => {
    const supabase = createClient()
    const beat = setInterval(() => {
      if (document.visibilityState === 'visible') {
        supabase.rpc('session_heartbeat', { p_session_id: sessionId, p_seconds: 30 })
      }
    }, 30000)
    return () => clearInterval(beat)
  }, [sessionId])

  // JaaS (8x8.vc) video embed — mint a server-signed JWT, then join as moderator.
  useEffect(() => {
    if (!session || !currentUser) return
    let disposed = false

    async function startVideo() {
      try {
        const res = await fetch('/api/jaas-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.jwt) throw new Error(json?.error || 'Could not start video.')
        await loadJaasScript(json.appId)
        if (disposed || !jitsiBoxRef.current) return

        const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI
        if (!JitsiMeetExternalAPI) throw new Error('Video library unavailable.')

        jitsiApiRef.current = new JitsiMeetExternalAPI('8x8.vc', {
          roomName: json.room,
          jwt: json.jwt,
          parentNode: jitsiBoxRef.current,
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_CHROME_EXTENSION_BANNER: false,
          },
        })
      } catch (e: any) {
        if (!disposed) setVideoError(e?.message || 'Could not start the video room.')
      }
    }
    startVideo()

    return () => {
      disposed = true
      try { jitsiApiRef.current?.dispose?.() } catch {}
      jitsiApiRef.current = null
    }
  }, [session, currentUser, sessionId])

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    if (!msg.trim()) return
    const supabase = createClient()
    const body = msg.trim()
    setMsg('')
    // optimistically append the returned row so the sender always sees it,
    // independent of realtime delivery; realtime dedupes by id for the recipient.
    const { data, error } = await supabase.from('session_messages')
      .insert({ session_id: sessionId, user_id: currentUser.id, body }).select().single()
    if (error) { setMsg(body); return }
    if (data) setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data])
  }

  async function generatePlan() {
    setPlanLoading(true)
    setPlanError('')
    try {
      const res = await fetch('/api/lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !Array.isArray(json.blocks) || !json.blocks.length) {
        setPlanError(json?.error || t('aiError'))
        return
      }
      setPlan(json.blocks)
    } catch {
      setPlanError(t('aiError'))
    } finally {
      setPlanLoading(false)
    }
  }

  async function endSession() {
    if (!confirm(t('endConfirm'))) return
    setEnding(true)
    const supabase = createClient()
    await supabase.rpc('complete_session', { p_session_id: sessionId, p_actual_end: new Date().toISOString() })
    router.push(`/session/${sessionId}/review`)
  }

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm font-mono text-muted">{t('joining')}</p></div>
  if (!session) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted">{t('notFound')}</p></div>

  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: 'var(--cream-1)' }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 glass" style={{ borderRadius: 0 }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--mint)', boxShadow: '0 0 6px var(--mint)' }} />
          <span className="text-sm font-semibold text-ink truncate">{session.skill?.icon} {session.skill?.name || tc('session')}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-mono px-2.5 py-1 rounded-pill" style={{ background: 'var(--mint-bg)', color: 'var(--mint)' }}>⏱ {fmtTime(elapsed)}</span>
          <button onClick={endSession} disabled={ending} className="text-xs font-semibold px-3 py-1.5 rounded-btn"
            style={{ background: 'var(--request-bg)', color: 'var(--rose)', border: '1px solid #fecdd3' }}>
            {ending ? '…' : t('end')}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <div className="flex-1 relative" style={{ background: '#0a0806', minHeight: 220 }}>
          <div ref={jitsiBoxRef} className="w-full h-full" />
          {videoError && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <p className="text-sm text-white/80 max-w-xs">{videoError}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col flex-shrink-0 glass md:w-80" style={{ borderRadius: 0, borderLeft: '1px solid var(--line-2)' }}>
          <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid var(--line-2)' }}>
            {([['chat', '💬', t('tabChat')], ['ai', '✦', t('tabAi')], ['info', 'ℹ️', t('tabInfo')]] as const).map(([p, icon, label]) => (
              <button key={p} onClick={() => setPanel(p as any)}
                className="flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                style={{ color: panel === p ? 'var(--coral)' : 'var(--muted)', borderBottom: panel === p ? '2px solid var(--coral)' : '2px solid transparent' }}>
                {icon} {label}
              </button>
            ))}
          </div>

          {panel === 'chat' && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 no-scrollbar">
                {messages.length === 0 && <p className="text-xs text-center py-4 text-faint">{t('sayHello')}</p>}
                {messages.map(m => {
                  const mine = m.user_id === currentUser?.id
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className="px-3 py-2 rounded-2xl text-sm max-w-[80%]"
                        style={mine ? { background: 'var(--grad)', color: '#fff' } : { background: 'var(--cream-2)', color: 'var(--text)', border: '1px solid var(--line)' }}>
                        {m.body}
                      </div>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--line-2)' }}>
                <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder={t('messagePlaceholder')} style={{ fontSize: 13 }} />
                <button onClick={send} className="btn-grad px-4 text-sm flex-shrink-0">→</button>
              </div>
            </div>
          )}

          {panel === 'ai' && (
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              {plan.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {plan.map((b: any, i: number) => (
                    <div key={i} className="glass p-3">
                      <div className="text-sm font-semibold text-ink">{b.title || t('part', { number: i + 1 })}</div>
                      {b.detail && <div className="text-xs text-muted mt-1">{b.detail}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">✦</div>
                  <p className="text-sm font-semibold text-ink mb-1">{t('aiTitle')}</p>
                  <p className="text-xs text-muted mb-4">{t('aiBody')}</p>
                  {planError && <p className="text-xs mb-3" style={{ color: '#b91c1c' }}>{planError}</p>}
                  <button onClick={generatePlan} disabled={planLoading} className="btn-ghost w-full py-2.5 text-xs">
                    {planLoading ? t('aiGenerating') : t('aiCta')}
                  </button>
                </div>
              )}
            </div>
          )}

          {panel === 'info' && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar">
              <div className="glass p-3">
                <div className="text-[9px] font-mono uppercase tracking-widest text-faint mb-1">{isTeacher ? t('teaching') : t('learningFrom')}</div>
                <div className="text-sm font-semibold text-ink">{isTeacher ? session.learner?.full_name : session.teacher?.full_name}</div>
              </div>
              <div className="glass p-3">
                <div className="text-[9px] font-mono uppercase tracking-widest text-faint mb-1">{t('cost')}</div>
                <div className="text-sm font-semibold text-ink">{t('costValue', { cost: session.tc_cost, duration: session.duration_min })}</div>
              </div>
              <p className="text-xs text-muted px-1">{t('endNote')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
