import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [profileRes, skillsRes, balanceRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_skills').select('*, skills(name, category, icon)').eq('user_id', user.id),
    supabase.rpc('get_balance', { p_user_id: user.id }),
  ])

  const profile = profileRes.data
  const skills  = skillsRes.data || []
  const balance = balanceRes.data?.[0] || { available_balance: 0 }
  const firstName = profile?.full_name?.split(' ')[0] || 'User'

  async function signOut() {
    'use server'
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/auth')
  }

  const BADGES = [
    { icon: '✦', label: 'First session', earned: profile?.sessions_taught > 0 || profile?.sessions_learned > 0 },
    { icon: '◎', label: 'Skill Mirror', earned: profile?.skill_mirror_done },
    { icon: '🌍', label: 'Global learner', earned: (profile?.sessions_learned || 0) >= 3 },
    { icon: '⬡', label: 'Flow master',   earned: (profile?.sessions_taught || 0) >= 5 },
  ]

  return (
    <div className="min-h-screen pb-24">

      {/* Profile hero */}
      <div className="px-5 pt-14 pb-8 text-center"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(240,168,48,0.15) 0%, transparent 60%)' }}>

        {/* Avatar with spinning ring */}
        <div className="relative inline-block mb-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center font-display text-3xl text-white"
            style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
            {firstName[0]?.toUpperCase()}
          </div>
        </div>

        <div className="font-display text-2xl font-light mb-1">
          {profile?.full_name || 'Your Name'}
        </div>
        <div className="text-xs font-mono text-muted">
          {profile?.username ? `@${profile.username}` : user.email} · {profile?.location || 'Antwerp'}
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-8 mt-5">
          {[
            { val: balance.available_balance, label: 'Balance' },
            { val: profile?.sessions_taught || 0, label: 'Taught' },
            { val: profile?.rating_as_teacher ? profile.rating_as_teacher.toFixed(1) : '—', label: 'Rating' },
          ].map(({ val, label }) => (
            <div key={label} className="text-center">
              <div className="grad-text font-display text-2xl font-light">{val}</div>
              <div className="text-[10px] font-mono text-muted uppercase tracking-widest">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tier badge */}
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

      {/* Skill graph */}
      <div className="px-5 mb-5">
        <div className="rounded-2xl p-5" style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
          <h3 className="font-display text-lg mb-4">Your skill graph</h3>
          {skills.length === 0 ? (
            <p className="text-sm text-muted">Complete the Skill Mirror to build your skill graph.</p>
          ) : (
            <div className="space-y-3">
              {skills.map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="text-sm w-32 flex-shrink-0 truncate">
                    {s.skills?.icon} {s.skills?.name}
                  </div>
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(245,237,216,0.06)' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${(s.proficiency || 5) * 10}%`, background: 'linear-gradient(135deg, #F0A830, #D03878)' }} />
                  </div>
                  <div className="text-xs font-mono text-muted w-8 text-right">
                    {(s.proficiency || 5) * 10}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="px-5 mb-5">
        <h3 className="font-display text-lg mb-3">Badges</h3>
        <div className="flex flex-wrap gap-2">
          {BADGES.map(b => (
            <div key={b.label}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-xs"
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

      {/* Sign out */}
      <div className="px-5">
        <form action={signOut}>
          <button type="submit"
            className="w-full py-3 rounded-xl text-xs font-mono text-muted transition-all hover:text-sand"
            style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.06)' }}>
            Sign out
          </button>
        </form>
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
