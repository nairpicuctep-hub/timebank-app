'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

/* -------------------------------------------------------------------------
   Coachmark — a one-time welcome tour for the home screen.
   Spotlights elements in sequence with a friendly bubble, then marks
   profiles.tour_completed = true so it never shows again.

   HOW TO WIRE (two tiny edits to HomeClient — no logic changes):
   1) Add id attributes to the elements you want highlighted, e.g.:
        <div id="tour-balance" className="grad-card …">   (TC hero)
        <div id="tour-level"   className="glass …">       (XP/level strip)
        <Link id="tour-explore" href="/session">…         (or any feed item)
        <Link id="tour-profile" href="/profile">…          (avatar in header)
   2) Render once near the end of HomeClient:
        <Coachmark steps={[
          { target: 'tour-balance', title: 'Your Time Credits', body: 'Earn 1 by teaching an hour, spend 1 to learn. This is your balance.' },
          { target: 'tour-level',   title: 'Level up', body: 'Teach, learn, keep streaks — climb from Time Seed to Legend.' },
          { target: 'tour-profile', title: 'Your profile', body: 'Skills, badges and settings live here. Finish your profile to get matched.' },
          { target: 'tour-explore', title: 'Find a teacher', body: 'Browse people offering skills you want — book a session in a tap.' },
        ]} />

   If a target id isn't on the page, that step is skipped gracefully.
   ------------------------------------------------------------------------- */

type Step = { target: string; title: string; body: string }

export default function Coachmark({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(false)
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  // decide whether to run (only if not completed)
  useEffect(() => {
    const supabase = createClient()
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('profiles').select('tour_completed').eq('id', session.user.id).single()
      if (data && data.tour_completed === false) {
        // small delay so the home content has painted
        setTimeout(() => setActive(true), 600)
      }
    }
    check()
  }, [])

  // find the current target's position
  const measure = useCallback(() => {
    if (!active) return
    let idx = i
    // skip steps whose target isn't present
    while (idx < steps.length && !document.getElementById(steps[idx].target)) idx++
    if (idx >= steps.length) { finish(); return }
    if (idx !== i) setI(idx)
    const el = document.getElementById(steps[idx].target)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => setRect(el.getBoundingClientRect()), 300)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, i, steps])

  useEffect(() => { measure() }, [measure])
  useEffect(() => {
    if (!active) return
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('scroll', onResize, true) }
  }, [active, measure])

  async function finish() {
    setActive(false)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session) await supabase.from('profiles').update({ tour_completed: true }).eq('id', session.user.id)
  }

  function next() {
    if (i >= steps.length - 1) { finish(); return }
    setI(i + 1)
  }

  if (!active || !rect) return null

  const step = steps[i]
  const pad = 8
  const spot = { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
  // bubble below the spotlight if room, else above
  const below = spot.top + spot.height + 150 < window.innerHeight
  const bubbleTop = below ? spot.top + spot.height + 12 : Math.max(12, spot.top - 12 - 150)

  return (
    <div className="fixed inset-0 z-[200]" style={{ pointerEvents: 'auto' }}>
      {/* dim overlay with a "hole" via box-shadow on the spotlight */}
      <div
        onClick={next}
        style={{
          position: 'absolute',
          top: spot.top, left: spot.left, width: spot.width, height: spot.height,
          borderRadius: 16,
          boxShadow: '0 0 0 9999px rgba(40,20,10,0.55)',
          border: '2px solid rgba(255,255,255,0.9)',
          transition: 'all 0.3s ease',
        }}
      />
      {/* bubble */}
      <div className="glass" style={{
        position: 'absolute', left: 16, right: 16, top: bubbleTop, maxWidth: 360, margin: '0 auto', padding: 18,
      }}>
        <div className="flex items-center justify-between mb-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-faint">{i + 1} of {steps.length}</div>
          <button onClick={finish} className="text-xs text-muted">Skip tour</button>
        </div>
        <h3 className="font-display font-semibold text-lg text-ink mb-1">{step.title}</h3>
        <p className="text-sm text-muted mb-3">{step.body}</p>
        <div className="flex gap-2">
          {/* progress dots */}
          <div className="flex items-center gap-1.5 flex-1">
            {steps.map((_, n) => (
              <span key={n} className="rounded-pill transition-all"
                style={{ width: n === i ? 18 : 6, height: 6, background: n === i ? 'var(--grad)' : 'rgba(120,70,40,0.2)' }} />
            ))}
          </div>
          <button onClick={next} className="btn-grad px-5 py-2 text-sm">
            {i >= steps.length - 1 ? 'Got it ✦' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
