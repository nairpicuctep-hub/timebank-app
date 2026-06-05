'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

/* Light BottomNav — warm glass bar, active tab in a gradient pill.
   Routes kept identical to the existing app so no links break. */

const NAV = [
  { href: '/home',       key: 'home',    icon: '⌂', tkey: 'home'    },
  { href: '/session',    key: 'session', icon: '◎', tkey: 'explore' },
  { href: '/onboarding', key: 'mirror',  icon: '✦', tkey: 'mirror'  },
  { href: '/wallet',     key: 'wallet',  icon: '◈', tkey: 'credits' },
  { href: '/profile',    key: 'profile', icon: '○', tkey: 'profile' },
]

export default function BottomNav({ active }: { active: string }) {
  const t = useTranslations('nav')
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-3 pt-3 pb-6"
      style={{
        background: 'rgba(255,252,248,0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid var(--line-2)',
      }}>
      {NAV.map(({ href, key, icon, tkey }) => {
        const isActive = active === key
        return (
          <Link key={href} href={href}>
            <div className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all"
              style={isActive
                ? { background: 'var(--grad)', boxShadow: '0 8px 18px -6px rgba(234,88,12,0.6)' }
                : {}}>
              <span style={{ fontSize: 20, lineHeight: 1, color: isActive ? '#fff' : 'var(--faint)' }}>{icon}</span>
              <span className="font-semibold uppercase tracking-wider"
                style={{ fontSize: 9, color: isActive ? '#fff' : 'var(--faint)' }}>{t(tkey)}</span>
            </div>
          </Link>
        )
      })}
    </nav>
  )
}
