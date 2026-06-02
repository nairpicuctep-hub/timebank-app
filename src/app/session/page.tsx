'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import BottomNav from '@/components/layout/BottomNav'

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
const CATS = ['All', 'Tech', 'Creative', 'Language', 'Business', 'Finance', 'Music', 'Lifestyle']

const statusStyle: Record<string, { bg: string; tx: string }> = {
  pending:   { bg: '#fff7ed', tx: '#c2410c' },
  confirmed: { bg: '#eff6ff', tx: '#1d4ed8' },
  active:    { bg: '#ecfdf5', tx: '#15803d' },
  completed: { bg: '#f5f3ff', tx: '#6d28d9' },
  cancelled: { bg: '#fef2f2', tx: '#b91c1c' },
}

export default function SessionPage() {
  const [tab, setTab] = useState<'browse' | 'sessions' | 'pings'>('browse')
  const [teachers, setTeachers] = useState<any[]>([])
  const [mySessions, setMySessions] = useState<any[]>([])
  const [pings, setPings] = useState<any[]>([])
  const [cat, setCat] = useState('All')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const uid = session.user.id

      const [teachersRes, sessionsRes, pingsRes] = await Promise.all([
        supabase.from('user_skills')
          .select('proficiency, skills(name, icon, category), profiles!inner(id, full_name, avatar_url, rating_as_teacher, sessions_taught, location)')
          .eq('role', 'teacher').neq('user_id', uid).limit(40),
        supabase.from('sessions')
          .select('*, skill:skill_id(name, icon), teacher:teacher_id(full_name), learner:learner_id(full_name)')
          .or(`teacher_id.eq.${uid},learner_id.eq.${uid}`)
          .order('scheduled_at', { ascending: false }).limit(20),
        supabase.from('session_pings')
          .select('*, from:from_user(full_name), skill:skill_id(name, icon)')
          .eq('to_user', uid).eq('status', 'pending'),
      ])

      const grouped = (teachersRes.data || []).reduce((acc: any, row: any) => {
        const p = row.profiles
        if (!p?.id) return acc
        if (!acc[p.id]) acc[p.id] = { profile: p, skills: [] }
        acc[p.id].skills.push({ ...row.skills, proficiency: row.proficiency })
        return acc
      }, {})

      setTeachers(Object.values(grouped))
      setMySessions(sessionsRes.data || [])
      setPings(pingsRes.data || [])
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = teachers.filter(t => cat === 'All' || t.skills.some((s: any) => s.category === cat))

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm font-mono text-muted">Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen pb-28">
      {/* header */}
      <div className="px-5 pt-12 pb-3">
        <h1 className="font-display font-semibold text-[26px] text-ink">Explore</h1>
        <p className="text-sm text-muted">Find someone to learn from — or check your sessions.</p>
      </div>

      {/* tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-1 p-1 rounded-pill glass" style={{ borderRadius: 'var(--r-pill)' }}>
          {([['browse', 'Browse'], ['sessions', 'My Sessions'], ['pings', `Pings${pings.length ? ` (${pings.length})` : ''}`]] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t as any)}
              className="flex-1 py-2 rounded-pill text-xs font-semibold transition-all"
              style={tab === t ? { background: 'var(--grad)', color: '#fff' } : { color: 'var(--muted)' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* BROWSE */}
      {tab === 'browse' && (
        <div className="px-5">
          <div className="flex gap-2 overflow-x-auto pb-3 mb-3 no-scrollbar">
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)} className="pill flex-shrink-0"
                style={c === cat ? { background: 'var(--grad)', color: '#fff', border: '1px solid transparent' } : {}}>
                {c}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {filtered.length === 0 ? (
              <div className="glass p-8 text-center">
                <div className="text-3xl mb-2">🌱</div>
                <p className="text-sm text-muted">No teachers in {cat} yet. You could be the first — add it to your skills!</p>
              </div>
            ) : filtered.map((t, i) => (
              <Link href={`/teacher/${t.profile.id}`} key={t.profile.id}>
                <div className="glass overflow-hidden">
                  <div className="h-16 flex items-end px-4 pb-3" style={{ background: GRADS[i % 3] }}>
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)' }}>
                        {t.profile.avatar_url
                          ? <img src={t.profile.avatar_url} className="w-full h-full object-cover" alt="" />
                          : t.profile.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="text-white">
                        <div className="text-sm font-semibold leading-tight">{t.profile.full_name}</div>
                        <div className="text-[11px]" style={{ opacity: 0.85 }}>{t.profile.location || 'Worldwide'}</div>
                      </div>
                      <div className="ml-auto text-[11px] text-white" style={{ opacity: 0.85 }}>
                        ★ {Number(t.profile.rating_as_teacher || 0).toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="p-3.5">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {t.skills.slice(0, 5).map((s: any, j: number) => (
                        <span key={j} className="text-xs px-2.5 py-1 rounded-pill"
                          style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--text)' }}>
                          {s.icon} {s.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="badge-tc">◈ 1 TC / hr</span>
                      <span className="text-xs text-muted">View profile →</span>
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
              <p className="text-sm text-muted mb-3">No sessions yet</p>
              <button onClick={() => setTab('browse')} className="text-xs font-semibold grad-text">Browse teachers →</button>
            </div>
          ) : mySessions.map(s => {
            const st = statusStyle[s.status] || { bg: 'var(--cream-2)', tx: 'var(--muted)' }
            return (
              <div key={s.id} className="glass p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-ink">{s.skill?.icon} {s.skill?.name || 'Session'}</div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-pill capitalize"
                    style={{ background: st.bg, color: st.tx }}>{s.status}</span>
                </div>
                <div className="text-xs text-muted mb-3 font-mono">{fmt(s.scheduled_at)} · {s.tc_cost} TC</div>
                {(s.status === 'active' || s.status === 'pending' || s.status === 'confirmed') && (
                  <Link href={`/session/${s.id}`}>
                    <button className="btn-grad w-full py-2.5 text-xs">Join session →</button>
                  </Link>
                )}
                {s.status === 'completed' && (
                  <Link href={`/session/${s.id}/review`}>
                    <button className="btn-ghost w-full py-2.5 text-xs">Rate session →</button>
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* PINGS */}
      {tab === 'pings' && (
        <div className="px-5 flex flex-col gap-3">
          {pings.length === 0 ? (
            <div className="glass p-8 text-center">
              <p className="text-sm text-muted">No pings right now. When someone wants to learn from you, it&apos;ll show up here.</p>
            </div>
          ) : pings.map(p => (
            <div key={p.id} className="glass p-4">
              <div className="text-sm text-ink mb-1">
                <b>{p.from?.full_name || 'Someone'}</b> wants to learn {p.skill?.icon} {p.skill?.name || 'a skill'}
              </div>
              {p.message && <div className="text-xs text-muted mb-3">&ldquo;{p.message}&rdquo;</div>}
              <div className="flex gap-2">
                <button className="btn-grad flex-1 py-2.5 text-xs">Accept</button>
                <button className="btn-ghost flex-1 py-2.5 text-xs">Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav active="session" />
    </div>
  )
}
