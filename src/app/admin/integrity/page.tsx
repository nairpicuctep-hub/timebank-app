'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast, showConfirm } from '@/components/ui/Feedback'

/* -------------------------------------------------------------------------
   Integrity review queue (/admin/integrity) — Phase: anti-gaming.
   Admin-gated. Lists sessions the integrity engine flagged, with reasons +
   severity. Admin clears (false positive) or confirms fraud (claws back TC).
   ------------------------------------------------------------------------- */

const SEV: Record<string, { bg: string; tx: string; label: string }> = {
  high:   { bg: '#fef2f2', tx: '#b91c1c', label: 'HIGH' },
  medium: { bg: '#fff7ed', tx: '#c2410c', label: 'MED' },
  low:    { bg: '#f5f3ff', tx: '#6d28d9', label: 'LOW' },
}

const REASON_LABEL: Record<string, string> = {
  missing_presence: 'One party never joined the room',
  low_active_time:  'Active time far below session length',
  no_chat:          'No messages exchanged',
  repeated_pair:    'Same two people trading repeatedly',
  high_velocity:    'Many sessions completed in a short window',
}

export default function IntegrityQueuePage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [flags, setFlags] = useState<any[]>([])
  const [busy, setBusy] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
      if (!me?.is_admin) { setAllowed(false); return }
      setAllowed(true); load()
    }
    init()
  }, [router])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.rpc('intel_integrity_queue')
    setFlags(data || [])
  }

  async function resolve(id: number, status: 'cleared' | 'confirmed_fraud') {
    if (status === 'confirmed_fraud' && !await showConfirm('Confirm fraud? This reverses the TC paid for this session.', { danger: true, confirmLabel: 'Confirm fraud' })) return
    setBusy(id)
    const supabase = createClient()
    const { error } = await supabase.rpc('resolve_integrity_flag', { p_flag_id: id, p_status: status })
    setBusy(null)
    if (error) { toast(error.message, 'error'); return }
    load()
  }

  if (allowed === null) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm font-mono text-muted">Checking access…</p></div>
  if (allowed === false) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
      <div className="text-4xl mb-3">🔒</div><h1 className="font-display font-semibold text-xl text-ink">Admins only</h1>
      <button onClick={() => router.push('/home')} className="btn-grad px-5 py-3 text-sm mt-4">Back to home</button>
    </div>
  )

  return (
    <div className="min-h-screen pb-12 px-5 pt-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display font-semibold text-[26px] text-ink">Integrity</h1>
        <div className="flex gap-3">
          <button onClick={() => router.push('/admin')} className="text-xs text-muted">Admin</button>
          <button onClick={() => router.push('/intel')} className="text-xs text-muted">Intel</button>
        </div>
      </div>
      <p className="text-sm text-muted mb-5">Sessions the system flagged as possibly non-genuine. Human review keeps the TC economy honest — the safeguard before any future convertibility.</p>

      {flags.length === 0 ? (
        <div className="glass p-8 text-center">
          <div className="text-3xl mb-2">✓</div>
          <p className="text-sm text-muted">No open flags. The economy looks clean.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {flags.map(f => {
            const sev = SEV[f.severity] || SEV.low
            return (
              <div key={f.id} className="glass p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-pill" style={{ background: sev.bg, color: sev.tx }}>{sev.label}</span>
                  <span className="text-xs text-muted font-mono">{new Date(f.created_at).toLocaleString('en-GB')}</span>
                </div>
                <div className="flex flex-col gap-1 mb-3">
                  {(f.reasons || []).map((r: string) => (
                    <div key={r} className="text-sm text-ink flex items-start gap-2">
                      <span style={{ color: sev.tx }}>•</span>{REASON_LABEL[r] || r}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => resolve(f.id, 'cleared')} disabled={busy === f.id}
                    className="btn-ghost flex-1 py-2.5 text-xs">False alarm — clear</button>
                  <button onClick={() => resolve(f.id, 'confirmed_fraud')} disabled={busy === f.id}
                    className="flex-1 py-2.5 text-xs font-semibold rounded-btn"
                    style={{ background: 'var(--request-bg)', color: 'var(--rose)', border: '1px solid #fecdd3' }}>
                    {busy === f.id ? '…' : 'Confirm fraud — reverse TC'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
