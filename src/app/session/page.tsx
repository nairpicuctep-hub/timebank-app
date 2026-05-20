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
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      const { data } = await supabase
        .from('user_skills')
        .select('*, profiles:user_id(id, full_name, rating_as_teacher, sessions_taught, location, tier), skills(name, icon, category)')
        .eq('role', 'teacher')
        .limit(20)

      const grouped = (data || []).reduce((acc: any, t: any) => {
        const uid = t.profiles?.id
        if (!uid) return acc
        if (!acc[uid]) acc[uid] = { profile: t.profiles, skills: [] }
        acc[uid].skills.push({ ...t.skills, proficiency: t.proficiency })
        return acc
      }, {})

      setTeachers(Object.values(grouped))
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm font-mono" style={{ color: '#9a8f82' }}>Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen pb-24 px-5 pt-14">
      <h1 className="font-display text-3xl font-light mb-2 fade-up">Find a teacher</h1>
      <p className="text-sm text-muted mb-6 fade-up-1">Matched to your skill gap for optimal flow</p>

      <div className="mb-5 fade-up-1">
        <input placeholder="Search skills, languages, topics…" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-5 fade-up-2" style={{ scrollbarWidth: 'none' }}>
        {['All', 'Languages', 'Tech', 'Music', 'Finance', 'Arts', 'Sports'].map((cat, i) => (
          <button key={cat}
            className="whitespace-nowrap px-4 py-2 rounded-full text-xs transition-all flex-shrink-0"
            style={{
              background: i === 0 ? 'linear-gradient(135deg, #F0A830, #D03878)' : '#1c1917',
              border: i === 0 ? 'none' : '1px solid rgba(245,237,216,0.08)',
              color: i === 0 ? '#fff' : '#9a8f82',
            }}>
            {cat}
          </button>
        ))}
      </div>

      {teachers.length === 0 ? (
        <div className="rounded-2xl p-8 text-center fade-up-2"
          style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
          <div className="text-2xl mb-3">◎</div>
          <p className="text-sm text-muted mb-4">No teachers yet — be the first!</p>
          <Link href="/onboarding">
            <span className="text-xs font-mono" style={{ color: '#F0A830' }}>Complete Skill Mirror →</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3 fade-up-2">
          {teachers.map((t: any, i: number) => (
            <div key={t.profile.id} className="rounded-2xl overflow-hidden"
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
                  {t.profile.rating_as_teacher > 0 && (
                    <div className="ml-auto text-xs font-mono text-white">★ {Number(t.profile.rating_as_teacher).toFixed(1)}</div>
                  )}
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
                  <button className="text-xs px-4 py-2 rounded-xl text-white"
                    style={{ background: 'linear-gradient(135deg, #F0A830, #D03878)' }}>
                    Book session →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <BottomNav active="session" />
    </div>
  )
}
