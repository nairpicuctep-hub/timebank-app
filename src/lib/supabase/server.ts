import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/* NOTE: @supabase/ssr@0.3.0 uses the get/set/remove cookie interface (NOT the
   getAll/setAll interface from 0.4+). Passing getAll/setAll here is silently
   ignored by 0.3.0, which leaves the server client with no cookie access at all
   — so auth.getUser()/getSession() always return null and every authed route
   handler responds "Not authenticated". The methods below match 0.3.0.
   set/remove are wrapped in try/catch because they throw when called from a
   Server Component (read-only) context; in Route Handlers they work and let an
   expired access token refresh. */
export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // called from a Server Component — safe to ignore
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // called from a Server Component — safe to ignore
          }
        },
      },
    }
  )
}
