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
  const hasSkills = (profile?.teach_skills?.length > 0) || (profile?.learn_skills?.length > 0)
  const nextXP = LEVEL_XP[Math.min(level + 1, 7)]
  const curXP = LEVEL_XP[level]
  const xpPct = nextXP > curXP ? Math.round(((xp - curXP) / (nextXP - curXP)) * 100) : 100

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="min-h-screen pb-24">

      {/* Header */}
      <div className="px-5 pt-14 pb-4"
        style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(240,168,48,0.08) 0%, transparent 60%)' }}>

        <div className="flex justify-between items-center mb-5">
          <div>
            <div className="text-xs font-mono mb-0.5" style={{ color: '#6a5f52' }}>{greeting}</div>
            <div className="font-display text-xl font-light">{firstName}</div>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono"
                style={{ background: 'rgba(240,168,48,0.1)', color: '#F0A830', border: '1px solid rgba(240,168,48,0.2)' }}>
                🔥 {streak}
              </div>
            )}
            <Link href="/profile">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-white overflow-hidden"
                style={{ background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #F0A830, #D03878)' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                  : firstName[0]?.toUpperCase()}
              </div>
            </Link>
          </div>
        </div>

        {/* TC + Level row */}
        <div className="flex items-center gap-4 mb-4">
          {/* TC Orb — compact */}
          <div className="relative flex-shrink-0">
            <div className="orb-outer w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'conic-gradient(from 180deg, #F0A830, #E85030, #D03878, #F0A830)' }}>
              <div className="orb-inner w-[52px] h-[52px] rounded-full flex flex-col items-center justify-center"
                style={{ background: '#0c0906' }}>
                <span className="grad-text font-display text-lg font-light leading-none">{tc}</span>
                <span className="text-[7px] font-mono uppercase tracking-widest mt-0.5" style={{ color: '#6a5f52' }}>TC</span>
              </div>
            </div>
          </div>

          {/* XP + level */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono" style={{ color: '#F0A830' }}>
                {LEVEL_ICONS[level]} Lv.{level} {LEVEL_NAMES[level]}
              </span>
              <span className="text-xs font-mono" style={{ color: '#6a5f52' }}>{xp} XP</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'rgba(245,237,216,0.06)' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${xpPct}%`, background: 'linear-gradient(90deg, #F0A830, #D03878)' }} />
            </div>
            <div className="text-[10px] font-mono mt-1" style={{ color: '#6a5f52' }}>
              {level < 7 ? `${nextXP - xp} XP to Level ${level + 1}` : '🏆 Max level'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions — compact grid */}
      <div className="px-5 mb-4">
        <div className="grid grid-cols-2 gap-2">

          {/* Skills card — gradient only if no skills set */}
          <Link href="/onboarding">
            <div className="rounded-xl p-3.5 transition-all hover:opacity-90"
              style={{
                background: hasSkills ? '#1c1917' : 'linear-gradient(135deg, #F0A830, #E85030, #D03878)',
                border: hasSkills ? '1px solid rgba(245,237,216,0.08)' : 'none'
              }}>
              <div className="text-base mb-1.5" style={{ color: hasSkills ? '#F0A830' : '#fff' }}>✦</div>
              <div className="text-xs font-medium leading-snug" style={{ color: hasSkills ? '#F5EDD8' : '#fff' }}>
                {hasSkills ? 'Edit skills' : 'Set your skills'}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: hasSkills ? '#9a8f82' : 'rgba(255,255,255,0.7)' }}>
                {hasSkills ? 'Teach & learn' : '60 seconds'}
              </div>
            </div>
          </Link>

          <Link href="/session">
            <div className="rounded-xl p-3.5 transition-all hover:opacity-90"
              style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
              <div className="text-base mb-1.5 grad-text">◎</div>
              <div className="text-xs font-medium">Find a teacher</div>
              <div className="text-[10px] mt-0.5 text-muted">Browse skills</div>
            </div>
          </Link>

          <Link href="/wallet">
            <div className="rounded-xl p-3.5 transition-all hover:opacity-90"
              style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
              <div className="text-base mb-1.5 grad-text">◈</div>
              <div className="text-xs font-medium">{tc} TimeCredits</div>
              <div className="text-[10px] mt-0.5 text-muted">Wallet</div>
            </div>
          </Link>

          <Link href="/availability">
            <div className="rounded-xl p-3.5 transition-all hover:opacity-90"
              style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
              <div className="text-base mb-1.5">📅</div>
              <div className="text-xs font-medium">Availability</div>
              <div className="text-[10px] mt-0.5 text-muted">Set schedule</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Daily challenge */}
      <div className="px-5 mb-4">
        <div className="rounded-xl p-3.5 flex items-center gap-3"
          style={{ background: 'rgba(30,216,160,0.04)', border: '1px solid rgba(30,216,160,0.15)' }}>
          <span className="text-lg flex-shrink-0">🎯</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium" style={{ color: '#1ED8A0' }}>Daily challenge</div>
            <div className="text-[10px] text-muted">Complete a session · earn +25 XP bonus</div>
          </div>
          <div className="text-[10px] font-mono px-2 py-1 rounded-full flex-shrink-0"
            style={{ background: 'rgba(30,216,160,0.1)', color: '#1ED8A0' }}>+25 XP</div>
        </div>
      </div>

      {/* Flow matches */}
      {matches.length > 0 && (
        <div className="mb-4">
          <div className="px-5 flex justify-between items-baseline mb-2.5">
            <h3 className="text-sm font-medium">Your matches</h3>
            <span className="text-[10px] font-mono" style={{ color: '#F0A830' }}>AI curated</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto px-5 pb-1" style={{ scrollbarWidth: 'none' }}>
            {matches.map((match, i) => {
              const grads = [
                'linear-gradient(135deg, #F0A830, #E85030)',
                'linear-gradient(135deg, #1ED8A0, #185FA5)',
                'linear-gradient(135deg, #D03878, #533AB7)'
              ]
              return (
                <Link href={`/teacher/${match.teacher_id || match.id}`} key={match.id}>
                  <div className="min-w-[160px] rounded-xl overflow-hidden flex-shrink-0"
                    style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.06)' }}>
                    <div className="h-14 flex items-end p-2.5" style={{ background: grads[i % 3] }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white font-medium"
                        style={{ background: 'rgba(255,255,255,0.2)' }}>
                        {match.teacher?.full_name?.[0] || '?'}
                      </div>
                      <div className="ml-auto text-[9px] font-mono text-white px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.2)' }}>
                        {match.flow_score}%
                      </div>
                    </div>
                    <div className="p-2.5">
                      <div className="text-[11px] font-medium truncate">{match.teacher?.full_name}</div>
                      <div className="text-[10px] text-muted">{match.skills?.name}</div>
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
