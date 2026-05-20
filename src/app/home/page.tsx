'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import HomeClient from './HomeClient'

export default function HomePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth')
        return
      }

      const [profileRes, balanceRes, matchesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.rpc('get_balance', { p_user_id: session.user.id }),
        supabase.from('flow_matches')
          .select('*, profiles!teacher_id(full_name, rating_as_teacher, sessions_taught), skills(name, icon)')
          .eq('learner_id', session.user.id)
          .eq('is_active', true)
          .order('flow_score', { ascending: false })
          .limit(5)
      ])

      setData({
        profile: profileRes.data,
        balance: balanceRes.data?.[0] || { available_balance: 0, escrowed_balance: 0 },
        matches: matchesRes.data || []
      })
      setLoading(false)
    }

    load()
  }, [router])

  if (loading) {
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
          <p className="text-sm font-mono" style={{ color: '#9a8f82' }}>Loading…</p>
        </div>
      </div>
    )
  }

  return <HomeClient profile={data.profile} balance={data.balance} matches={data.matches} />
}
