'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import SidebarNav from './SidebarNav'
import { isShellRoute } from './navItems'

/* Desktop app shell. On shell routes at lg+, renders [SidebarNav | main] with
   main constrained to max-w-1280 / centered. Below lg (and on non-shell routes)
   it renders children verbatim — the mobile experience is completely unchanged.
   All shell styling is lg:-gated; the wrapper divs are layout-neutral on mobile. */
export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (!isShellRoute(pathname)) return <>{children}</>

  return (
    <div className="lg:flex lg:min-h-screen lg:items-start">
      <Suspense fallback={null}>
        <SidebarNav />
      </Suspense>
      <div className="w-full lg:flex-1 lg:min-w-0 lg:max-w-[1280px] lg:mx-auto lg:px-6">
        {children}
      </div>
    </div>
  )
}
