'use client'

import { useEffect, useState, Suspense, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/Feedback'
import Link from 'next/link'
import BottomNav from '@/components/layout/BottomNav'

const bold = (chunks: ReactNode) => <b>{chunks}</b>

/* -------------------------------------------------------------------------
   Session browser (/session) — light/Bricolage, 3 tabs.
   Fixed against the real schema:
     • pings: no expires_at column (old code filtered on it → removed)
     • teacher feed: grouped user_skills (role=teacher), profiles!user_id
     • my sessions: status pending|confirmed|active|completed|cancelled
   ------------------------------------------------------------------------- */

const GRADS = [
  'linear-gradient(135deg,#F0A830,#E85030)',
  'linear-gradient(135deg,#E85030,#D03878)',
  'linear-gradient(135deg,#D03878,#f472b6)',
]
// filter values must match DB skill.category strings; labels are translated for display.
const CATS: { val: string; key: string }[] = [
  { val: 'All',       key: 'all' },
  { val: 'Tech',      key: 'tech' },
  { val: 'Creative',  key: 'creative' },
  { val: 'Language',  key: 'language' },
  { val: 'Business',  key: 'business' },
  { val: 'Finance',   key: 'finance' },
  { val: 'Music',     key: 'music' },
  { val: 'Lifestyle', key: 'lifestyle' },
]

const statusStyle: Record<string, { bg: string; tx: string }> = {
  pending:   { bg: '#fff7ed', tx: '#c2410c' },
  confirmed: { bg: '#eff6ff', tx: '#1d4ed8' },
  active:    { bg: '#ecfdf5', tx: '#15803d' },
  completed: { bg: '#f5f3ff', tx: '#6d28d9' },
  cancelled: { bg: '#fef2f2', tx: '#b91c1c' },
}
const STATUS_KEY: Record<string, string> = {
  pending: 'statusPending', confirmed: 'statusConfirmed', active: 'statusActive',
  completed: 'statusCompleted', cancelled: 'statusCancelled',
}

function SessionPageInner() {
  const t = useTranslations('explore')
  const tc = useTranslations('common')
  const tnav = useTranslations('nav')
  const tcat = useTranslations('categories')
  const tping = useTranslations('ping')
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'pings' ? 'pings'
    : searchParams.get('tab') === 'sessions' ? 'sessions' : 'browse'
  const [tab, setTab] = useState<'browse' | 'sessions' | 'pings'>(initialTab)
  const [teachers, setTeachers] = useState<any[]>([])
  const [mySessions, setMySessions] = useState<any[]>([])
  const [pings, setPings] = useState<any[]>([])       // incoming pending requests
  const [sentOut, setSentOut] = useState<any[]>([])   // outgoing pending requests
  const [convos, setConvos] = useState<any[]>([])     // accepted conversations (either direction)
  const [uid, setUid] = useState('')
  const [blocked, setBlocked] = useState<Set<string>>(new Set())
  const [cat, setCat] = useState('All')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  async function loadPings(myId: string) {
    const supabase = createClient()
    const [inc, out, acc] = await Promise.all([
      supabase.from('session_pings')
        .select('*, from:from_user(id, full_name, avatar_url), skill:skill_id(name, icon)')
        .eq('to_user', myId).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('session_pings')
        .select('*, to:to_user(id, full_name), skill:skill_id(name, icon)')
        .eq('from_user', myId).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('session_pings')
        .select('*, from:from_user(id, full_name, avatar_url), to:to_user(id, full_name, avatar_url), skill:skill_id(name, icon)')
        .eq('status', 'accepted').or(`from_user.eq.${myId},to_user.eq.${myId}`)
        .order('created_at', { ascending: false }),
    ])
    setPings(inc.data || [])
    setSentOut(out.data || [])
    setConvos(acc.data || [])
  }

  async function respondPing(id: string, accept: boolean) {
    const supabase = createClient()
    const { error } = await supabase.rpc('respond_to_ping', { p_ping_id: id, p_accept: accept })
    if (error) { toast(error.message, 'error'); return }
    await loadPings(uid)
  }

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const myId = session.user.id
      setUid(myId)

      const [teachersRes, sessionsRes, blockedRes] = await Promise.all([
        supabase.from('user_skills')
          .select('proficiency, skills(name, icon, category), profiles!inner(id, full_name, avatar_url, rating_as_teacher, sessions_taught, location)')
          .eq('role', 'teacher').neq('user_id', myId).limit(40),
        supabase.from('sessions')
          .select('*, skill:skill_id(name, icon), teacher:teacher_id(full_name), learner:learner_id(full_name)')
          .or(`teacher_id.eq.${myId},learner_id.eq.${myId}`)
          .order('scheduled_at', { ascending: false }).limit(20),
        supabase.rpc('blocked_user_ids'),
      ])
      setBlocked(new Set((blockedRes.data || []) as string[]))

      const grouped = (teachersRes.data || []).reduce((acc: any, row: any) => {
        const p = row.profiles
        if (!p?.id) return acc
        if (!acc[p.id]) acc[p.id] = { profile: p, skills: [] }
        acc[p.id].skills.push({ ...row.skills, proficiency: row.proficiency })
        return acc
      }, {})

      setTeachers(Object.values(grouped))
      setMySessions(sessionsRes.data || [])
      await loadPings(myId)
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = teachers.filter(tt =>
    !blocked.has(tt.profile.id) && (cat === 'All' || tt.skills.some((s: any) => s.category === cat)))
  const visiblePings = pings.filter(p => !blocked.has(p.from?.id))
  const visibleConvos = convos.filter(p => !blocked.has((p.from?.id === uid ? p.to : p.from)?.id))
  const visibleSent = sentOut.filter(p => !blocked.has(p.to?.id))

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm font-mono text-muted">{tc('loading')}</p>
    </div>
  )

  const TABS: [typeof tab, string][] = [
    ['browse', t('tabBrowse')],
    ['sessions', t('tabSessions')],
    ['pings', `${t('tabPings')}${visiblePings.length ? ` (${visiblePings.length})` : ''}`],
  ]

  return (
    <div className="min-h-screen pb-28">
      {/* header */}
      <div className="px-5 pt-12 pb-3">
        <h1 className="font-display font-semibold text-[26px] text-ink">{tnav('explore')}</h1>
        <p className="text-sm text-muted">{t('subtitle')}</p>
      </div>

      {/* tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-1 p-1 rounded-pill glass" style={{ borderRadius: 'var(--r-pill)' }}>
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className="relative flex-1 py-2 rounded-pill text-xs font-semibold transition-all"
              style={tab === key ? { background: 'var(--grad)', color: '#fff' } : { color: 'var(--muted)' }}>
              {label}
              {key === 'pings' && visiblePings.length > 0 && tab !== 'pings' && (
                <span className="absolute" style={{
                  top: 4, right: 8, width: 7, height: 7, borderRadius: 999,
                  background: 'var(--rose, #D03878)',
                }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* BROWSE */}
      {tab === 'browse' && (
        <div className="px-5">
          <div className="flex gap-2 overflow-x-auto pb-3 mb-3 no-scrollbar">
            {CATS.map(c => (
              <button key={c.val} onClick={() => setCat(c.val)} className="pill flex-shrink-0"
                style={c.val === cat ? { background: 'var(--grad)', color: '#fff', border: '1px solid transparent' } : {}}>
                {tcat(c.key)}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {filtered.length === 0 ? (
              <div className="glass p-8 text-center">
                <div className="text-3xl mb-2">🌱</div>
                <p className="text-sm text-muted">{t('noTeachers', { category: tcat(CATS.find(c => c.val === cat)?.key || 'all') })}</p>
              </div>
            ) : filtered.map((teacher, i) => (
              <Link href={`/teacher/${teacher.profile.id}`} key={teacher.profile.id}>
                <div className="glass overflow-hidden">
                  <div className="h-16 flex items-end px-4 pb-3" style={{ background: GRADS[i % 3] }}>
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)' }}>
                        {teacher.profile.avatar_url
                          ? <img src={teacher.profile.avatar_url} className="w-full h-full object-cover" alt="" />
                          : teacher.profile.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="text-white">
                        <div className="text-sm font-semibold leading-tight">{teacher.profile.full_name}</div>
                        <div className="text-[11px]" style={{ opacity: 0.85 }}>{teacher.profile.location || t('worldwide')}</div>
                      </div>
                      <div className="ml-auto text-[11px] text-white" style={{ opacity: 0.85 }}>
                        ★ {Number(teacher.profile.rating_as_teacher || 0).toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="p-3.5">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {teacher.skills.slice(0, 5).map((s: any, j: number) => (
                        <span key={j} className="text-xs px-2.5 py-1 rounded-pill"
                          style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--text)' }}>
                          {s.icon} {s.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="badge-tc">◈ {tc('perHour')}</span>
                      <span className="text-xs text-muted">{t('viewProfile')} →</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* MY SESSIONS */}
      {tab === 'sessions' && (
        <div className="px-5 flex flex-col gap-3">
          {mySessions.length === 0 ? (
            <div className="glass p-8 text-center">
              <p className="text-sm text-muted mb-3">{t('noSessions')}</p>
              <button onClick={() => setTab('browse')} className="text-xs font-semibold grad-text">{t('browseTeachers')} →</button>
            </div>
          ) : mySessions.map(s => {
            const st = statusStyle[s.status] || { bg: 'var(--cream-2)', tx: 'var(--muted)' }
            return (
              <div key={s.id} className="glass p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-ink">{s.skill?.icon} {s.skill?.name || tc('session')}</div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-pill"
                    style={{ background: st.bg, color: st.tx }}>{STATUS_KEY[s.status] ? t(STATUS_KEY[s.status]) : s.status}</span>
                </div>
                <div className="text-xs text-muted mb-3 font-mono">{fmt(s.scheduled_at)} · {s.tc_cost} TC</div>
                {(s.status === 'active' || s.status === 'pending' || s.status === 'confirmed') && (
                  <Link href={`/session/${s.id}`}>
                    <button className="btn-grad w-full py-2.5 text-xs">{t('joinSession')} →</button>
                  </Link>
                )}
                {s.status === 'completed' && (
                  <Link href={`/session/${s.id}/review`}>
                    <button className="btn-ghost w-full py-2.5 text-xs">{t('rateSession')} →</button>
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* PINGS */}
      {tab === 'pings' && (
        <div className="px-5 flex flex-col gap-4">
          {visiblePings.length === 0 && visibleSent.length === 0 && visibleConvos.length === 0 && (
            <div className="glass p-8 text-center">
              <p className="text-sm text-muted">{t('noPings')}</p>
            </div>
          )}

          {/* incoming requests — must Accept before any thread opens */}
          {visiblePings.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-faint">{tping('requests')}</div>
              {visiblePings.map(p => (
                <div key={p.id} className="glass p-4">
                  <div className="text-sm text-ink mb-1">
                    {t.rich('pingWants', {
                      name: p.from?.full_name || t('someone'),
                      skill: `${p.skill?.icon || ''} ${p.skill?.name || t('aSkill')}`.trim(),
                      b: bold,
                    })}
                  </div>
                  {p.message && <div className="text-xs text-muted mb-3">&ldquo;{p.message}&rdquo;</div>}
                  <div className="flex gap-2">
                    <button onClick={() => respondPing(p.id, true)} className="btn-grad flex-1 py-2.5 text-xs">{t('accept')}</button>
                    <button onClick={() => respondPing(p.id, false)} className="btn-ghost flex-1 py-2.5 text-xs">{t('decline')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* accepted conversations — open the message thread */}
          {visibleConvos.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-faint">{tping('conversations')}</div>
              {visibleConvos.map(p => {
                const other = p.from?.id === uid ? p.to : p.from
                return (
                  <Link href={`/ping/${p.id}`} key={p.id}>
                    <div className="glass p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0"
                        style={{ background: other?.avatar_url ? 'transparent' : 'var(--grad)' }}>
                        {other?.avatar_url
                          ? <img src={other.avatar_url} className="w-full h-full object-cover" alt="" />
                          : (other?.full_name?.[0]?.toUpperCase() || '?')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink truncate">{other?.full_name || t('someone')}</div>
                        <div className="text-xs text-muted truncate">{p.skill?.icon} {p.skill?.name || ''}</div>
                      </div>
                      <span className="text-muted">→</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* outgoing requests still awaiting acceptance */}
          {visibleSent.length > 0 && (
            <div className="flex flex-col gap-3">
              {visibleSent.map(p => (
                <div key={p.id} className="glass p-4">
                  <div className="text-xs text-muted">{tping('sentWaiting', { name: p.to?.full_name || t('someone') })}</div>
                  {p.message && <div className="text-xs text-ink mt-1">&ldquo;{p.message}&rdquo;</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <BottomNav active={tab === 'pings' ? 'messages' : 'session'} />
    </div>
  )
}

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-sm font-mono text-muted">…</p></div>}>
      <SessionPageInner />
    </Suspense>
  )
}
