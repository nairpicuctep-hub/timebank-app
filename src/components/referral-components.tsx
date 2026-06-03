'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/* -------------------------------------------------------------------------
   Referral UI — two components:
   • <InviteCard>   : shows the user's code + share link + their referral stats.
                      Drop into Profile or a dedicated /invite page.
   • <RedeemReferral>: lets a new user enter a code. Drop into onboarding
                      (About You step) or post-signup. No-op if already referred.

   Reward model (enforced server-side): the referrer earns TC only when the
   invited user completes their first GENUINE (integrity-checked) session.
   ------------------------------------------------------------------------- */

const SITE = 'https://app.timebank.academy'

export function InviteCard() {
  const [code, setCode] = useState<string>('')
  const [stats, setStats] = useState({ pending: 0, rewarded: 0 })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: c } = await supabase.rpc('ensure_referral_code', { p_user: session.user.id })
      setCode(c || '')
      const { data: refs } = await supabase.from('referrals').select('status').eq('referrer_id', session.user.id)
      const list = refs || []
      setStats({
        pending: list.filter((r: any) => r.status === 'pending').length,
        rewarded: list.filter((r: any) => r.status === 'rewarded').length,
      })
    }
    load()
  }, [])

  const link = `${SITE}/auth?ref=${code}`

  async function share() {
    const text = `Join me on TimeBank Academy — teach what you know, learn what you need. Use my code ${code}: ${link}`
    if (navigator.share) {
      try { await navigator.share({ title: 'TimeBank Academy', text, url: link }) } catch {}
    } else {
      await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800)
    }
  }

  if (!code) return null

  return (
    <div className="grad-card p-5">
      <div className="blob blob-1" /><div className="blob blob-2" />
      <div className="relative">
        <div className="font-mono text-xs uppercase tracking-widest mb-1" style={{ opacity: 0.85 }}>Invite friends</div>
        <p className="text-sm mb-3" style={{ opacity: 0.95 }}>
          Earn <b>1 TC</b> for each friend who joins and completes their first real session.
        </p>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 px-4 py-2.5 rounded-btn font-mono text-lg font-bold tracking-widest text-center"
            style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.35)' }}>
            {code}
          </div>
          <button onClick={share} className="px-4 py-2.5 rounded-btn text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.92)', color: 'var(--coral)' }}>
            {copied ? 'Copied ✓' : 'Share'}
          </button>
        </div>
        <div className="flex gap-4 text-xs" style={{ opacity: 0.9 }}>
          <span>⏳ {stats.pending} invited</span>
          <span>✓ {stats.rewarded} joined &amp; active</span>
        </div>
      </div>
    </div>
  )
}

export function RedeemReferral({ onDone }: { onDone?: () => void }) {
  const [code, setCode] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'bad' | 'hidden'>('idle')

  // prefill from ?ref= and check if already referred
  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const url = new URL(window.location.href)
      const ref = url.searchParams.get('ref')
      if (ref) setCode(ref.toUpperCase())
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: p } = await supabase.from('profiles').select('referred_by').eq('id', session.user.id).single()
      if (p?.referred_by) setState('hidden')   // already referred — don't show
    }
    init()
  }, [])

  async function redeem() {
    if (!code.trim()) return
    setState('busy')
    const supabase = createClient()
    const { data, error } = await supabase.rpc('redeem_referral', { p_code: code.trim() })
    if (error || data === false) { setState('bad'); return }
    setState('ok'); onDone?.()
  }

  if (state === 'hidden') return null
  if (state === 'ok') return (
    <div className="glass p-3 flex items-center gap-2">
      <span className="text-lg">🤝</span>
      <span className="text-sm text-ink">Invite applied — your friend earns TC when you complete your first session.</span>
    </div>
  )

  return (
    <div className="glass p-4">
      <label className="block text-sm font-semibold text-ink mb-1">Have an invite code? <span className="text-muted font-normal">(optional)</span></label>
      <div className="flex gap-2">
        <input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setState('idle') }}
          placeholder="e.g. A1B2C3" style={{ fontSize: 14, textTransform: 'uppercase' }} maxLength={8} />
        <button onClick={redeem} disabled={state === 'busy' || !code.trim()} className="btn-grad px-4 text-sm flex-shrink-0">
          {state === 'busy' ? '…' : 'Apply'}
        </button>
      </div>
      {state === 'bad' && <p className="text-xs mt-1.5" style={{ color: 'var(--coral)' }}>That code didn&apos;t work — check it and try again.</p>}
    </div>
  )
}
