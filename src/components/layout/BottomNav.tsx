'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { NAV_ITEMS } from './navItems'
import { usePendingPings } from './usePendingPings'

/* Light BottomNav — warm glass bar, active tab in a gradient pill.
   Mobile only: hidden at lg+ where SidebarNav takes over. Route list +
   active state are unchanged; routes come from the shared navItems module. */

export default function BottomNav({ active }: { active: string }) {
  const t = useTranslations('nav')
  const pendingPings = usePendingPings()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-3 pt-3 pb-6"
      style={{
        background: 'rgba(255,252,248,0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid var(--line-2)',
      }}>
      {NAV_ITEMS.map(({ href, key, icon, tkey }) => {
        const isActive = active === key
        // pings live under Messages — surface the unread dot there
        const showDot = key === 'messages' && pendingPings > 0
        return (
          <Link key={href} href={href}>
            <div className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all"
              style={isActive
                ? { background: 'var(--grad)', boxShadow: '0 8px 18px -6px rgba(234,88,12,0.6)' }
                : {}}>
              {showDot && (
                <span
                  aria-label={`${pendingPings} pending`}
                  className="absolute"
                  style={{
                    top: 2, right: 6, minWidth: 8, height: 8, borderRadius: 999,
                    background: 'var(--rose, #D03878)',
                    boxShadow: '0 0 0 2px rgba(255,252,248,0.95)',
                  }}
                />
              )}
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
