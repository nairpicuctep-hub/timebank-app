'use client'

import Link from 'next/link'
import BottomNav from '@/components/layout/BottomNav'

const TRENDING_SKILLS = [
  'Python', 'Spanish B2', 'Piano', 'Figma', 'Excel', 'Yoga', 'Chess', 'Arabic', 'Public Speaking', 'Data Science'
]

const GRAD_COMBOS = [
  'linear-gradient(135deg, #F0A830, #E85030, #D03878)',
  'linear-gradient(135deg, #1ED8A0, #185FA5)',
  'linear-gradient(135deg, #D03878, #533AB7)',
]

interface Props {
  profile: any
  balance: { available_balance: number; escrowed_balance: number }
  matches: any[]
}

export default function HomeClient({ profile, balance, matches }: Props) {
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const tc = balance.available_balance || 0

  return (
    <div className="min-h-screen pb-24">

      {/* Hero */}
      <div className="relative px-5 pt-14 pb-6"
        style={{ background: 'radial-gradient(ellipse at 70% 0%, rgba(240,168,48,0.12) 0%, transparent 60%), radial-gradient(ellipse at 10% 80%, rgba(208,56,120,0.08) 0%, transparent 50%)' }}>

        {/* Top bar */}
        <div className="flex justify-between items-center mb-8 fade-up">
          <div>
            <div className="text-xs font-mono text-muted mb-1">Good morning,</div>
            <div className="font-display text-2xl font-light">{firstName} ✦</div>
          </div>
          <Link href="/profile">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-display text-lg"
              style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
              {firstName[0]?.toUpperCase()}
            </div>
          </Link>
        </div>

        {/* TC Orb */}
        <div className="flex justify-center my-6 fade-up-1">
          <div className="relative">
            {/* Outer spinning ring */}
            <div className="orb-outer w-36 h-36 rounded-full flex items-center justify-center"
              style={{ background: 'conic-gradient(from 180deg, #F0A830, #E85030, #D03878, #F0A830)' }}>
              {/* Inner counter-spin */}
              <div className="orb-inner w-[122px] h-[122px] rounded-full flex flex-col items-center justify-center"
                style={{ background: '#0c0906' }}>
                <span className="grad-text font-display text-4xl font-light leading-none">{tc}</span>
                <span className="text-[9px] font-mono text-muted uppercase tracking-widest mt-1">TimeCredits</span>
              </div>
            </div>
            {/* Glow */}
            <div className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, rgba(240,168,48,0.15) 0%, transparent 70%)' }} />
          </div>
        </div>

        {/* Tagline */}
        <div className="text-center mb-6 fade-up-2">
          <h2 className="font-display text-2xl font-light leading-snug mb-1">
            Your knowledge<br /><em>earns its worth</em>
          </h2>
          <p className="text-xs text-muted">1 hour taught = 1 TC = 1 hour learned</p>
        </div>

        {/* Escrowed badge */}
        {balance.escrowed_balance > 0 && (
          <div className="text-center fade-up-3">
            <span className="text-xs font-mono px-3 py-1 rounded-full"
              style={{ background: 'rgba(240,168,48,0.1)', border: '1px solid rgba(240,168,48,0.2)', color: '#F0A830' }}>
              {balance.escrowed_balance} TC pending verification
            </span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-5 mb-6 fade-up-2">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/onboarding">
            <div className="rounded-2xl p-5 cursor-pointer transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
              <div className="text-xl mb-2">✦</div>
              <div className="text-sm font-medium text-white leading-snug">Find your teachable skills</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>7 questions · 5 min</div>
            </div>
          </Link>
          <Link href="/session">
            <div className="rounded-2xl p-5 cursor-pointer transition-transform hover:-translate-y-0.5"
              style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
              <div className="text-xl mb-2 grad-text">◎</div>
              <div className="text-sm font-medium leading-snug">Book a session</div>
              <div className="text-xs text-muted mt-1">Browse teachers</div>
            </div>
          </Link>
          <Link href="/wallet">
            <div className="rounded-2xl p-5 cursor-pointer transition-transform hover:-translate-y-0.5"
              style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
              <div className="text-xl mb-2 grad-text">◈</div>
              <div className="text-sm font-medium leading-snug">{tc} TC ready</div>
              <div className="text-xs text-muted mt-1">Use or earn more</div>
            </div>
          </Link>
          <div className="rounded-2xl p-5 cursor-pointer transition-transform hover:-translate-y-0.5"
            style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
            <div className="text-xl mb-2">💬</div>
            <div className="text-sm font-medium leading-snug">WhatsApp flow</div>
            <div className="text-xs text-muted mt-1">Book without the app</div>
          </div>
        </div>
      </div>

      {/* Trending Skills */}
      <div className="px-5 mb-6">
        <div className="flex justify-between items-baseline mb-3">
          <h3 className="font-display text-lg">Trending skills</h3>
          <span className="text-xs font-mono" style={{ color: '#F0A830' }}>see all →</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TRENDING_SKILLS.map(skill => (
            <button key={skill}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-xs transition-all hover:border-amber"
              style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
              <span className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'linear-gradient(135deg, #F0A830, #D03878)' }} />
              {skill}
            </button>
          ))}
        </div>
      </div>

      {/* Flow Matches */}
      <div className="mb-6">
        <div className="px-5 flex justify-between items-baseline mb-3">
          <h3 className="font-display text-lg">Your flow matches</h3>
          <span className="text-xs font-mono" style={{ color: '#F0A830' }}>AI curated</span>
        </div>

        {matches.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide">
            {matches.map((match, i) => (
              <Link href={`/session/${match.id}`} key={match.id}>
                <div className="min-w-[200px] rounded-2xl overflow-hidden transition-transform hover:-translate-y-0.5"
                  style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
                  <div className="h-24 flex items-end p-3"
                    style={{ background: GRAD_COMBOS[i % 3] }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-display text-lg text-white"
                      style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)' }}>
                      {match.teacher?.full_name?.[0] || '?'}
                    </div>
                    <div className="ml-auto text-xs font-mono text-white px-2 py-1 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.2)' }}>
                      {match.flow_score}% flow ✦
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-medium">{match.teacher?.full_name || 'Teacher'}</div>
                    <div className="text-xs text-muted mt-0.5">{match.skills?.icon} {match.skills?.name}</div>
                    <div className="text-xs font-mono mt-2" style={{ color: '#F0A830' }}>1 TC / hour</div>
                    <div className="mt-2 h-1 rounded-full" style={{ background: 'rgba(245,237,216,0.06)' }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${match.flow_score}%`, background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mx-5 rounded-2xl p-6 text-center"
            style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
            <p className="text-sm text-muted mb-3">Complete the Skill Mirror to get personalised matches</p>
            <Link href="/onboarding">
              <span className="text-xs font-mono" style={{ color: '#F0A830' }}>Start now →</span>
            </Link>
          </div>
        )}
      </div>

      <BottomNav active="home" />
    </div>
  )
}
