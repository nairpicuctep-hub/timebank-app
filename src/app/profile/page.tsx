'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'

export default function ProfilePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      const [profileRes, skillsRes, balanceRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('user_skills').select('*, skills(name, category, icon)').eq('user_id', session.user.id),
        supabase.rpc('get_balance', { p_user_id: session.user.id }),
      ])

      setData({
        profile: profileRes.data,
        skills: skillsRes.data || [],
        balance: balanceRes.data?.[0] || { available_balance: 0 },
        user: session.user
      })
      setLoading(false)
    }
    load()
  }, [router])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm font-mono" style={{ color: '#9a8f82' }}>Loading…</p>
    </div>
  )

  const { profile, skills, balance, user } = data
  const firstName = profile?.full_name?.split(' ')[0] || 'User'

  const BADGES = [
    { icon: '✦', label: 'First session', earned: (profile?.sessions_taught > 0 || profile?.sessions_learned > 0) },
    { icon: '◎', label: 'Skill Mirror',  earned: profile?.skill_mirror_done },
    { icon: '🌍', label: 'Global learner', earned: (profile?.sessions_learned || 0) >= 3 },
    { icon: '⬡', label: 'Flow master',   earned: (profile?.sessions_taught || 0) >= 5 },
  ]

  return (
    <div className="min-h-screen pb-24">
      <div className="px-5 pt-14 pb-8 text-center"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(240,168,48,0.15) 0%, transparent 60%)' }}>
        <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center font-display text-3xl text-white"
          style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
          {firstName[0]?.toUpperCase()}
        </div>
        <div className="font-display text-2xl font-light mb-1">{profile?.full_name || 'Your Name'}</div>
        <div className="text-xs font-mono text-muted">
          {profile?.username ? `@${profile.username}` : user.email} · {profile?.location || 'Antwerp'}
        </div>
        <div className="flex justify-center gap-8 mt-5">
          {[
            { val: balance.available_balance, label: 'Balance' },
            { val: profile?.sessions_taught || 0, label: 'Taught' },
            { val: profile?.rating_as_teacher ? Number(profile.rating_as_teacher).toFixed(1) : '—', label: 'Rating' },
          ].map(({ val, label }) => (
            <div key={label} className="text-center">
              <div className="grad-text font-display text-2xl font-light">{val}</div>
              <div className="text-[10px] font-mono text-muted uppercase tracking-widest">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mb-5">
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
          <span className="text-xs font-mono px-2 py-1 rounded-full capitalize"
            style={{ background: 'rgba(240,168,48,0.1)', border: '1px solid rgba(240,168,48,0.2)', color: '#F0A830' }}>
            {profile?.tier || 'free'}
          </span>
          <span className="text-sm text-muted flex-1">
            {profile?.tier === 'premium' ? '5 TC / month · Priority matching' : '2 TC / month · Basic access'}
          </span>
          {profile?.tier !== 'premium' && (
            <span className="text-xs font-mono" style={{ color: '#F0A830' }}>Upgrade →</span>
          )}
        </div>
      </div>

      <div className="px-5 mb-5">
        <div className="rounded-2xl p-5" style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
          <h3 className="font-display text-lg mb-4">Your skill graph</h3>
          {skills.length === 0 ? (
            <p className="text-sm text-muted">Complete the Skill Mirror to build your skill graph.</p>
          ) : (
            <div className="space-y-3">
              {skills.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="text-sm w-32 flex-shrink-0 truncate">{s.skills?.icon} {s.skills?.name}</div>
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(245,237,216,0.06)' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${(s.proficiency || 5) * 10}%`, background: 'linear-gradient(135deg, #F0A830, #D03878)' }} />
                  </div>
                  <div className="text-xs font-mono text-muted w-8 text-right">{(s.proficiency || 5) * 10}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 mb-5">
        <h3 className="font-display text-lg mb-3">Badges</h3>
        <div className="flex flex-wrap gap-2">
          {BADGES.map(b => (
            <div key={b.label} className="flex items-center gap-2 px-3 py-2 rounded-full text-xs"
              style={{
                background: b.earned ? 'rgba(240,168,48,0.08)' : '#1c1917',
                border: `1px solid ${b.earned ? 'rgba(240,168,48,0.25)' : 'rgba(245,237,216,0.06)'}`,
                color: b.earned ? '#F5EDD8' : '#9a8f82',
                opacity: b.earned ? 1 : 0.5,
              }}>
              <span>{b.icon}</span>{b.label}
            </div>
          ))}
        </div>
      </div>

      <div className="px-5">
        <button onClick={signOut}
          className="w-full py-3 rounded-xl text-xs font-mono text-muted transition-all hover:text-sand"
          style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.06)' }}>
          Sign out
        </button>
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
