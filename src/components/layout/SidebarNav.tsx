'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { NAV_ITEMS, getActiveKey } from './navItems'
import { usePendingPings } from './usePendingPings'

/* Desktop sidebar nav (hidden lg:flex). Mirrors BottomNav exactly — same route
   list (navItems) and active detection — but laid out vertically with the
   gradient active pill, and a footer with the user's avatar / name / level.
   Mobile is untouched: this never renders below lg. */

export default function SidebarNav() {
  const t = useTranslations('nav')
  const tl = useTranslations('levels')
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeKey = getActiveKey(pathname, searchParams.get('tab'))
  const pendingPings = usePendingPings()

  const [profile, setProfile] = useState<{ full_name?: string; avatar_url?: string; level?: number } | null>(null)
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('profiles')
        .select('full_name, avatar_url, level').eq('id', session.user.id).single()
      if (!cancelled) setProfile(data)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const name = profile?.full_name || ''
  const initial = name.trim()[0]?.toUpperCase() || '?'
  const level = Math.min(Math.max(profile?.level || 1, 1), 7)

  return (
    <aside className="hidden lg:flex lg:flex-col lg:shrink-0 lg:sticky lg:top-0 lg:h-screen"
      style={{ width: 236, background: 'rgba(255,252,248,0.72)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRight: '1px solid var(--line-2)' }}>
      {/* brand */}
      <Link href="/home" className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LOGO_Timebank_Academy.png" alt="" width={36} height={36} style={{ width: 36, height: 36, borderRadius: 9 }} />
        <span className="font-display font-semibold text-[15px] text-ink leading-tight">TimeBank<br />Academy</span>
      </Link>

      {/* nav items */}
      <nav className="flex flex-col gap-1 px-3 flex-1">
        {NAV_ITEMS.map(({ href, key, icon, tkey }) => {
          const isActive = activeKey === key
          const showDot = key === 'messages' && pendingPings > 0
          return (
            <Link key={href} href={href}
              className="relative flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all"
              style={isActive
                ? { background: 'var(--grad)', boxShadow: '0 8px 18px -8px rgba(234,88,12,0.55)' }
                : {}}>
              <span style={{ fontSize: 18, lineHeight: 1, color: isActive ? '#fff' : 'var(--faint)' }}>{icon}</span>
              <span className="text-sm font-semibold"
                style={{ color: isActive ? '#fff' : 'var(--muted)' }}>{t(tkey)}</span>
              {showDot && (
                <span aria-label={`${pendingPings} pending`} className="ml-auto"
                  style={{ minWidth: 8, height: 8, borderRadius: 999, background: isActive ? '#fff' : 'var(--rose, #D03878)' }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* footer: avatar + name + level */}
      <Link href="/profile" className="flex items-center gap-3 px-4 py-4 m-3 rounded-2xl glass">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden flex-shrink-0"
          style={{ background: profile?.avatar_url ? 'transparent' : 'var(--grad)' }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
            : initial}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink truncate">{name || '—'}</div>
          <div className="text-[11px] grad-text font-medium truncate">{tl(String(level))}</div>
        </div>
      </Link>
    </aside>
  )
}
