'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import Link from 'next/link'

/* -------------------------------------------------------------------------
   Profile (/profile) — light/Bricolage.
   Fixed vs old version:
     • badges from `user_badges` (was `badges_earned` — wrong table)
     • real level names: Time Seed → TimeBank Legend (was Seedling/Sprout…)
     • badge codes match the seeded `badges` table
   ------------------------------------------------------------------------- */

const LEVEL_ICONS = ['', '🌱', '📚', '⚡', '✨', '🧵', '🏛️', '🏆']
const LEVEL_XP    = [0, 0, 100, 250, 500, 1000, 2000, 5000]

// matches the seeded `badges` table (id = code); display names come from the badges catalog
const ALL_BADGES = [
  { id: 'skill_mirror',        icon: '🪞' },
  { id: 'first_session',       icon: '🎯' },
  { id: '7_day_streak',        icon: '🔥' },
  { id: '30_day_streak',       icon: '🌕' },
  { id: 'top_rated',           icon: '⭐' },
  { id: '10_sessions',         icon: '🔟' },
  { id: '25_sessions',         icon: '🏅' },
  { id: 'multilingual',        icon: '🌍' },
  { id: 'early_adopter',       icon: '🌱' },
  { id: 'group_host',          icon: '👥' },
  { id: 'perfect_month',       icon: '📅' },
  { id: 'community_connector', icon: '🤝' },
  { id: 'timebank_legend',     icon: '🏆' },
]

export default function ProfilePage() {
  const t = useTranslations('profile')
  const tc = useTranslations('common')
  const tl = useTranslations('levels')
  const tprof = useTranslations('proficiency')
  const tbadge = useTranslations('badges')
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
        supabase.from('user_skills').select('*, skills(name, category, icon, slug)').eq('user_id', session.user.id).order('role'),
        supabase.rpc('get_balance', { p_user_id: session.user.id }),
        supabase.from('user_badges').select('badge_id').eq('user_id', session.user.id),
      ])

      // touch streak on visit (safe, idempotent per day)
      supabase.rpc('update_streak', { p_user_id: session.user.id })

      setData({
        profile: profileRes.data,
        skills: skillsRes.data || [],
        balance: balanceRes.data?.[0] || { available_balance: 0 },
        user: session.user,
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
    if (!session) { setUploading(false); return }
    const ext = file.name.split('.').pop()
    const path = `${session.user.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id)
      setData((prev: any) => ({ ...prev, profile: { ...prev.profile, avatar_url: `${publicUrl}?t=${Date.now()}` } }))
    } else {
      alert(t('uploadFailed', { message: error.message }))
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
      <p className="text-sm font-mono text-muted">{tc('loading')}</p>
    </div>
  )

  const { profile, skills, balance } = data
  const levelName = (lvl: number) => tl(String(Math.min(Math.max(lvl, 1), 7)))
  const PROF = ['', tprof('beginner'), tprof('intermediate'), tprof('advanced'), tprof('expert')]
  const firstName = profile?.full_name?.split(' ')[0] || 'You'
  const level = profile?.level || 1
  const xp = profile?.xp || 0
  const streak = profile?.streak_days || 0
  const nextXP = LEVEL_XP[Math.min(level + 1, 7)]
  const curXP = LEVEL_XP[level]
  const xpPct = nextXP > curXP ? Math.min(100, Math.round(((xp - curXP) / (nextXP - curXP)) * 100)) : 100
  const earnedIds = new Set(badges.map((b: any) => b.badge_id))
  const teachSkills = skills.filter((s: any) => s.role === 'teacher')
  const learnSkills = skills.filter((s: any) => s.role === 'learner')
  const rating = Number(profile?.rating_as_teacher || 0)

  return (
    <div className="min-h-screen pb-28">

      {/* hero */}
      <div className="px-5 pt-14 pb-6 text-center"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(240,168,48,0.14) 0%, transparent 60%)' }}>
        <div className="relative inline-block mb-3">
          <div className="rounded-full overflow-hidden flex items-center justify-center font-display text-2xl text-white cursor-pointer"
            style={{ width: 80, height: 80, background: profile?.avatar_url ? 'transparent' : 'var(--grad)', boxShadow: '0 0 0 3px rgba(249,115,22,0.2)' }}
            onClick={() => fileRef.current?.click()}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" />
              : firstName[0]?.toUpperCase()}
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center text-xs text-white"
            style={{ background: 'var(--coral)', border: '2px solid var(--cream-1)' }}>
            {uploading ? '…' : '＋'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
        </div>

        <div className="font-display font-semibold text-2xl text-ink">{profile?.full_name || t('yourName')}</div>
        <div className="text-xs font-mono text-muted mt-0.5">{profile?.location || '—'}</div>

        <div className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-pill text-xs font-medium"
          style={{ background: 'var(--tc-bg)', border: '1px solid var(--tc-bd)', color: 'var(--tc-tx)' }}>
          {LEVEL_ICONS[level]} {t('level', { level })} · {levelName(level)}
        </div>

        {/* xp bar */}
        <div className="mt-4 mx-6">
          <div className="flex justify-between text-[10px] font-mono mb-1 text-muted">
            <span>{xp} XP</span>
            <span>{level < 7 ? `${nextXP} XP` : t('maxLevel')}</span>
          </div>
          <div className="h-2 rounded-pill" style={{ background: 'rgba(120,70,40,0.08)' }}>
            <div className="h-full rounded-pill" style={{ width: `${xpPct}%`, background: 'var(--grad)' }} />
          </div>
        </div>

        {/* stats */}
        <div className="flex justify-center gap-7 mt-5">
          {[
            { val: balance.available_balance, label: tc('tc'), grad: true },
            { val: profile?.sessions_taught || 0, label: t('taught') },
            { val: streak > 0 ? `${streak}🔥` : '0', label: t('streak') },
            { val: rating > 0 ? rating.toFixed(1) : '—', label: t('rating') },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`font-display font-bold text-xl ${s.grad ? 'grad-text' : 'text-ink'}`}>{s.val}</div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-faint">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 flex flex-col gap-3">

        {/* skills */}
        <div className="glass p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-semibold text-base text-ink">{t('skills')}</h3>
            <Link href="/onboarding"><span className="text-xs font-medium grad-text">{tc('edit')} →</span></Link>
          </div>
          {skills.length === 0 ? (
            <div>
              <p className="text-xs text-muted mb-2">{t('noSkills')}</p>
              <Link href="/onboarding"><span className="text-xs font-medium grad-text">{t('addSkills')} →</span></Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {teachSkills.length > 0 && (
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-widest mb-2 text-faint">{t('iTeach')}</div>
                  <div className="flex flex-col gap-2">
                    {teachSkills.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3">
                        <div className="text-xs w-28 flex-shrink-0 truncate text-text">{s.skills?.icon} {s.skills?.name || '—'}</div>
                        <div className="flex-1 h-1.5 rounded-pill" style={{ background: 'rgba(120,70,40,0.08)' }}>
                          <div className="h-full rounded-pill" style={{ width: `${(s.proficiency || 2) * 25}%`, background: 'var(--grad)' }} />
                        </div>
                        <div className="text-[9px] font-mono w-16 text-right text-muted">
                          {PROF[s.proficiency] || tprof('intShort')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {learnSkills.length > 0 && (
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-widest mb-2 text-faint">{t('iLearn')}</div>
                  <div className="flex flex-wrap gap-2">
                    {learnSkills.map((s: any) => (
                      <span key={s.id} className="text-xs px-2.5 py-1 rounded-pill"
                        style={{ background: 'var(--mint-bg)', border: '1px solid #bbf7d0', color: 'var(--mint)' }}>
                        {s.skills?.icon} {s.skills?.name || '—'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* badges */}
        <div className="glass p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-display font-semibold text-base text-ink">{t('badges')}</h3>
            <span className="text-[10px] font-mono text-faint">{earnedIds.size}/{ALL_BADGES.length}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {ALL_BADGES.map(b => {
              const earned = earnedIds.has(b.id)
              const name = tbadge(b.id)
              return (
                <div key={b.id} title={name} className="flex flex-col items-center gap-1 p-2 rounded-2xl"
                  style={{ background: earned ? 'var(--tc-bg)' : 'transparent', opacity: earned ? 1 : 0.35 }}>
                  <span className="text-xl" style={{ filter: earned ? 'none' : 'grayscale(1)' }}>{b.icon}</span>
                  <span className="text-[8px] text-center leading-tight font-mono" style={{ color: earned ? 'var(--text)' : 'var(--faint)' }}>
                    {name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* availability link */}
        <Link href="/availability" className="glass p-4 flex items-center gap-3">
          <span className="text-xl">📅</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-ink">{t('manageAvailability')}</div>
            <div className="text-xs text-muted">{t('manageAvailabilityHint')}</div>
          </div>
          <span className="text-muted">→</span>
        </Link>

        {/* language */}
        <div className="glass p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">🌐</span>
            <div className="text-sm font-semibold text-ink">{t('language')}</div>
          </div>
          <LanguageSwitcher compact />
        </div>

        {/* tier + sign out */}
        <div className="glass p-4 flex items-center gap-3">
          <span className="text-xs font-mono px-2.5 py-1 rounded-pill capitalize"
            style={{ background: 'var(--tc-bg)', border: '1px solid var(--tc-bd)', color: 'var(--tc-tx)' }}>
            {profile?.tier || 'free'}
          </span>
          <span className="text-xs text-muted flex-1">
            {profile?.tier === 'premium' ? t('premiumDesc') : t('freeDesc')}
          </span>
          {profile?.tier !== 'premium' && <span className="text-xs font-medium grad-text">{t('upgrade')} →</span>}
        </div>

        <button onClick={signOut} className="btn-ghost w-full py-3 text-xs">{t('signOut')}</button>
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
