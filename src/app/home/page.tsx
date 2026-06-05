'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import HomeClient from './HomeClient'

/* -------------------------------------------------------------------------
   Home — data loader (client). Mirrors your existing pattern: fetch here,
   render in HomeClient. Wired to the real schema:
     get_balance(p_user_id) -> available/escrowed
     profiles row, next upcoming session, teacher feed (grouped user_skills)
   ------------------------------------------------------------------------- */

export default function HomePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const uid = session.user.id

      const nowIso = new Date().toISOString()

      const [profileRes, balanceRes, nextRes, teachersRes, blockedRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.rpc('get_balance', { p_user_id: uid }),
        // soonest upcoming session the user is part of
        supabase.from('sessions')
          .select('*, skill:skill_id(name, icon), teacher:teacher_id(full_name, avatar_url), learner:learner_id(full_name, avatar_url)')
          .or(`teacher_id.eq.${uid},learner_id.eq.${uid}`)
          .in('status', ['pending', 'confirmed', 'active'])
          .gte('scheduled_at', nowIso)
          .order('scheduled_at', { ascending: true })
          .limit(1),
        // teacher feed: real people offering to teach (exclude self)
        supabase.from('user_skills')
          .select('proficiency, skills(name, icon, category), profiles!inner(id, full_name, avatar_url, rating_as_teacher, sessions_taught, location)')
          .eq('role', 'teacher')
          .neq('user_id', uid)
          .limit(40),
        supabase.rpc('blocked_user_ids'),
      ])

      const blocked = new Set((blockedRes.data || []) as string[])

      // group teacher rows by profile (pattern from your session browser), hiding blocked pairs
      const grouped = (teachersRes.data || []).reduce((acc: any, row: any) => {
        const p = row.profiles
        if (!p?.id || blocked.has(p.id)) return acc
        if (!acc[p.id]) acc[p.id] = { profile: p, skills: [] }
        acc[p.id].skills.push({ ...row.skills, proficiency: row.proficiency })
        return acc
      }, {})

      setData({
        profile: profileRes.data,
        balance: balanceRes.data?.[0] || { available_balance: 0, escrowed_balance: 0 },
        nextSession: nextRes.data?.[0] || null,
        teachers: Object.values(grouped),
        uid,
      })
      setLoading(false)
    }

    load()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="grad-card" style={{ width: 64, height: 64, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <span style={{ fontSize: 22, color: '#fff' }}>✦</span>
          </div>
          <p className="text-sm font-mono text-muted">Loading…</p>
        </div>
      </div>
    )
  }

  return <HomeClient {...data} />
}
