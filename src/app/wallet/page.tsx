'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'

/* -------------------------------------------------------------------------
   Wallet (/wallet) — light/Bricolage.
   Reads the REAL tc_ledger schema: d_available, d_escrowed, available_after,
   forfeited, reason. Direction + amount are DERIVED from the signed deltas
   (the old code assumed direction/amount/note columns that don't exist).
   ------------------------------------------------------------------------- */

const REASON: Record<string, { tkey: string; icon: string }> = {
  signup_grant:   { tkey: 'reasonSignupGrant',   icon: '🎁' },
  session_hold:   { tkey: 'reasonSessionHold',   icon: '🔒' },
  session_refund: { tkey: 'reasonSessionRefund', icon: '↩️' },
  session_earn:   { tkey: 'reasonSessionEarn',   icon: '🎓' },
  session_settle: { tkey: 'reasonSessionSettle', icon: '✓' },
  referral_bonus: { tkey: 'reasonReferralBonus', icon: '🤝' },
  admin_grant:    { tkey: 'reasonAdminGrant',    icon: '⚙️' },
}

export default function WalletPage() {
  const t = useTranslations('wallet')
  const tc = useTranslations('common')
  const [balance, setBalance] = useState({ available_balance: 0, escrowed_balance: 0 })
  const [txns, setTxns] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const [balRes, txRes, profRes] = await Promise.all([
        supabase.rpc('get_balance', { p_user_id: session.user.id }),
        supabase.from('tc_ledger').select('*').eq('user_id', session.user.id)
          .order('created_at', { ascending: false }).limit(30),
        supabase.from('profiles').select('tc_earned_lifetime, tc_spent_lifetime, tier').eq('id', session.user.id).single(),
      ])
      setBalance(balRes.data?.[0] || { available_balance: 0, escrowed_balance: 0 })
      setTxns(txRes.data || [])
      setProfile(profRes.data)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm font-mono text-muted">{tc('loading')}</p>
    </div>
  )

  const avail = Number(balance.available_balance || 0)
  const escrow = Number(balance.escrowed_balance || 0)
  const earned = Number(profile?.tc_earned_lifetime || 0)
  const spent = Number(profile?.tc_spent_lifetime || 0)

  // derive a display row from a real ledger entry
  function derive(tx: any) {
    const dAvail = Number(tx.d_available || 0)
    const dEscr = Number(tx.d_escrowed || 0)
    // the headline number: net change to the user's own funds
    // hold: available -1, escrow +1  → show as -1 (money left available)
    // earn: available +1             → +1
    // refund: available +1           → +1
    // settle: escrow -1              → the spend finalised → show as -1
    let amount = dAvail
    if (tx.reason === 'session_settle') amount = -Math.abs(dEscr)
    if (tx.reason === 'session_hold') amount = dAvail // already negative
    const credit = amount > 0
    const known = REASON[tx.reason]
    const meta = known ? { label: t(known.tkey), icon: known.icon } : { label: tx.reason.replace(/_/g, ' '), icon: '◈' }
    return { amount, credit, meta }
  }

  return (
    <div className="min-h-screen pb-28 px-5 pt-12">
      <h1 className="font-display font-semibold text-[26px] text-ink mb-5">{t('title')} ◈</h1>

      {/* balance hero */}
      <div className="grad-card rise p-7 mb-5">
        <div className="blob blob-1" /><div className="blob blob-2" />
        <div className="font-mono text-xs uppercase tracking-widest relative" style={{ opacity: 0.85 }}>{t('availableBalance')}</div>
        <div className="font-display font-bold text-white leading-none relative tc-pop" style={{ fontSize: 64, marginTop: 6 }}>
          {avail % 1 === 0 ? avail : avail.toFixed(1)}
        </div>
        <div className="text-xs relative" style={{ opacity: 0.85, marginTop: 8 }}>
          {t('learningEstimate', { count: avail })}
        </div>
        {escrow > 0 && (
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-pill relative"
            style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.35)', fontSize: 12 }}>
            ⏳ {t('escrow', { amount: escrow })}
          </div>
        )}
      </div>

      {/* lifetime stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="glass p-4 text-center">
          <div className="font-display font-bold text-2xl grad-text">{earned % 1 === 0 ? earned : earned.toFixed(1)}</div>
          <div className="text-xs text-muted mt-0.5">{t('earnedLifetime')}</div>
        </div>
        <div className="glass p-4 text-center">
          <div className="font-display font-bold text-2xl text-ink">{spent % 1 === 0 ? spent : spent.toFixed(1)}</div>
          <div className="text-xs text-muted mt-0.5">{t('spentLifetime')}</div>
        </div>
      </div>

      {/* free-forever reassurance — TimeBank is free for individuals, no cap */}
      <div className="glass p-4 mb-5 flex items-center gap-3" style={{ border: '1px solid var(--tc-bd)' }}>
        <div className="text-2xl">✦</div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-ink">{t('freeForever')}</div>
          <div className="text-xs text-muted">{t('freePitch')}</div>
        </div>
      </div>

      {/* activity */}
      <div className="glass overflow-hidden">
        <div className="px-5 py-4 font-display font-semibold text-lg text-ink" style={{ borderBottom: '1px solid var(--line-2)' }}>
          {t('activity')}
        </div>
        {txns.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted">
            {t('noActivity')}
          </div>
        ) : txns.map(tx => {
          const { amount, credit, meta } = derive(tx)
          return (
            <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid var(--line-2)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: credit ? 'var(--mint-bg)' : 'var(--cream-2)' }}>
                {meta.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink truncate">{meta.label}</div>
                <div className="text-xs text-muted font-mono mt-0.5">
                  {new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {Number(tx.forfeited) > 0 && ` · ${t('forfeited', { amount: tx.forfeited })}`}
                </div>
              </div>
              <div className="font-mono text-sm font-semibold flex-shrink-0"
                style={{ color: credit ? 'var(--mint)' : 'var(--rose)' }}>
                {credit ? '+' : '−'}{Math.abs(amount)} TC
              </div>
            </div>
          )
        })}
      </div>

      <BottomNav active="wallet" />
    </div>
  )
}
