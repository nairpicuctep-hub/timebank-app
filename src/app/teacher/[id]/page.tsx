'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Link from 'next/link'

/* -------------------------------------------------------------------------
   Teacher profile (/teacher/[id]) — light/Bricolage.
   Booking calls the real 7-arg book_session RPC (escrows learner TC).
   Availability: day_of_week (0=Sun), start_time/end_time, is_active.
   ------------------------------------------------------------------------- */

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function TeacherPage() {
  const { id } = useParams()
  const router = useRouter()
  const [teacher, setTeacher] = useState<any>(null)
  const [skills, setSkills] = useState<any[]>([])
  const [availability, setAvailability] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedSkill, setSelectedSkill] = useState<any>(null)
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(false)
  const [balance, setBalance] = useState(0)
  const [showPing, setShowPing] = useState(false)
  const [pingMsg, setPingMsg] = useState('')
  const [pinging, setPinging] = useState(false)
  const [pingSent, setPingSent] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      setCurrentUser(session.user)

      const [profileRes, skillsRes, availRes, balRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('user_skills').select('*, skills(id, name, icon, category, slug)').eq('user_id', id).eq('role', 'teacher'),
        supabase.from('availability').select('*').eq('user_id', id).eq('is_active', true).order('day_of_week').order('start_time'),
        supabase.rpc('get_balance', { p_user_id: session.user.id }),
      ])

      setTeacher(profileRes.data)
      setSkills(skillsRes.data || [])
      setAvailability(availRes.data || [])
      setBalance(balRes.data?.[0]?.available_balance || 0)
      if (skillsRes.data?.length) setSelectedSkill(skillsRes.data[0].skill_id)
      setLoading(false)
    }
    load()
  }, [id, router])

  async function bookSession() {
    if (!selectedSlot || !selectedSkill) return
    setBooking(true)
    const supabase = createClient()

    // build next occurrence of the selected weekday/time
    const now = new Date()
    const daysUntil = (selectedSlot.day_of_week - now.getDay() + 7) % 7 || 7
    const when = new Date(now)
    when.setDate(now.getDate() + daysUntil)
    const [h, m] = selectedSlot.start_time.split(':')
    when.setHours(parseInt(h), parseInt(m), 0, 0)

    const { error } = await supabase.rpc('book_session', {
      p_learner_id: currentUser.id,
      p_teacher_id: id,
      p_skill_id: String(selectedSkill),
      p_scheduled_at: when.toISOString(),
      p_duration_min: 60,
      p_tc_cost: 1,
      p_channel: 'video',
    })

    setBooking(false)
    if (error) { alert('Couldn’t book: ' + error.message); return }
    setBooked(true)
    setTimeout(() => router.push('/home'), 1800)
  }

  async function sendPing() {
    setPinging(true)
    const supabase = createClient()
    const { error } = await supabase.from('session_pings').insert({
      from_user: currentUser.id,
      to_user: id,
      skill_id: selectedSkill ? Number(selectedSkill) : null,
      message: pingMsg || 'Are you free for a session soon?',
    })
    setPinging(false)
    if (error) { alert('Couldn’t send ping: ' + error.message); return }
    setShowPing(false); setPingSent(true)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm font-mono text-muted">Loading…</p>
    </div>
  )
  if (!teacher) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-muted">Teacher not found</p>
    </div>
  )

  const firstName = teacher.full_name?.split(' ')[0] || 'Teacher'

  return (
    <div className="min-h-screen pb-28">

      {/* hero */}
      <div className="h-44 flex items-end px-5 pb-4 relative" style={{ background: 'linear-gradient(135deg,#F0A830,#E85030,#D03878)' }}>
        <Link href="/session" className="absolute top-12 left-5 text-white text-sm font-medium" style={{ opacity: 0.85 }}>← Back</Link>
        <div className="flex items-end gap-4 w-full">
          <div className="w-16 h-16 rounded-full flex items-center justify-center font-display text-2xl text-white overflow-hidden flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.22)', border: '2px solid rgba(255,255,255,0.45)' }}>
            {teacher.avatar_url
              ? <img src={teacher.avatar_url} className="w-full h-full object-cover" alt="" />
              : firstName[0]?.toUpperCase()}
          </div>
          <div className="text-white">
            <div className="font-display font-semibold text-2xl leading-tight">{teacher.full_name}</div>
            <div className="text-xs" style={{ opacity: 0.9 }}>
              {teacher.location || 'Worldwide'} · ★ {Number(teacher.rating_as_teacher || 0).toFixed(1)} · {teacher.sessions_taught || 0} sessions
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-5">

        {booked && (
          <div className="p-5 text-center rounded-card" style={{ background: 'var(--mint-bg)', border: '1px solid #bbf7d0' }}>
            <div className="text-2xl mb-1">✦</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--mint)' }}>Booked! 1 TC is now held in escrow.</div>
            <div className="text-xs text-muted mt-1">Released to {firstName} when you both confirm the session.</div>
          </div>
        )}
        {pingSent && (
          <div className="p-4 text-center rounded-card glass">
            <div className="text-sm font-semibold text-ink">Ping sent ⚡</div>
            <div className="text-xs text-muted mt-0.5">{firstName} will be notified.</div>
          </div>
        )}

        {teacher.bio && <p className="text-sm text-text">{teacher.bio}</p>}

        {/* skill select */}
        <div>
          <h3 className="font-display font-semibold text-lg text-ink mb-3">What do you want to learn?</h3>
          {skills.length === 0 ? (
            <div className="glass p-4 text-center"><p className="text-sm text-muted">{firstName} hasn’t listed teaching skills yet.</p></div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map(s => {
                const on = selectedSkill === s.skill_id
                return (
                  <button key={s.skill_id} onClick={() => setSelectedSkill(s.skill_id)}
                    className="px-3 py-2 rounded-btn text-sm font-medium transition-all"
                    style={on
                      ? { background: 'var(--grad)', color: '#fff', border: '1.5px solid transparent' }
                      : { background: 'rgba(255,255,255,0.6)', color: 'var(--text)', border: '1.5px solid var(--line)' }}>
                    {s.skills?.icon} {s.skills?.name} {on && '✓'}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* balance */}
        <div className="glass p-3 flex items-center gap-3">
          <span className="text-sm text-muted">Your balance:</span>
          <span className="font-mono text-sm grad-text font-semibold">{balance} TC</span>
          {balance < 1 && <span className="text-xs ml-auto" style={{ color: '#b91c1c' }}>Not enough — earn TC first</span>}
        </div>

        {/* ad-hoc ping */}
        <div>
          <button onClick={() => setShowPing(v => !v)} className="btn-ghost w-full py-3 text-sm flex items-center justify-center gap-2">
            ⚡ Ask if available now
          </button>
          {showPing && (
            <div className="glass p-4 mt-3">
              <p className="text-xs text-muted mb-2">Send a quick ping — they’ll get notified.</p>
              <textarea rows={3} value={pingMsg} onChange={e => setPingMsg(e.target.value)}
                placeholder="Hi! Are you free for a quick session? I’d love to learn…" style={{ resize: 'none', marginBottom: 10 }} />
              <button onClick={sendPing} disabled={pinging} className="btn-grad w-full py-2.5 text-sm">
                {pinging ? 'Sending…' : 'Send ping →'}
              </button>
            </div>
          )}
        </div>

        {/* availability */}
        <div>
          <h3 className="font-display font-semibold text-lg text-ink mb-3">Book a session</h3>
          {availability.length === 0 ? (
            <div className="glass p-4 text-center"><p className="text-sm text-muted">No set availability — try the ping above.</p></div>
          ) : (
            <div className="flex flex-col gap-2">
              {DAYS.map((day, i) => {
                const slots = availability.filter(a => a.day_of_week === i)
                if (!slots.length) return null
                return (
                  <div key={i} className="glass p-3">
                    <div className="text-xs font-mono text-muted uppercase tracking-widest mb-2">{day}</div>
                    <div className="flex flex-wrap gap-2">
                      {slots.map(slot => {
                        const on = selectedSlot?.id === slot.id
                        return (
                          <button key={slot.id} onClick={() => setSelectedSlot(slot)}
                            className="px-3 py-1.5 rounded-btn text-xs font-mono transition-all"
                            style={on
                              ? { background: 'var(--grad)', color: '#fff', border: '1px solid transparent' }
                              : { background: 'var(--cream-2)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
                            {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* book button */}
        {selectedSlot && (
          <button onClick={bookSession} disabled={booking || balance < 1}
            className="btn-grad w-full py-4 text-sm">
            {booking ? 'Booking…' : `Book ${DAYS[selectedSlot.day_of_week]} ${selectedSlot.start_time.slice(0, 5)} — 1 TC`}
          </button>
        )}
      </div>

      <BottomNav active="session" />
    </div>
  )
}
