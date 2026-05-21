'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const HOURS = Array.from({length: 24}, (_, i) => `${String(i).padStart(2,'0')}:00`)

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
    setAdding(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data, error } = await supabase.from('availability').insert({
      user_id: session.user.id,
      ...newSlot
    }).select().single()
    if (!error && data) setSlots([...slots, data])
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
      <p className="text-sm font-mono" style={{ color: '#9a8f82' }}>Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen pb-24 px-5 pt-14">
      <h1 className="font-display text-3xl font-light mb-2">Availability</h1>
      <p className="text-sm text-muted mb-6">Set when you're available to teach. Learners can book these slots.</p>

      {/* Add slot */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
        <h3 className="font-display text-lg mb-4">Add time slot</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1.5">Day</label>
            <select value={newSlot.day_of_week}
              onChange={e => setNewSlot({...newSlot, day_of_week: parseInt(e.target.value)})}>
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1.5">Start</label>
            <select value={newSlot.start_time}
              onChange={e => setNewSlot({...newSlot, start_time: e.target.value})}>
              {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1.5">End</label>
            <select value={newSlot.end_time}
              onChange={e => setNewSlot({...newSlot, end_time: e.target.value})}>
              {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>
        <button onClick={addSlot} disabled={adding}
          className="w-full py-3 rounded-xl text-white text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
          {adding ? 'Adding…' : '+ Add slot'}
        </button>
      </div>

      {/* Existing slots */}
      <div className="space-y-2">
        {slots.length === 0 ? (
          <div className="rounded-xl p-6 text-center" style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
            <p className="text-sm text-muted">No slots yet — add your first availability above</p>
          </div>
        ) : (
          slots.map(slot => (
            <div key={slot.id} className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: '#1c1917', border: `1px solid ${slot.is_active ? 'rgba(240,168,48,0.2)' : 'rgba(245,237,216,0.06)'}` }}>
              <div className="flex-1">
                <div className="text-sm font-medium">{DAYS[slot.day_of_week]}</div>
                <div className="text-xs font-mono text-muted">
                  {slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}
                </div>
              </div>
              <button onClick={() => toggleSlot(slot.id, slot.is_active)}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{
                  background: slot.is_active ? 'rgba(30,216,160,0.1)' : 'rgba(154,143,130,0.1)',
                  color: slot.is_active ? '#1ED8A0' : '#9a8f82',
                  border: `1px solid ${slot.is_active ? 'rgba(30,216,160,0.3)' : 'rgba(154,143,130,0.2)'}`
                }}>
                {slot.is_active ? 'Active' : 'Paused'}
              </button>
              <button onClick={() => deleteSlot(slot.id)}
                className="text-xs px-2 py-1.5 rounded-lg"
                style={{ background: 'rgba(232,80,48,0.1)', color: '#E85030', border: '1px solid rgba(232,80,48,0.2)' }}>
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
