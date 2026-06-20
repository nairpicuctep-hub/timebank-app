'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/* Private-beta holding screen. Unapproved users are redirected here by
   middleware while NEXT_PUBLIC_PUBLIC_LAUNCH !== 'true'. If the user is
   already approved (or launch is open), bounce them to the app. */
export default function PendingPage() {
  const router = useRouter()

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PUBLIC_LAUNCH === 'true') { router.replace('/home'); return }
    const supabase = createClient()
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('profiles').select('is_approved').eq('id', session.user.id).single()
      if (data?.is_approved) router.replace('/home')
    })()
  }, [router])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
      <div className="text-4xl mb-3">⏳</div>
      <h1 className="font-display font-semibold text-xl text-ink mb-1">You&apos;re on the list</h1>
      <p className="text-sm text-muted mb-2 max-w-sm">
        TimeBank is in a small private beta while we put the finishing touches in place. Your account is ready — we&apos;ll open your spot very soon.
      </p>
      <p className="text-sm text-muted mb-6 max-w-sm">Thanks for being early.</p>
      <button onClick={signOut} className="btn-ghost px-5 py-3 text-sm">Sign out</button>
    </div>
  )
}
