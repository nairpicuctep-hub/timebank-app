import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pushConfigured, sendToSub } from '@/lib/push'

/* -------------------------------------------------------------------------
   POST /api/push/broadcast  — admin-only push to every subscribed device.
   Body: { title, body, url? }

   Subscriptions are read through the admin-gated RPC push_all_subscriptions()
   (mirrors the intel_* pattern), so no service-role key is required. Dead
   endpoints (404/410) are pruned via push_delete_endpoint().
   ------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  if (!pushConfigured()) {
    return NextResponse.json({ error: 'Push is not configured (VAPID keys missing).' }, { status: 503 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const title = String(body?.title || '').trim().slice(0, 80)
  const text = String(body?.body || '').trim().slice(0, 200)
  const url = String(body?.url || '/home').trim().slice(0, 300) || '/home'
  if (!title || !text) return NextResponse.json({ error: 'Title and body are required.' }, { status: 400 })

  const { data: subs, error } = await supabase.rpc('push_all_subscriptions')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let sent = 0, failed = 0, pruned = 0
  for (const s of (subs || []) as { endpoint: string; p256dh: string; auth: string }[]) {
    const r = await sendToSub(s, { title, body: text, url })
    if (r.ok) { sent++; continue }
    failed++
    if (r.gone) { await supabase.rpc('push_delete_endpoint', { p_endpoint: s.endpoint }); pruned++ }
  }
  return NextResponse.json({ ok: true, total: subs?.length || 0, sent, failed, pruned })
}
