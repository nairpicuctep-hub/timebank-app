'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/* Count of incoming pending ping requests → the red unread dot on the
   Messages nav item. Shared by BottomNav + SidebarNav (identical query). */
export function usePendingPings(): number {
  const [pendingPings, setPendingPings] = useState(0)
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    async function loadCount() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { count } = await supabase
        .from('session_pings')
        .select('id', { count: 'exact', head: true })
        .eq('to_user', session.user.id)
        .eq('status', 'pending')
      if (!cancelled) setPendingPings(count || 0)
    }
    loadCount()
    return () => { cancelled = true }
  }, [])
  return pendingPings
}
