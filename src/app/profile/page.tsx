'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Link from 'next/link'

const LEVEL_NAMES = ['','Seedling','Sprout','Learner','Scholar','Mentor','Master','Legend']
const LEVEL_ICONS = ['','🌱','🌿','📚','🎓','🧑‍🏫','⭐','🏆']
const LEVEL_XP    = [0, 0, 100, 250, 500, 1000, 2000, 5000]

export default function ProfilePage() {
  const [data, setData] = useState<any>(null)
  const [badges, setBadges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      const [profileRes, skillsRes, balanceRes, badgesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('user_skills').select('*, skills(name, category, icon)').eq('user_id', session.user.id),
        supabase.rpc('get_balance', { p_user_id: session.user.id }),
        supabase.from('badges_earned')
          .select('*, badge_definitions(*)')
          .eq('user_id', session.user.id)
      ])

      // Update streak
      await supabase.rpc('update_streak', { p_user_id: session.user.id })

      setData({
        profile: profileRes.data,
        skills: skillsRes.data || [],
        balance: balanceRes.data?.[0] || { available_balance: 0 },
        user: session.user
      })
      setBadges(badgesRes.data || [])
      setLoading(false)
    }
    load()
  }, [router])

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const ext = file.name.split('.').pop()
    const path = `${session.user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars').upload(path, file, { upsert: true })

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id)
      setData((prev: any) => ({ ...prev, profile: { ...prev.profile, avatar_url: publicUrl } }))
    }
    setUploading(false)
  }

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
  const firstName = profile?.full_name?.split(' ')[0] || 'You'
  const level = profile?.level || 1
  const xp = profile?.xp || 0
  const nextLevelXP = LEVEL_XP[Math.min(level + 1, 7)]
  const currentLevelXP = LEVEL_XP[level]
  const xpProgress = nextLevelXP > currentLevelXP
    ? Math.round(((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100)
    : 100

  // All possible badges
  const ALL_BADGES = [
    { id: 'first_session', name: 'First Session', icon: '🎯' },
    { id: 'first_teach', name: 'First Teacher', icon: '🎓' },
    { id: 'streak_3', name: '3-Day Streak', icon: '🔥' },
    { id: 'streak_7', name: 'Week Warrior', icon: '⚡' },
    { id: 'streak_30', name: 'Monthly Master', icon: '💎' },
    { id: 'sessions_5', name: 'Regular', icon: '⭐' },
    { id: 'sessions_10', name: 'Dedicated', icon: '🌟' },
    { id: 'tc_10', name: 'Credit Earner', icon: '✦' },
    { id: 'multi_skill', name: 'Polymath', icon: '🧠' },
    { id: 'top_rated', name: 'Top Rated', icon: '⭐' },
    { id: 'profile_complete', name: 'Complete Profile', icon: '✅' },
    { id: 'skill_mirror', name: 'Self-Aware', icon: '🪞' },
    { id: 'countries_3', name: 'Global Citizen', icon: '🌍' },
  ]
  const earnedIds = new Set(badges.map((b: any) => b.badge_id))

  return (
    <div className="min-h-screen pb-24">

      {/* Hero */}
      <div className="px-5 pt-14 pb-6 text-center"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(240,168,48,0.12) 0%, transparent 60%)' }}>

        {/* Avatar */}
        <div className="relative inline-block mb-4">
          <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center font-display text-3xl text-white cursor-pointer"
            style={{ background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}
            onClick={() => fileRef.current?.click()}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" />
              : firstName[0]?.toUpperCase()
            }
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.2)' }}>
            {uploading ? '…' : '📷'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
        </div>

        <div className="font-display text-2xl font-light mb-1">{profile?.full_name || 'Your Name'}</div>
        <div className="text-xs font-mono text-muted">{user.email} · {profile?.location || 'Antwerp'}</div>

        {/* Level badge */}
        <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full"
          style={{ background: 'rgba(240,168,48,0.1)', border: '1px solid rgba(240,168,48,0.2)' }}>
          <span>{LEVEL_ICONS[level]}</span>
          <span className="text-xs font-mono" style={{ color: '#F0A830' }}>Level {level} · {LEVEL_NAMES[level]}</span>
        </div>

        {/* XP bar */}
        <div className="mt-4 mx-8">
          <div className="flex justify-between text-xs font-mono text-muted mb-1">
            <span>{xp} XP</span>
            <span>{level < 7 ? `${nextLevelXP} XP` : 'Max level'}</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: 'rgba(245,237,216,0.06)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${xpProgress}%`, background: 'linear-gradient(135deg, #F0A830, #D03878)' }} />
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-6 mt-5">
          {[
            { val: balance.available_balance, label: 'TC Balance', color: '#F0A830' },
            { val: profile?.sessions_taught || 0, label: 'Taught' },
            { val: profile?.streak_days || 0, label: 'Day streak', suffix: '🔥' },
            { val: profile?.rating_as_teacher ? Number(profile.rating_as_teacher).toFixed(1) : '—', label: 'Rating' },
          ].map(({ val, label, color, suffix }) => (
            <div key={label} className="text-center">
              <div className="font-display text-xl font-light" style={{ color: color || '#F5EDD8' }}>
                {val}{suffix}
              </div>
              <div className="text-[9px] font-mono text-muted uppercase tracking-widest">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit skills */}
      <div className="px-5 mb-4">
        <Link href="/onboarding">
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.06)' }}>
            <span className="text-lg">✦</span>
            <div className="flex-1">
              <div className="text-sm font-medium">Update your skills</div>
              <div className="text-xs text-muted">Change what you teach and learn</div>
            </div>
            <span className="text-xs text-muted">→</span>
          </div>
        </Link>
      </div>

      {/* Skill graph */}
      <div className="px-5 mb-4">
        <div className="rounded-2xl p-5" style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
          <h3 className="font-display text-lg mb-4">Skill graph</h3>
          {skills.length === 0 ? (
            <div>
              <p className="text-sm text-muted mb-3">No skills yet</p>
              <Link href="/onboarding">
                <span className="text-xs font-mono" style={{ color: '#F0A830' }}>Add skills →</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {skills.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="text-xs w-28 flex-shrink-0 flex items-center gap-1">
                    <span>{s.skills?.icon}</span>
                    <span className="truncate">{s.skills?.name}</span>
                  </div>
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(245,237,216,0.06)' }}>
                    <div className="h-full rounded-full"
                      style={{
                        width: `${(s.proficiency || 3) * 20}%`,
                        background: s.role === 'teacher' ? 'linear-gradient(135deg, #F0A830, #D03878)' : 'linear-gradient(135deg, #1ED8A0, #185FA5)'
                      }} />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: s.role === 'teacher' ? 'rgba(240,168,48,0.1)' : 'rgba(30,216,160,0.1)', color: s.role === 'teacher' ? '#F0A830' : '#1ED8A0' }}>
                    {s.role === 'teacher' ? 'teach' : 'learn'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="px-5 mb-4">
        <div className="rounded-2xl p-5" style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
          <h3 className="font-display text-lg mb-4">Badges <span className="text-sm text-muted font-sans">({earnedIds.size}/{ALL_BADGES.length})</span></h3>
          <div className="grid grid-cols-4 gap-3">
            {ALL_BADGES.map(b => {
              const earned = earnedIds.has(b.id)
              return (
                <div key={b.id} className="flex flex-col items-center gap-1 p-2 rounded-xl"
                  style={{ background: earned ? 'rgba(240,168,48,0.08)' : '#242018', opacity: earned ? 1 : 0.35 }}>
                  <span className="text-2xl">{b.icon}</span>
                  <span className="text-[9px] text-center leading-tight font-mono" style={{ color: earned ? '#F5EDD8' : '#9a8f82' }}>
                    {b.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tier + sign out */}
      <div className="px-5 mb-4">
        <div className="rounded-2xl p-4 flex items-center gap-3 mb-3"
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
        <button onClick={signOut}
          className="w-full py-3 rounded-xl text-xs font-mono text-muted"
          style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.06)' }}>
          Sign out
        </button>
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
