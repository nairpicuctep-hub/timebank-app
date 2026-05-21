'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Link from 'next/link'

const LEVEL_NAMES = ['','Seedling','Sprout','Learner','Scholar','Mentor','Master','Legend']
const LEVEL_ICONS = ['','🌱','🌿','📚','🎓','🧑‍🏫','⭐','🏆']
const LEVEL_XP    = [0, 0, 100, 250, 500, 1000, 2000, 5000]

const ALL_BADGES = [
  { id: 'first_session',    name: 'First Session',    icon: '🎯' },
  { id: 'first_teach',      name: 'First Teacher',    icon: '🎓' },
  { id: 'streak_3',         name: '3-Day Streak',     icon: '🔥' },
  { id: 'streak_7',         name: 'Week Warrior',     icon: '⚡' },
  { id: 'streak_30',        name: 'Monthly Master',   icon: '💎' },
  { id: 'sessions_5',       name: 'Regular',          icon: '⭐' },
  { id: 'sessions_10',      name: 'Dedicated',        icon: '🌟' },
  { id: 'tc_10',            name: 'Credit Earner',    icon: '✦' },
  { id: 'multi_skill',      name: 'Polymath',         icon: '🧠' },
  { id: 'top_rated',        name: 'Top Rated',        icon: '⭐' },
  { id: 'profile_complete', name: 'Complete',         icon: '✅' },
  { id: 'skill_mirror',     name: 'Self-Aware',       icon: '🪞' },
  { id: 'countries_3',      name: 'Global',           icon: '🌍' },
]

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
        supabase.from('user_skills')
          .select('*, skills(name, category, icon, slug)')
          .eq('user_id', session.user.id)
          .order('role'),
        supabase.rpc('get_balance', { p_user_id: session.user.id }),
        supabase.from('badges_earned')
          .select('badge_id')
          .eq('user_id', session.user.id)
      ])

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
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
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
  const streak = profile?.streak_days || 0
  const nextXP = LEVEL_XP[Math.min(level + 1, 7)]
  const curXP = LEVEL_XP[level]
  const xpPct = nextXP > curXP ? Math.round(((xp - curXP) / (nextXP - curXP)) * 100) : 100
  const earnedIds = new Set(badges.map((b: any) => b.badge_id))

  const teachSkills = skills.filter((s: any) => s.role === 'teacher')
  const learnSkills = skills.filter((s: any) => s.role === 'learner')

  return (
    <div className="min-h-screen pb-24">

      {/* Hero */}
      <div className="px-5 pt-14 pb-6 text-center"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(240,168,48,0.1) 0%, transparent 55%)' }}>

        {/* Avatar */}
        <div className="relative inline-block mb-3">
          <div className="w-18 h-18 rounded-full overflow-hidden flex items-center justify-center font-display text-2xl text-white cursor-pointer"
            style={{ width: 72, height: 72, background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}
            onClick={() => fileRef.current?.click()}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" />
              : firstName[0]?.toUpperCase()}
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
            style={{ background: '#242018', border: '1px solid rgba(245,237,216,0.15)' }}>
            {uploading ? '…' : '＋'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
        </div>

        <div className="font-display text-xl font-light mb-0.5">{profile?.full_name || 'Your Name'}</div>
        <div className="text-xs font-mono" style={{ color: '#6a5f52' }}>{profile?.location || 'Antwerp'}</div>

        {/* Level */}
        <div className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-full text-xs font-mono"
          style={{ background: 'rgba(240,168,48,0.08)', border: '1px solid rgba(240,168,48,0.15)', color: '#F0A830' }}>
          {LEVEL_ICONS[level]} Level {level} · {LEVEL_NAMES[level]}
        </div>

        {/* XP bar */}
        <div className="mt-3 mx-6">
          <div className="flex justify-between text-[10px] font-mono mb-1" style={{ color: '#6a5f52' }}>
            <span>{xp} XP</span>
            <span>{level < 7 ? `${nextXP} XP` : 'Max'}</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(245,237,216,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${xpPct}%`, background: 'linear-gradient(90deg, #F0A830, #D03878)' }} />
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-6 mt-4">
          {[
            { val: balance.available_balance, label: 'TC Balance', color: '#F0A830' },
            { val: profile?.sessions_taught || 0, label: 'Taught' },
            { val: streak > 0 ? `${streak} 🔥` : '0', label: 'Streak' },
            { val: profile?.rating_as_teacher > 0 ? Number(profile.rating_as_teacher).toFixed(1) : '—', label: 'Rating' },
          ].map(({ val, label, color }) => (
            <div key={label} className="text-center">
              <div className="font-display text-lg font-light" style={{ color: color || '#F5EDD8' }}>{val}</div>
              <div className="text-[9px] font-mono uppercase tracking-widest" style={{ color: '#6a5f52' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="px-5 mb-3">
        <div className="rounded-2xl p-4" style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.06)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium">Skills</h3>
            <Link href="/onboarding">
              <span className="text-[10px] font-mono" style={{ color: '#F0A830' }}>Edit →</span>
            </Link>
          </div>

          {skills.length === 0 ? (
            <div>
              <p className="text-xs text-muted mb-2">No skills yet</p>
              <Link href="/onboarding">
                <span className="text-xs font-mono" style={{ color: '#F0A830' }}>Add skills →</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {teachSkills.length > 0 && (
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: '#6a5f52' }}>I teach</div>
                  <div className="space-y-2">
                    {teachSkills.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3">
                        <div className="text-xs w-24 flex-shrink-0 truncate" style={{ color: '#F5EDD8' }}>
                          {s.skills?.name || '—'}
                        </div>
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(245,237,216,0.06)' }}>
                          <div className="h-full rounded-full"
                            style={{ width: `${(s.proficiency || 3) * 20}%`, background: 'linear-gradient(90deg, #F0A830, #D03878)' }} />
                        </div>
                        <div className="text-[9px] font-mono w-16 text-right" style={{ color: '#9a8f82' }}>
                          {['','Beginner','Intermediate','Advanced','Expert'][s.proficiency] || 'Int.'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {learnSkills.length > 0 && (
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: '#6a5f52' }}>I learn</div>
                  <div className="flex flex-wrap gap-2">
                    {learnSkills.map((s: any) => (
                      <span key={s.id} className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(30,216,160,0.08)', border: '1px solid rgba(30,216,160,0.2)', color: '#1ED8A0' }}>
                        {s.skills?.name || '—'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="px-5 mb-3">
        <div className="rounded-2xl p-4" style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.06)' }}>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">Badges</h3>
            <span className="text-[10px] font-mono" style={{ color: '#6a5f52' }}>{earnedIds.size}/{ALL_BADGES.length}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {ALL_BADGES.map(b => {
              const earned = earnedIds.has(b.id)
              return (
                <div key={b.id} title={b.name}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl"
                  style={{ background: earned ? 'rgba(240,168,48,0.08)' : 'rgba(245,237,216,0.02)', opacity: earned ? 1 : 0.3 }}>
                  <span className="text-xl">{b.icon}</span>
                  <span className="text-[8px] text-center leading-tight font-mono" style={{ color: earned ? '#F5EDD8' : '#9a8f82' }}>
                    {b.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tier + sign out */}
      <div className="px-5 mb-3">
        <div className="rounded-2xl p-3.5 flex items-center gap-3 mb-2"
          style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.06)' }}>
          <span className="text-[10px] font-mono px-2 py-1 rounded-full capitalize"
            style={{ background: 'rgba(240,168,48,0.1)', border: '1px solid rgba(240,168,48,0.2)', color: '#F0A830' }}>
            {profile?.tier || 'free'}
          </span>
          <span className="text-xs text-muted flex-1">
            {profile?.tier === 'premium' ? '5 TC / month · Priority' : '2 TC / month · Basic'}
          </span>
          {profile?.tier !== 'premium' && (
            <span className="text-xs font-mono" style={{ color: '#F0A830' }}>Upgrade →</span>
          )}
        </div>
        <button onClick={signOut}
          className="w-full py-3 rounded-xl text-xs font-mono"
          style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.06)', color: '#6a5f52' }}>
          Sign out
        </button>
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
