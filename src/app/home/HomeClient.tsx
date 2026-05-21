'use client'

import Link from 'next/link'
import BottomNav from '@/components/layout/BottomNav'

const LEVEL_NAMES = ['','Seedling','Sprout','Learner','Scholar','Mentor','Master','Legend']
const LEVEL_ICONS = ['','🌱','🌿','📚','🎓','🧑‍🏫','⭐','🏆']
const LEVEL_XP    = [0, 0, 100, 250, 500, 1000, 2000, 5000]

interface Props {
  profile: any
  balance: { available_balance: number; escrowed_balance: number }
  matches: any[]
}

export default function HomeClient({ profile, balance, matches }: Props) {
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const tc = balance.available_balance || 0
  const level = profile?.level || 1
  const xp = profile?.xp || 0
  const streak = profile?.streak_days || 0
  const nextXP = LEVEL_XP[Math.min(level + 1, 7)]
  const curXP = LEVEL_XP[level]
  const xpPct = nextXP > curXP ? Math.round(((xp - curXP) / (nextXP - curXP)) * 100) : 100

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="min-h-screen pb-24">

      {/* Hero */}
      <div className="relative px-5 pt-14 pb-5"
        style={{ background: 'radial-gradient(ellipse at 70% 0%, rgba(240,168,48,0.1) 0%, transparent 60%)' }}>

        {/* Top bar */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="text-xs font-mono text-muted mb-0.5">{greeting},</div>
            <div className="font-display text-2xl font-light">{firstName} ✦</div>
          </div>
          <div className="flex items-center gap-3">
            {/* Streak */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono"
              style={{ background: streak > 0 ? 'rgba(240,168,48,0.12)' : 'rgba(245,237,216,0.05)', color: streak > 0 ? '#F0A830' : '#9a8f82', border: `1px solid ${streak > 0 ? 'rgba(240,168,48,0.25)' : 'rgba(245,237,216,0.06)'}` }}>
              🔥 {streak}
            </div>
            <Link href="/profile">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-display text-base text-white overflow-hidden"
                style={{ background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #F0A830, #D03878)' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                  : firstName[0]?.toUpperCase()
                }
              </div>
            </Link>
          </div>
        </div>

        {/* TC Orb */}
        <div className="flex justify-center my-4">
          <div className="relative">
            <div className="orb-outer w-32 h-32 rounded-full flex items-center justify-center"
              style={{ background: 'conic-gradient(from 180deg, #F0A830, #E85030, #D03878, #F0A830)' }}>
              <div className="orb-inner w-[108px] h-[108px] rounded-full flex flex-col items-center justify-center"
                style={{ background: '#0c0906' }}>
                <span className="grad-text font-display text-4xl font-light leading-none">{tc}</span>
                <span className="text-[9px] font-mono text-muted uppercase tracking-widest mt-1">TimeCredits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Level + XP */}
        <div className="text-center mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(240,168,48,0.08)', border: '1px solid rgba(240,168,48,0.15)', color: '#F0A830' }}>
            {LEVEL_ICONS[level]} Level {level} · {LEVEL_NAMES[level]} · {xp} XP
          </span>
        </div>

        {/* XP progress */}
        <div className="mx-8 mb-2">
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(245,237,216,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${xpPct}%`, background: 'linear-gradient(135deg, #F0A830, #D03878)' }} />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-muted mt-1">
            <span>{xp} XP</span>
            <span>{level < 7 ? `${nextXP} XP to Level ${level + 1}` : 'Max level 🏆'}</span>
          </div>
        </div>

        <div className="text-center mt-3">
          <p className="text-xs text-muted">1 hour taught = 1 TC = 1 hour learned</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-5 mb-5">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/onboarding">
            <div className="rounded-2xl p-4 cursor-pointer transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
              <div className="text-xl mb-2">✦</div>
              <div className="text-sm font-medium text-white leading-snug">
                {profile?.teach_skills?.length > 0 ? 'Update skills' : 'Set your skills'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {profile?.teach_skills?.length > 0 ? 'Manage what you teach & learn' : '2 steps · 60 seconds'}
              </div>
            </div>
          </Link>
          <Link href="/session">
            <div className="rounded-2xl p-4 cursor-pointer transition-transform hover:-translate-y-0.5"
              style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
              <div className="text-xl mb-2 grad-text">◎</div>
              <div className="text-sm font-medium leading-snug">Find a teacher</div>
              <div className="text-xs text-muted mt-0.5">Browse all skills</div>
            </div>
          </Link>
          <Link href="/wallet">
            <div className="rounded-2xl p-4 cursor-pointer transition-transform hover:-translate-y-0.5"
              style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
              <div className="text-xl mb-2 grad-text">◈</div>
              <div className="text-sm font-medium leading-snug">{tc} TC</div>
              <div className="text-xs text-muted mt-0.5">View wallet</div>
            </div>
          </Link>
          <Link href="/availability">
            <div className="rounded-2xl p-4 cursor-pointer transition-transform hover:-translate-y-0.5"
              style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
              <div className="text-xl mb-2">📅</div>
              <div className="text-sm font-medium leading-snug">My schedule</div>
              <div className="text-xs text-muted mt-0.5">Set availability</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Daily challenge */}
      <div className="px-5 mb-5">
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(30,216,160,0.05)', border: '1px solid rgba(30,216,160,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎯</div>
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: '#1ED8A0' }}>Daily challenge</div>
              <div className="text-xs text-muted">Complete a session today and earn +25 XP bonus</div>
            </div>
            <div className="text-xs font-mono px-2 py-1 rounded-full"
              style={{ background: 'rgba(30,216,160,0.1)', color: '#1ED8A0' }}>+25 XP</div>
          </div>
        </div>
      </div>

      {/* Flow matches */}
      {matches.length > 0 && (
        <div className="mb-5">
          <div className="px-5 flex justify-between items-baseline mb-3">
            <h3 className="font-display text-lg">Your matches</h3>
            <span className="text-xs font-mono" style={{ color: '#F0A830' }}>AI curated</span>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-2" style={{ scrollbarWidth: 'none' }}>
            {matches.map((match, i) => {
              const grads = ['linear-gradient(135deg, #F0A830, #E85030, #D03878)', 'linear-gradient(135deg, #1ED8A0, #185FA5)', 'linear-gradient(135deg, #D03878, #533AB7)']
              return (
                <Link href={`/teacher/${match.teacher_id || match.id}`} key={match.id}>
                  <div className="min-w-[180px] rounded-2xl overflow-hidden"
                    style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
                    <div className="h-20 flex items-end p-3" style={{ background: grads[i % 3] }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-display text-base text-white"
                        style={{ background: 'rgba(255,255,255,0.2)' }}>
                        {match.teacher?.full_name?.[0] || '?'}
                      </div>
                      <div className="ml-auto text-xs font-mono text-white px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.2)' }}>
                        {match.flow_score}% ✦
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="text-xs font-medium">{match.teacher?.full_name}</div>
                      <div className="text-xs text-muted">{match.skills?.icon} {match.skills?.name}</div>
                      <div className="h-1 rounded-full mt-2" style={{ background: 'rgba(245,237,216,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${match.flow_score}%`, background: 'linear-gradient(135deg, #F0A830, #D03878)' }} />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <BottomNav active="home" />
    </div>
  )
}
