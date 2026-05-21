'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Link from 'next/link'

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const GRAD_COMBOS = [
  'linear-gradient(135deg, #F0A830, #E85030, #D03878)',
  'linear-gradient(135deg, #1ED8A0, #185FA5)',
  'linear-gradient(135deg, #D03878, #533AB7)',
]

export default function TeacherPage() {
  const { id } = useParams()
  const router = useRouter()
  const [teacher, setTeacher] = useState<any>(null)
  const [skills, setSkills] = useState<any[]>([])
  const [availability, setAvailability] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedSkill, setSelectedSkill] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [pinging, setPinging] = useState(false)
  const [pingMsg, setPingMsg] = useState('')
  const [showPing, setShowPing] = useState(false)
  const [booked, setBooked] = useState(false)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      setCurrentUser(session.user)

      const [profileRes, skillsRes, availRes, balRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('user_skills').select('*, skills(name, icon, category)').eq('user_id', id).eq('role', 'teacher'),
        supabase.from('availability').select('*').eq('user_id', id).eq('is_active', true).order('day_of_week').order('start_time'),
        supabase.rpc('get_balance', { p_user_id: session.user.id })
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
    const now = new Date()
    const day = selectedSlot.day_of_week
    const daysUntil = (day - now.getDay() + 7) % 7 || 7
    const sessionDate = new Date(now)
    sessionDate.setDate(now.getDate() + daysUntil)
    const [h, m] = selectedSlot.start_time.split(':')
    sessionDate.setHours(parseInt(h), parseInt(m), 0, 0)

    const { data, error } = await supabase.rpc('book_session', {
      p_learner_id: currentUser.id,
      p_teacher_id: id,
      p_skill_id: selectedSkill,
      p_scheduled_at: sessionDate.toISOString(),
      p_duration_min: 60,
      p_tc_cost: 1,
      p_channel: 'video'
    })

    setBooking(false)
    if (error) { alert('Error: ' + error.message); return }
    setBooked(true)
    setTimeout(() => router.push('/home'), 2000)
  }

  async function sendPing() {
    setPinging(true)
    const supabase = createClient()
    const { error } = await supabase.from('session_pings').insert({
      from_user: currentUser.id,
      to_user: id,
      skill_id: selectedSkill || null,
      message: pingMsg || 'Are you available for a session now?'
    })
    setPinging(false)
    if (error) { alert('Error: ' + error.message); return }
    setShowPing(false)
    alert('Ping sent! You\'ll be notified when they respond.')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm font-mono" style={{ color: '#9a8f82' }}>Loading…</p>
    </div>
  )

  if (!teacher) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-muted">Teacher not found</p>
    </div>
  )

  const firstName = teacher.full_name?.split(' ')[0] || 'Teacher'

  return (
    <div className="min-h-screen pb-24">

      {/* Hero */}
      <div className="h-40 flex items-end px-5 pb-4 relative"
        style={{ background: GRAD_COMBOS[0] }}>
        <Link href="/session" className="absolute top-14 left-5 text-white text-sm opacity-70">← Back</Link>
        <div className="flex items-end gap-4 w-full">
          <div className="w-16 h-16 rounded-full flex items-center justify-center font-display text-2xl text-white flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)' }}>
            {firstName[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-display text-2xl font-light text-white">{teacher.full_name}</div>
            <div className="text-xs text-white opacity-70">{teacher.location || 'Worldwide'} · ★ {Number(teacher.rating_as_teacher || 0).toFixed(1)} · {teacher.sessions_taught || 0} sessions</div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5">

        {booked && (
          <div className="rounded-2xl p-5 mb-5 text-center"
            style={{ background: 'rgba(30,216,160,0.1)', border: '1px solid rgba(30,216,160,0.3)' }}>
            <div className="text-2xl mb-2">✦</div>
            <div className="text-sm font-medium" style={{ color: '#1ED8A0' }}>Session booked! 1 TC deducted.</div>
          </div>
        )}

        {/* Skills */}
        <div className="mb-5">
          <h3 className="font-display text-lg mb-3">Select skill to learn</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map(s => (
              <button key={s.skill_id} onClick={() => setSelectedSkill(s.skill_id)}
                className="px-3 py-2 rounded-xl text-xs transition-all"
                style={{
                  background: selectedSkill === s.skill_id ? 'rgba(240,168,48,0.15)' : '#1c1917',
                  border: `1px solid ${selectedSkill === s.skill_id ? '#F0A830' : 'rgba(245,237,216,0.08)'}`,
                  color: selectedSkill === s.skill_id ? '#F0A830' : '#F5EDD8'
                }}>
                {s.skills?.icon} {s.skills?.name}
              </button>
            ))}
          </div>
        </div>

        {/* Your balance */}
        <div className="rounded-xl p-3 mb-5 flex items-center gap-3"
          style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
          <span className="text-sm text-muted">Your balance:</span>
          <span className="font-mono text-sm" style={{ color: '#F0A830' }}>{balance} TC</span>
          {balance < 1 && <span className="text-xs text-red-400 ml-auto">Insufficient — earn TC first</span>}
        </div>

        {/* Ad-hoc ping */}
        <div className="mb-5">
          <button onClick={() => setShowPing(!showPing)}
            className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
            style={{ background: '#1c1917', border: '1px solid rgba(240,168,48,0.3)', color: '#F0A830' }}>
            ⚡ Ask if available now
          </button>

          {showPing && (
            <div className="mt-3 rounded-xl p-4" style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
              <p className="text-xs text-muted mb-3">Send a ping — they have 10 minutes to respond</p>
              <textarea
                value={pingMsg}
                onChange={e => setPingMsg(e.target.value)}
                placeholder="Hi! Are you available for a quick session now? I'd love to learn..."
                rows={3}
                style={{ marginBottom: '10px', resize: 'none' }}
              />
              <button onClick={sendPing} disabled={pinging}
                className="w-full py-2 rounded-xl text-sm text-white"
                style={{ background: 'linear-gradient(135deg, #F0A830, #D03878)' }}>
                {pinging ? 'Sending…' : 'Send ping →'}
              </button>
            </div>
          )}
        </div>

        {/* Availability */}
        <div className="mb-5">
          <h3 className="font-display text-lg mb-3">Book a session</h3>
          {availability.length === 0 ? (
            <div className="rounded-xl p-4 text-center" style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
              <p className="text-sm text-muted">No availability set yet — try the ad-hoc ping above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {DAYS.map((day, i) => {
                const slots = availability.filter(a => a.day_of_week === i)
                if (!slots.length) return null
                return (
                  <div key={i} className="rounded-xl p-3" style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
                    <div className="text-xs font-mono text-muted mb-2 uppercase tracking-widest">{day}</div>
                    <div className="flex flex-wrap gap-2">
                      {slots.map(slot => (
                        <button key={slot.id} onClick={() => setSelectedSlot(slot)}
                          className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
                          style={{
                            background: selectedSlot?.id === slot.id ? 'rgba(240,168,48,0.15)' : '#242018',
                            border: `1px solid ${selectedSlot?.id === slot.id ? '#F0A830' : 'rgba(245,237,216,0.06)'}`,
                            color: selectedSlot?.id === slot.id ? '#F0A830' : '#9a8f82'
                          }}>
                          {slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Book button */}
        {selectedSlot && (
          <button onClick={bookSession} disabled={booking || balance < 1}
            className="w-full py-4 rounded-xl text-white text-sm font-medium disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
            {booking ? 'Booking…' : `Book ${DAYS[selectedSlot.day_of_week]} ${selectedSlot.start_time.slice(0,5)} — 1 TC`}
          </button>
        )}
      </div>

      <BottomNav active="session" />
    </div>
  )
}
