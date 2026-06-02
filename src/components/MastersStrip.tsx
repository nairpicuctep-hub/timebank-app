'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

/* -------------------------------------------------------------------------
   MastersStrip — "Masters you'll want to meet" showcase for Home.
   • Shows VIP-flagged teachers in a horizontal scroller.
   • Personalizes: if a master teaches something on the viewer's learn_skills,
     the card says "Teaches <skill> — on your learn list".
   • Renders NOTHING if there are no VIPs (no empty state, no clutter).

   Usage in HomeClient: <MastersStrip learnSkills={profile?.learn_skills || []} />
   ------------------------------------------------------------------------- */

const RING = 'linear-gradient(135deg,#F0A830,#E85030,#D03878)'

export default function MastersStrip({ learnSkills = [] }: { learnSkills?: string[] }) {
  const [masters, setMasters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      // VIP profiles + the skills they teach (to personalize)
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, vip_title, headline_skill, teach_skills, rating_as_teacher')
        .eq('is_vip', true)
        .limit(12)
      setMasters(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading || masters.length === 0) return null

  const learnSet = new Set(learnSkills)

  return (
    <div className="rise-2">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="font-display font-semibold text-[17px] text-ink">Masters you&apos;ll want to meet</h3>
        <span className="text-[10px] font-mono uppercase tracking-widest text-faint">Verified</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {masters.map(m => {
          // find a teach-skill that's on the viewer's learn list
          const match = (m.teach_skills || []).find((s: string) => learnSet.has(s))
          const line = match
            ? `Teaches ${prettySlug(match)} — on your learn list`
            : (m.headline_skill ? `Master of ${m.headline_skill}` : (m.vip_title || 'Verified Master'))

          return (
            <Link href={`/teacher/${m.id}`} key={m.id} className="flex-shrink-0" style={{ width: 168 }}>
              <div className="glass overflow-hidden" style={{ height: '100%' }}>
                {/* avatar with gradient ring */}
                <div className="flex flex-col items-center pt-4 px-3">
                  <div style={{ padding: 2, borderRadius: '50%', background: RING }}>
                    <div className="rounded-full overflow-hidden flex items-center justify-center text-white font-display font-semibold"
                      style={{ width: 56, height: 56, background: m.avatar_url ? '#fff' : RING, border: '2px solid #fff' }}>
                      {m.avatar_url
                        ? <img src={m.avatar_url} className="w-full h-full object-cover" alt="" />
                        : (m.full_name?.[0]?.toUpperCase() || '?')}
                    </div>
                  </div>
                  {/* verified badge */}
                  <div className="flex items-center gap-1 mt-2 px-2 py-0.5 rounded-pill"
                    style={{ background: 'var(--tc-bg)', border: '1px solid var(--tc-bd)' }}>
                    <span style={{ fontSize: 10 }}>✦</span>
                    <span className="font-mono" style={{ fontSize: 9, color: 'var(--tc-tx)', fontWeight: 600 }}>MASTER</span>
                  </div>
                </div>
                {/* name + personalized line */}
                <div className="px-3 py-3 text-center">
                  <div className="text-sm font-semibold text-ink leading-tight truncate">{m.full_name}</div>
                  {m.vip_title && <div className="text-[10px] text-muted mt-0.5 truncate">{m.vip_title}</div>}
                  <div className="text-[11px] mt-1.5 leading-snug"
                    style={{ color: match ? 'var(--coral)' : 'var(--muted)', fontWeight: match ? 600 : 400 }}>
                    {line}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// turn a slug like "quantum_physics" into "Quantum Physics" for display
function prettySlug(slug: string) {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
