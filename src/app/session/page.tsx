'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import BottomNav from '@/components/layout/BottomNav'

const GRAD_COMBOS = [
  'linear-gradient(135deg, #F0A830, #E85030, #D03878)',
  'linear-gradient(135deg, #1ED8A0, #185FA5)',
  'linear-gradient(135deg, #D03878, #533AB7)',
  'linear-gradient(135deg, #F0A830, #533AB7)',
]

export default function SessionPage() {
  const [teachers, setTeachers] = useState<any[]>([])
  const [mySessions, setMySessions] = useState<any[]>([])
  const [pings, setPings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'browse'|'sessions'|'pings'>('browse')
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      const [teachersRes, sessionsRes, pingsRes] = await Promise.all([
        supabase.from('user_skills')
          .select('*, profiles:user_id(id, full_name, rating_as_teacher, sessions_taught, location, tier), skills(name, icon, category)')
          .eq('role', 'teacher').neq('user_id', session.user.id).limit(20),
        supabase.from('sessions')
          .select('*, skills(name, icon), teacher:teacher_id(full_name), learner:learner_id(full_name)')
          .or(`teacher_id.eq.${session.user.id},learner_id.eq.${session.user.id}`)
          .order('scheduled_at', { ascending: false }).limit(10),
        supabase.from('session_pings')
          .select('*, from:from_user(full_name), skill:skill_id(name, icon)')
          .eq('to_user', session.user.id).eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
      ])

      const grouped = (teachersRes.data || []).reduce((acc: any, t: any) => {
        const uid = t.profiles?.id
        if (!uid) return acc
        if (!acc[uid]) acc[uid] = { profile: t.profiles, skills: [] }
        acc[uid].skills.push({ ...t.skills, proficiency: t.proficiency })
        return acc
      }, {})

      setTeachers(Object.values(grouped))
      setMySessions(sessionsRes.data || [])
      setPings(pingsRes.data || [])
      setLoading(false)
    }
    load()
  }, [router])

  async function respondPing(pingId: string, accept: boolean, fromUser: string) {
    const supabase = createClient()
    if (accept) {
      const { data: { session } } = await supabase.auth.getSession()
      const ping = pings.find(p => p.id === pingId)
      const roomName = 'tb-adhoc-' + Math.random().toString(36).slice(2, 10)
      const { data: sess } = await supabase.from('sessions').insert({
        teacher_id: session?.user.id,
        learner_id: fromUser,
        skill_id: ping?.skill_id || null,
        scheduled_at: new Date().toISOString(),
        duration_min: 60, tc_cost: 1,
        status: 'active', channel: 'video',
        actual_start: new Date().toISOString(),
        daily_room_url: `https://timebank.daily.co/${roomName}`,
        daily_room_name: roomName
      }).select().single()

      await supabase.from('session_pings').update({ status: 'accepted', session_id: sess?.id }).eq('id', pingId)
      if (sess) router.push(`/session/${sess.id}`)
    } else {
      await supabase.from('session_pings').update({ status: 'declined' }).eq('id', pingId)
      setPings(pings.filter(p => p.id !== pingId))
    }
  }

  const statusColor: Record<string, string> = {
    pending: '#F0A830', active: '#1ED8A0', completed: '#9a8f82',
    verified: '#1ED8A0', flagged: '#E85030', cancelled: '#6a5f52'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm font-mono" style={{ color: '#9a8f82' }}>Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen pb-24 pt-14">

      {/* Incoming pings banner */}
      {pings.length > 0 && (
        <div className="mx-5 mb-4 rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(240,168,48,0.4)', background: 'rgba(240,168,48,0.05)' }}>
          {pings.map(ping => (
            <div key={ping.id} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: '#F0A830', boxShadow: '0 0 6px #F0A830' }} />
                <span className="text-sm font-medium">⚡ Ping from {ping.from?.full_name}</span>
              </div>
              <p className="text-xs text-muted mb-3">Wants a session now {ping.skill ? `· ${ping.skill.icon} ${ping.skill.name}` : ''}</p>
              <div className="flex gap-2">
                <button onClick={() => respondPing(ping.id, true, ping.from_user)}
                  className="flex-1 py-2 rounded-xl text-white text-xs font-medium"
                  style={{ background: 'linear-gradient(135deg, #1ED8A0, #185FA5)' }}>
                  ✓ Accept — Join now
                </button>
                <button onClick={() => respondPing(ping.id, false, ping.from_user)}
                  className="px-4 py-2 rounded-xl text-xs"
                  style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)', color: '#9a8f82' }}>
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="px-5 mb-5">
        <div className="flex" style={{ background: '#1c1917', borderRadius: '14px', padding: '4px' }}>
          {([['browse','Browse'],['sessions','My sessions'],['pings','Pings']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: tab === t ? 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' : 'transparent',
                color: tab === t ? '#fff' : '#9a8f82'
              }}>
              {label} {t === 'pings' && pings.length > 0 ? `(${pings.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* BROWSE TAB */}
      {tab === 'browse' && (
        <div className="px-5">
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4" style={{ scrollbarWidth: 'none' }}>
            {['All','Languages','Tech','Music','Finance','Arts'].map((cat, i) => (
              <button key={cat} className="whitespace-nowrap px-4 py-2 rounded-full text-xs flex-shrink-0"
                style={{
                  background: i === 0 ? 'linear-gradient(135deg, #F0A830, #D03878)' : '#1c1917',
                  border: i === 0 ? 'none' : '1px solid rgba(245,237,216,0.08)',
                  color: i === 0 ? '#fff' : '#9a8f82'
                }}>{cat}</button>
            ))}
          </div>

          <div className="space-y-3">
            {teachers.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
                <p className="text-sm text-muted">No teachers yet — complete your Skill Mirror to become one!</p>
              </div>
            ) : teachers.map((t: any, i: number) => (
              <Link href={`/teacher/${t.profile.id}`} key={t.profile.id}>
                <div className="rounded-2xl overflow-hidden transition-transform hover:-translate-y-0.5"
                  style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
                  <div className="h-16 flex items-end px-4 pb-3"
                    style={{ background: GRAD_COMBOS[i % GRAD_COMBOS.length] }}>
                    <div className="flex items-end gap-3 w-full">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-display text-lg text-white flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)' }}>
                        {t.profile.full_name?.[0] || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{t.profile.full_name}</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{t.profile.location || 'Worldwide'}</div>
                      </div>
                      <div className="ml-auto text-xs text-white opacity-80">⚡ Ping · 📅 Book</div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {t.skills.map((s: any) => (
                        <span key={s.name} className="text-xs px-2 py-1 rounded-full"
                          style={{ background: 'rgba(245,237,216,0.06)', border: '1px solid rgba(245,237,216,0.08)' }}>
                          {s.icon} {s.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono" style={{ color: '#F0A830' }}>1 TC / hour</span>
                      <span className="text-xs text-muted">View profile →</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* MY SESSIONS TAB */}
      {tab === 'sessions' && (
        <div className="px-5 space-y-3">
          {mySessions.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
              <p className="text-sm text-muted mb-3">No sessions yet</p>
              <button onClick={() => setTab('browse')} className="text-xs font-mono" style={{ color: '#F0A830' }}>Browse teachers →</button>
            </div>
          ) : mySessions.map(s => (
            <div key={s.id} className="rounded-2xl p-4"
              style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{s.skills?.icon} {s.skills?.name}</div>
                <span className="text-xs font-mono px-2 py-1 rounded-full"
                  style={{ background: 'rgba(245,237,216,0.06)', color: statusColor[s.status] || '#9a8f82' }}>
                  {s.status}
                </span>
              </div>
              <div className="text-xs text-muted mb-3">
                {new Date(s.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {' · '}{s.tc_cost} TC
              </div>
              {(s.status === 'active' || s.status === 'pending') && (
                <Link href={`/session/${s.id}`}>
                  <button className="w-full py-2 rounded-xl text-white text-xs"
                    style={{ background: 'linear-gradient(135deg, #1ED8A0, #185FA5)' }}>
                    Join session →
                  </button>
                </Link>
              )}
              {s.status === 'completed' && (
                <Link href={`/session/${s.id}/review`}>
                  <button className="w-full py-2 rounded-xl text-xs"
                    style={{ background: 'rgba(240,168,48,0.1)', border: '1px solid rgba(240,168,48,0.3)', color: '#F0A830' }}>
                    Rate session →
                  </button>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PINGS TAB */}
      {tab === 'pings' && (
        <div className="px-5">
          {pings.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
              <p className="text-sm text-muted">No pending pings</p>
            </div>
          ) : pings.map(ping => (
            <div key={ping.id} className="rounded-2xl p-4 mb-3"
              style={{ background: '#1c1917', border: '1px solid rgba(240,168,48,0.3)' }}>
              <div className="text-sm font-medium mb-1">⚡ {ping.from?.full_name} wants a session</div>
              {ping.message && <p className="text-xs text-muted mb-3">"{ping.message}"</p>}
              <div className="flex gap-2">
                <button onClick={() => respondPing(ping.id, true, ping.from_user)}
                  className="flex-1 py-2 rounded-xl text-white text-xs"
                  style={{ background: 'linear-gradient(135deg, #1ED8A0, #185FA5)' }}>Accept</button>
                <button onClick={() => respondPing(ping.id, false, ping.from_user)}
                  className="flex-1 py-2 rounded-xl text-xs"
                  style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)', color: '#9a8f82' }}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Availability link */}
      <div className="px-5 mt-6">
        <Link href="/availability">
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.06)' }}>
            <span className="text-lg">📅</span>
            <div>
              <div className="text-sm font-medium">Set your availability</div>
              <div className="text-xs text-muted">Let learners book sessions with you</div>
            </div>
            <span className="ml-auto text-xs text-muted">→</span>
          </div>
        </Link>
      </div>

      <BottomNav active="session" />
    </div>
  )
}
