'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

/* Light BottomNav — warm glass bar, active tab in a gradient pill.
   Routes kept identical to the existing app so no links break.
   Shows a red unread dot on Explore when the user has pending ping requests. */

const NAV = [
  { href: '/home',       key: 'home',    icon: '⌂', tkey: 'home'    },
  { href: '/session',    key: 'session', icon: '◎', tkey: 'explore' },
  { href: '/onboarding', key: 'mirror',  icon: '✦', tkey: 'mirror'  },
  { href: '/wallet',     key: 'wallet',  icon: '◈', tkey: 'credits' },
  { href: '/profile',    key: 'profile', icon: '○', tkey: 'profile' },
]

export default function BottomNav({ active }: { active: string }) {
  const t = useTranslations('nav')
  const [pendingPings, setPendingPings] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    async function loadCount() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { count } = await supabase
        .from('session_pings')
        .select('id', { count: 'exact', head: true })
        .eq('to_user', session.user.id)
        .eq('status', 'pending')
      if (!cancelled) setPendingPings(count || 0)
    }
    loadCount()
    return () => { cancelled = true }
  }, [])

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
        // pings live under Explore — surface the unread dot there
        const showDot = key === 'session' && pendingPings > 0
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
