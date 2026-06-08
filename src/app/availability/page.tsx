'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import { toast } from '@/components/ui/Feedback'
import Link from 'next/link'

/* -------------------------------------------------------------------------
   Availability (/availability) — light/Bricolage.
   Wired to the `availability` table: day_of_week (0=Sun), start_time,
   end_time, is_active. Add / toggle / delete slots.
   ------------------------------------------------------------------------- */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newSlot, setNewSlot] = useState({ day_of_week: 1, start_time: '09:00', end_time: '10:00' })
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('availability').select('*')
        .eq('user_id', session.user.id).order('day_of_week').order('start_time')
      setSlots(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  async function addSlot() {
    if (newSlot.end_time <= newSlot.start_time) { toast('End time must be after start time.', 'error'); return }
    setAdding(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data, error } = await supabase.from('availability')
      .insert({ user_id: session.user.id, ...newSlot, is_active: true }).select().single()
    if (!error && data) {
      setSlots([...slots, data].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)))
    } else if (error) {
      toast(error.message.includes('duplicate') ? 'You already have a slot at that time.' : error.message, 'error')
    }
    setAdding(false)
  }

  async function deleteSlot(id: string) {
    const supabase = createClient()
    await supabase.from('availability').delete().eq('id', id)
    setSlots(slots.filter(s => s.id !== id))
  }

  async function toggleSlot(id: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('availability').update({ is_active: !current }).eq('id', id)
    setSlots(slots.map(s => s.id === id ? { ...s, is_active: !current } : s))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm font-mono text-muted">Loading…</p>
    </div>
  )

  const activeCount = slots.filter(s => s.is_active).length

  return (
    <div className="min-h-screen pb-28 px-5 pt-12">
      <Link href="/profile" className="text-sm text-muted">← Back</Link>
      <h1 className="font-display font-semibold text-[26px] text-ink mt-3 mb-1">Availability</h1>
      <p className="text-sm text-muted mb-2">Set when you can teach — learners book these slots.</p>

      {/* visibility hint */}
      <div className="glass p-3 mb-5 flex items-center gap-2.5">
        <span className="text-lg">{activeCount >= 2 ? '✅' : '💡'}</span>
        <p className="text-xs text-text">
          {activeCount >= 2
            ? `You’re visible to learners with ${activeCount} active slots.`
            : `Add at least 2 active slots to appear in the teacher feed.`}
        </p>
      </div>

      {/* add slot */}
      <div className="glass p-5 mb-5">
        <h3 className="font-display font-semibold text-lg text-ink mb-4">Add a time slot</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1.5">Day</label>
            <select value={newSlot.day_of_week} onChange={e => setNewSlot({ ...newSlot, day_of_week: parseInt(e.target.value) })}>
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1.5">Start</label>
            <select value={newSlot.start_time} onChange={e => setNewSlot({ ...newSlot, start_time: e.target.value })}>
              {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1.5">End</label>
            <select value={newSlot.end_time} onChange={e => setNewSlot({ ...newSlot, end_time: e.target.value })}>
              {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>
        <button onClick={addSlot} disabled={adding} className="btn-grad w-full py-3 text-sm">
          {adding ? 'Adding…' : '+ Add slot'}
        </button>
      </div>

      {/* existing slots */}
      <div className="flex flex-col gap-2">
        {slots.length === 0 ? (
          <div className="glass p-6 text-center">
            <p className="text-sm text-muted">No slots yet — add your first availability above.</p>
          </div>
        ) : slots.map(slot => (
          <div key={slot.id} className="glass p-4 flex items-center gap-3"
            style={{ opacity: slot.is_active ? 1 : 0.55 }}>
            <div className="w-12 text-center">
              <div className="font-display font-semibold text-ink">{DAYS_SHORT[slot.day_of_week]}</div>
            </div>
            <div className="flex-1 font-mono text-sm text-text">
              {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
            </div>
            <button onClick={() => toggleSlot(slot.id, slot.is_active)}
              className="text-xs font-medium px-3 py-1.5 rounded-pill"
              style={slot.is_active
                ? { background: 'var(--mint-bg)', color: 'var(--mint)', border: '1px solid #bbf7d0' }
                : { background: 'var(--cream-2)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
              {slot.is_active ? 'Active' : 'Paused'}
            </button>
            <button onClick={() => deleteSlot(slot.id)} className="text-muted px-1" style={{ fontSize: 18 }}>×</button>
          </div>
        ))}
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
