'use client'

import Link from 'next/link'

const NAV = [
  { href: '/home',    icon: '⌂',  label: 'Home'    },
  { href: '/onboarding', icon: '✦', label: 'Mirror' },
  { href: '/session', icon: '◎',  label: 'Book'    },
  { href: '/profile', icon: '◈',  label: 'Profile' },
  { href: '/wallet',  icon: '⬡',  label: 'Credits' },
]

export default function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-2 pb-6 pt-3"
      style={{ background: 'rgba(12,9,6,0.95)', borderTop: '1px solid rgba(245,237,216,0.06)', backdropFilter: 'blur(12px)' }}>
      {NAV.map(({ href, icon, label }) => {
        const isActive = active === label.toLowerCase() || href.includes(active)
        return (
          <Link key={href} href={href}>
            <div className="flex flex-col items-center gap-1 px-4 py-1">
              <span className="text-lg" style={{ color: isActive ? '#F0A830' : '#9a8f82' }}>{icon}</span>
              <span className="text-[9px] font-mono uppercase tracking-wider"
                style={{ color: isActive ? '#F0A830' : '#9a8f82' }}>{label}</span>
            </div>
          </Link>
        )
      })}
    </nav>
  )
}
