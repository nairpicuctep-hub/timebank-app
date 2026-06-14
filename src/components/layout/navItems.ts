/* Single source of truth for the primary nav — shared by BottomNav (mobile)
   and SidebarNav (desktop) so the route list + active detection never drift.
   Pure data/logic, no React, so it can be imported anywhere. */

export type NavItem = { href: string; key: string; icon: string; tkey: string }

export const NAV_ITEMS: NavItem[] = [
  { href: '/home',              key: 'home',     icon: '⌂', tkey: 'home'     },
  { href: '/session',           key: 'session',  icon: '◎', tkey: 'explore'  },
  { href: '/session?tab=pings', key: 'messages', icon: '✉', tkey: 'messages' },
  { href: '/wallet',            key: 'wallet',   icon: '◈', tkey: 'credits'  },
  { href: '/profile',           key: 'profile',  icon: '○', tkey: 'profile'  },
]

/* Derive the active nav key from the current path (+ ?tab= for the Explore /
   Messages split, mirroring how /session reports its active key). Used by
   SidebarNav, which has no per-page `active` prop. */
export function getActiveKey(pathname: string, tab?: string | null): string {
  if (pathname === '/home') return 'home'
  if (pathname === '/wallet') return 'wallet'
  if (pathname === '/profile' || pathname === '/mirror' || pathname === '/availability') return 'profile'
  if (pathname.startsWith('/teacher/')) return 'session'
  if (pathname === '/session' || pathname.startsWith('/session')) return tab === 'pings' ? 'messages' : 'session'
  return ''
}

/* Routes that get the desktop app shell (sidebar). Detail / immersive / flow
   pages (video room, ping thread, onboarding, auth, review, admin…) are excluded. */
export function isShellRoute(pathname: string): boolean {
  if (['/home', '/session', '/wallet', '/profile', '/mirror', '/availability'].includes(pathname)) return true
  if (pathname.startsWith('/teacher/')) return true
  return false
}
