'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function handleAuth() {
      // Wait a moment for cookies to settle
      await new Promise(r => setTimeout(r, 500))

      // Check session directly from cookie
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('skill_mirror_done')
          .eq('id', session.user.id)
          .single()

        if (!profile?.skill_mirror_done) {
          router.push('/onboarding')
        } else {
          router.push('/home')
        }
        return
      }

      // Fallback: try code exchange
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const token_hash = params.get('token_hash')
      const type = params.get('type') as any

      if (token_hash && type) {
        await supabase.auth.verifyOtp({ type, token_hash })
      } else if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('skill_mirror_done')
          .eq('id', user.id)
          .single()
        router.push(!profile?.skill_mirror_done ? '/onboarding' : '/home')
      } else {
        router.push('/auth?error=auth_failed')
      }
    }

    handleAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'conic-gradient(from 180deg, #F0A830, #E85030, #D03878, #F0A830)' }}>
          <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center"
            style={{ background: '#0c0906' }}>
            <span className="text-lg">✦</span>
          </div>
        </div>
        <p className="text-sm font-mono" style={{ color: '#9a8f82' }}>Signing you in…</p>
      </div>
    </div>
  )
}
