'use client'

import { useEffect, useState } from 'react'
import { BRAND_CREAM } from '@/components/LoadingScreen'

/* Initial-load splash. Visible on first paint (covers the hydration flash),
   then fades out as soon as the app has mounted — graceful, but no artificial
   blocking delay. Mounted once in the root layout. */
export default function AppSplash() {
  const [hide, setHide] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    // fade begins on the next frame after mount (app is interactive)
    const raf = requestAnimationFrame(() => setHide(true))
    const t = setTimeout(() => setGone(true), 600) // remove after the fade finishes
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [])

  if (gone) return null

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, background: BRAND_CREAM, zIndex: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: hide ? 0 : 1, transition: 'opacity 0.45s ease',
        pointerEvents: hide ? 'none' : 'auto',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/LOGO_Timebank_Academy.png"
        alt="TimeBank Academy"
        width={168}
        height={168}
        style={{ width: 168, height: 168, animation: 'tb-logo-pulse 1.6s ease-in-out infinite' }}
      />
    </div>
  )
}
