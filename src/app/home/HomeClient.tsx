'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import BottomNav from '@/components/layout/BottomNav'
import MastersStrip from '@/components/MastersStrip'
import Coachmark from '@/components/Coachmark'

/* -------------------------------------------------------------------------
   HomeClient — light cream + Bricolage. Two states baked in:
     • populated: TC hero, XP strip, Masters strip, next session, browse, feed
     • cold-start: warm "you're early" guidance when no session + no teachers
   ------------------------------------------------------------------------- */

const LEVEL_XP    = [0, 0, 100, 250, 500, 1000, 2000, 5000]
// filter values must match DB skill.category strings; labels are translated for display.
const CATS: { val: string; key: string }[] = [
  { val: 'All',       key: 'all' },
  { val: 'Tech',      key: 'tech' },
  { val: 'Creative',  key: 'creative' },
  { val: 'Language',  key: 'language' },
  { val: 'Business',  key: 'business' },
  { val: 'Finance',   key: 'finance' },
  { val: 'Music',     key: 'music' },
  { val: 'Lifestyle', key: 'lifestyle' },
]
const GRADS = [
  'linear-gradient(135deg,#F0A830,#E85030)',
  'linear-gradient(135deg,#E85030,#D03878)',
  'linear-gradient(135deg,#D03878,#f472b6)',
]

export default function HomeClient({ profile, balance, nextSession, teachers, uid }: any) {
  const t = useTranslations('home')
  const tc = useTranslations('common')
  const tl = useTranslations('levels')
  const tcat = useTranslations('categories')
  const [cat, setCat] = useState('All')

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const avail = Number(balance?.available_balance || 0)
  const escrow = Number(balance?.escrowed_balance || 0)
  const earned = Number(profile?.tc_earned_lifetime || 0)
  const spent = Number(profile?.tc_spent_lifetime || 0)
  const level = profile?.level || 1
  const xp = profile?.xp || 0
  const streak = profile?.streak_days || 0
  const rating = Number(profile?.rating_as_teacher || 0)
  const taught = profile?.sessions_taught || 0

  const curXP = LEVEL_XP[level] || 0
  const nextXP = LEVEL_XP[Math.min(level + 1, 7)] || curXP
  const xpPct = nextXP > curXP ? Math.min(100, Math.round(((xp - curXP) / (nextXP - curXP)) * 100)) : 100

  const levelName = (lvl: number) => tl(String(Math.min(Math.max(lvl, 1), 7)))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening')

  const filteredTeachers = (teachers || []).filter((t: any) =>
    cat === 'All' || t.skills.some((s: any) => s.category === cat))

  const isColdStart = !nextSession && (teachers || []).length === 0

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen pb-28">

      {/* HEADER */}
      <div className="sticky top-0 z-20 px-5 pt-12 pb-4"
        style={{ background: 'rgba(255,250,245,0.72)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--line-2)' }}>
        <div className="flex justify-between items-start">
          <div>
            <div className="font-mono text-xs text-muted mb-0.5">{greeting}</div>
            <h1 className="font-display font-semibold text-[22px] leading-none text-ink">{firstName} 👋</h1>
          </div>
          <div className="flex items-center gap-3">
            {streak > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-pill font-mono text-xs"
                style={{ background: 'var(--tc-bg)', color: 'var(--tc-tx)', border: '1px solid var(--tc-bd)' }}>
                🔥 {streak}
              </div>
            )}
            <Link href="/profile" id="tour-profile">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden"
                style={{ background: profile?.avatar_url ? 'transparent' : 'var(--grad)', boxShadow: '0 0 0 2px rgba(249,115,22,0.2)' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                  : firstName[0]?.toUpperCase()}
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 flex flex-col gap-4 lg:grid lg:grid-cols-[1.7fr_1fr] lg:gap-5 lg:items-start">

        {/* PRIMARY COLUMN — desktop col 1; the single, unchanged column on mobile */}
        <div className="flex flex-col gap-4 lg:gap-5 min-w-0">

        {/* TC BALANCE HERO */}
        <div id="tour-balance" className="grad-card rise p-5 lg:rounded-[20px]">
          <div className="blob blob-1" /><div className="blob blob-2" />
          <div className="flex items-center gap-2 text-[13px] font-medium relative" style={{ opacity: 0.95 }}>
            ◎ {t('timeCredits')}
          </div>
          <div className="flex justify-between items-end mt-3 relative">
            <div>
              <div className="font-display font-bold tc-pop" style={{ fontSize: 52, lineHeight: 0.9, letterSpacing: '-1.5px' }}>
                {avail % 1 === 0 ? avail : avail.toFixed(1)}
                <span className="font-mono" style={{ fontSize: 20, marginLeft: 4, fontWeight: 500 }}>TC</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{t('availableToSpend')}</div>
            </div>
            <div className="text-right">
              <div className="font-display font-bold" style={{ fontSize: 22 }}>{earned % 1 === 0 ? earned : earned.toFixed(1)}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{t('earned')}</div>
            </div>
          </div>
          {escrow > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-pill relative"
              style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 500 }}>
              ⏳ {t('inEscrow', { amount: escrow % 1 === 0 ? escrow : escrow.toFixed(1) })}
            </div>
          )}
          <div className="flex justify-between items-center mt-3 relative" style={{ fontSize: 12 }}>
            <span style={{ opacity: 0.85 }}>{t('spent', { amount: spent % 1 === 0 ? spent : spent.toFixed(1) })}</span>
            <span className="px-3 py-1 rounded-pill" style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.35)', fontWeight: 500 }}>
              {levelName(level)}
            </span>
          </div>
        </div>

        {/* XP STRIP */}
        <div id="tour-level" className="glass rise-1 p-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-muted font-medium">{t('currentLevel')}</div>
              <div className="font-display font-semibold text-[19px] grad-text">{levelName(level)}</div>
            </div>
            <div className="flex gap-2.5">
              {[
                { ic: '🔥', v: streak, bg: '#fff7ed', c: '#f97316' },
                { ic: '📈', v: taught, bg: '#f0fdf4', c: '#16a34a' },
                { ic: '⭐', v: rating > 0 ? rating.toFixed(1) : '—', bg: '#fffbeb', c: '#d97706' },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center justify-center rounded-2xl gap-0.5"
                  style={{ width: 50, height: 50, background: s.bg }}>
                  <span style={{ fontSize: 16 }}>{s.ic}</span>
                  <b className="font-mono" style={{ fontSize: 12, color: s.c }}>{s.v}</b>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted">{t('xpProgress')}</span>
              <b className="font-mono text-ink">{xp} / {level < 7 ? nextXP : t('xpMax')} XP</b>
            </div>
            <div className="h-2 rounded-pill" style={{ background: 'rgba(120,70,40,0.08)' }}>
              <div className="h-full rounded-pill" style={{ width: `${xpPct}%`, background: 'var(--grad)' }} />
            </div>
          </div>
        </div>

        {/* VIP MASTERS — mobile position (on desktop it moves to the aside) */}
        <MastersStrip className="lg:hidden" learnSkills={profile?.learn_skills || []} />

        {/* COLD START vs POPULATED */}
        {isColdStart ? (
          <div className="glass rise-2 p-5 text-center">
            <div className="text-3xl mb-2">🌱</div>
            <h3 className="font-display font-semibold text-lg text-ink mb-1">{t('coldStartTitle')}</h3>
            <p className="text-sm text-muted mb-4">
              {t.rich('coldStartBody', { amount: avail, b: (c: ReactNode) => <b className="text-ink">{c}</b> })}
            </p>
            <div className="flex flex-col gap-2 text-left">
              <Link href="/availability" className="glass p-3.5 flex items-center gap-3" style={{ borderRadius: 14 }}>
                <span className="text-xl">📅</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-ink">{t('setAvailability')}</div>
                  <div className="text-xs text-muted">{t('setAvailabilityHint')}</div>
                </div>
                <span className="text-muted">→</span>
              </Link>
              <Link href="/session" className="glass p-3.5 flex items-center gap-3" style={{ borderRadius: 14 }}>
                <span className="text-xl">🔍</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-ink">{t('exploreSkills')}</div>
                  <div className="text-xs text-muted">{t('exploreSkillsHint')}</div>
                </div>
                <span className="text-muted">→</span>
              </Link>
              <Link href="/onboarding" className="glass p-3.5 flex items-center gap-3" style={{ borderRadius: 14 }}>
                <span className="text-xl">✦</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-ink">{t('addSkills')}</div>
                  <div className="text-xs text-muted">{t('addSkillsHint')}</div>
                </div>
                <span className="text-muted">→</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* NEXT SESSION */}
            {nextSession && (
              <Link href={`/session/${nextSession.id}`}>
                <div className="rise-3 p-5 relative" style={{ borderRadius: 'var(--r-card)', overflow: 'hidden',
                  background: 'linear-gradient(135deg,#F0A830,#D03878 65%,#f472b6)', color: '#fff',
                  boxShadow: '0 18px 40px -20px rgba(208,56,120,0.55)' }}>
                  <span className="inline-block px-3 py-1 rounded-pill text-[11px] font-semibold relative"
                    style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.35)' }}>
                    {t('upNext')}
                  </span>
                  <h3 className="font-display font-semibold text-[21px] mt-2.5 mb-2.5 relative">
                    {nextSession.skill?.icon} {nextSession.skill?.name || tc('session')}
                  </h3>
                  <div className="flex items-center gap-2 mb-3 relative">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)' }}>
                      {(nextSession.teacher_id === uid ? nextSession.learner : nextSession.teacher)?.full_name?.[0] || '?'}
                    </div>
                    <span className="text-[13px] font-medium">
                      {nextSession.teacher_id === uid
                        ? t('teaching', { name: nextSession.learner?.full_name || tc('learner') })
                        : t('withTeacher', { name: nextSession.teacher?.full_name || tc('teacher') })}
                    </span>
                  </div>
                  <div className="flex gap-2 relative">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium"
                      style={{ background: 'rgba(255,255,255,0.15)' }}>📅 {fmtDate(nextSession.scheduled_at)}</span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium"
                      style={{ background: 'rgba(255,255,255,0.15)' }}>🕐 {nextSession.duration_min} min</span>
                  </div>
                </div>
              </Link>
            )}

            {/* BROWSE PILLS */}
            <div className="rise-4">
              <h3 className="font-display font-semibold text-[17px] text-ink mb-2.5">{t('browseSkills')}</h3>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {CATS.map(c => (
                  <button key={c.val} onClick={() => setCat(c.val)} className="pill flex-shrink-0"
                    style={c.val === cat ? { background: 'var(--grad)', color: '#fff', border: '1px solid transparent' } : {}}>
                    {tcat(c.key)}
                  </button>
                ))}
              </div>
            </div>

            {/* TEACHER FEED */}
            <div className="rise-5 flex flex-col gap-3">
              {filteredTeachers.length === 0 ? (
                <div className="glass p-6 text-center">
                  <p className="text-sm text-muted">{t('noTeachers', { category: tcat(CATS.find(c => c.val === cat)?.key || 'all') })}</p>
                </div>
              ) : filteredTeachers.map((teacher: any, i: number) => (
                <Link href={`/teacher/${teacher.profile.id}`} key={teacher.profile.id}>
                  <div className="glass overflow-hidden">
                    <div className="h-14 flex items-end px-4 pb-2.5" style={{ background: GRADS[i % 3] }}>
                      <div className="flex items-center gap-2.5 w-full">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)' }}>
                          {teacher.profile.avatar_url
                            ? <img src={teacher.profile.avatar_url} className="w-full h-full object-cover" alt="" />
                            : teacher.profile.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="text-white">
                          <div className="text-sm font-semibold leading-tight flex items-center gap-1.5">
                            {teacher.profile.full_name}
                            {teacher.profile.is_vip && <span title={t('verifiedMaster')} style={{ fontSize: 11 }}>✦</span>}
                          </div>
                          <div className="text-[11px]" style={{ opacity: 0.85 }}>
                            ★ {Number(teacher.profile.rating_as_teacher || 0).toFixed(1)} · {t('sessions', { count: teacher.profile.sessions_taught || 0 })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-3.5">
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {teacher.skills.slice(0, 4).map((s: any, j: number) => (
                          <span key={j} className="text-xs px-2.5 py-1 rounded-pill"
                            style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--text)' }}>
                            {s.icon} {s.name}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="badge-tc">◈ {tc('perHour')}</span>
                        <span className="text-xs text-muted">{t('viewProfile')} →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
        </div>{/* /PRIMARY COLUMN */}

        {/* ASIDE — desktop only: "Masters you'll want to meet" as a vertical list */}
        <aside className="hidden lg:flex lg:flex-col lg:gap-5 lg:sticky lg:top-4">
          <MastersStrip vertical learnSkills={profile?.learn_skills || []} />
        </aside>
      </div>

      <Coachmark steps={[
        { target: 'tour-balance', title: 'Your Time Credits', body: 'Earn 1 TC by teaching an hour, spend 1 to learn. This is your balance.' },
        { target: 'tour-level',   title: 'Level up',          body: 'Teach, learn, keep streaks — climb from Time Seed to Legend.' },
        { target: 'tour-profile', title: 'Your profile',      body: 'Skills, badges and settings live here. Finish your profile to get matched.' },
      ]} />
      <BottomNav active="home" />
    </div>
  )
}
