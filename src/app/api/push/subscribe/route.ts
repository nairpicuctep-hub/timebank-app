import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/* -------------------------------------------------------------------------
   POST   /api/push/subscribe  — save the caller's Web Push subscription
   DELETE /api/push/subscribe  — remove it (on disable / unsubscribe)

   Each row is one browser/device endpoint, owned by the signed-in user and
   protected by RLS (push_subscriptions policies). The private VAPID key is
   never involved here — this only stores the public subscription handle.
   ------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const sub = body?.subscription
  const endpoint: string | undefined = sub?.endpoint
  const p256dh: string | undefined = sub?.keys?.p256dh
  const auth: string | undefined = sub?.keys?.auth
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  const ua = req.headers.get('user-agent')?.slice(0, 400) || null
  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: user.id, endpoint, p256dh, auth, ua, last_seen: new Date().toISOString() },
    { onConflict: 'endpoint' }
  )
  if (error) {
    console.error('push subscribe error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const endpoint: string | undefined = body?.endpoint
  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

  const { error } = await supabase.from('push_subscriptions')
    .delete().eq('endpoint', endpoint).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
