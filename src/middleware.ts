import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/* -------------------------------------------------------------------------
   Private-beta gate.
   While NEXT_PUBLIC_PUBLIC_LAUNCH !== 'true', any signed-in user whose
   profile is not yet approved is redirected to /pending. Flip the env var
   to 'true' (Vercel → redeploy) at public launch and this becomes a no-op.

   This is the app-level gate (UX/access). Enforcement intent: keep
   un-vetted accounts out of the product during the closed beta — not a
   hardened data-layer lock. Uses the @supabase/ssr@0.3.0 get/set/remove
   cookie interface (see src/lib/supabase/server.ts for the same note).
   ------------------------------------------------------------------------- */

const ALLOW = ['/pending', '/auth', '/api', '/privacy', '/terms', '/_next', '/favicon']

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()

  // Launch is open → gate disabled entirely.
  if (process.env.NEXT_PUBLIC_PUBLIC_LAUNCH === 'true') return res

  const { pathname } = request.nextUrl
  if (ALLOW.some(p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p))) return res

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { res.cookies.set({ name, value, ...options }) },
        remove(name: string, options: CookieOptions) { res.cookies.set({ name, value: '', ...options }) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  // Not signed in → let the page's own /auth redirect handle it.
  if (!user) return res

  const { data: profile } = await supabase.from('profiles').select('is_approved').eq('id', user.id).single()
  if (profile && profile.is_approved === false) {
    const url = request.nextUrl.clone()
    url.pathname = '/pending'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
