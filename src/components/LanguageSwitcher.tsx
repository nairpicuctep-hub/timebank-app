'use client'

import { useTransition } from 'react'
import { useLocale } from 'next-intl'
import { setUserLocale } from '@/i18n/locale'
import { locales, localeNames, type Locale } from '@/i18n/config'

/* -------------------------------------------------------------------------
   LanguageSwitcher — small locale dropdown.
   Drop it anywhere (settings page, profile, footer, onboarding header).
   Changing locale sets a cookie via a server action, then refreshes so
   server components re-render with the new messages.
   ------------------------------------------------------------------------- */

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const active = useLocale() as Locale
  const [pending, startTransition] = useTransition()

  function change(next: Locale) {
    startTransition(async () => {
      await setUserLocale(next)
      // server components read the cookie on next request — refresh to apply
      window.location.reload()
    })
  }

  return (
    <div className="relative inline-flex">
      <select
        value={active}
        disabled={pending}
        onChange={e => change(e.target.value as Locale)}
        aria-label="Language"
        className="rounded-pill text-sm font-medium appearance-none cursor-pointer"
        style={{
          background: 'rgba(255,255,255,0.6)',
          border: '1.5px solid var(--line)',
          color: 'var(--text)',
          padding: compact ? '6px 30px 6px 14px' : '10px 34px 10px 16px',
          backdropFilter: 'blur(8px)',
        }}
      >
        {locales.map(l => (
          <option key={l} value={l}>{localeNames[l]}</option>
        ))}
      </select>
      <span
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
        style={{ fontSize: 11 }}
      >▾</span>
    </div>
  )
}
