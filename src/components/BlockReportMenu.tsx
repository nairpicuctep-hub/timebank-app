'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { toast, showConfirm } from '@/components/ui/Feedback'

/* -------------------------------------------------------------------------
   BlockReportMenu — small "Options" menu with Block + Report actions.
   Drop next to a user (teacher profile header, ping thread header).
     • Block  → inserts user_blocks; RLS then prevents pings/messages both ways
                and the pair disappears from Explore/Home.
     • Report → modal with an optional reason → inserts user_reports (status open),
                surfaced to admins for moderation.
   ------------------------------------------------------------------------- */

export default function BlockReportMenu({
  targetId, targetName, onBlocked, tone = 'dark',
}: {
  targetId: string
  targetName: string
  onBlocked?: () => void
  tone?: 'dark' | 'light' // dark = on gradient header (white icon), light = on cream
}) {
  const t = useTranslations('moderation')
  const tc = useTranslations('common')
  const [open, setOpen] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const name = targetName || '—'

  async function block() {
    setOpen(false)
    if (!await showConfirm(t('blockConfirm', { name }), { danger: true, confirmLabel: t('block') })) return
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error } = await supabase.from('user_blocks')
      .insert({ blocker_id: session.user.id, blocked_id: targetId })
    if (error) { toast(t('failed', { message: error.message }), 'error'); return }
    toast(t('blockedToast', { name }), 'success')
    onBlocked?.()
  }

  async function submitReport() {
    setBusy(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBusy(false); return }
    const { error } = await supabase.from('user_reports')
      .insert({ reporter_id: session.user.id, reported_id: targetId, reason: reason.trim() || null })
    setBusy(false)
    if (error) { toast(t('failed', { message: error.message }), 'error'); return }
    setReporting(false); setReason('')
    toast(t('reportThanks'), 'success')
  }

  const iconColor = tone === 'dark' ? '#fff' : 'var(--muted)'

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} aria-label={t('menu')}
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: tone === 'dark' ? 'rgba(255,255,255,0.18)' : 'var(--cream-2)', color: iconColor, fontSize: 18, lineHeight: 1 }}>
        ⋯
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 z-50 glass overflow-hidden"
            style={{ minWidth: 160, borderRadius: 14, padding: 6 }}>
            <button onClick={() => { setOpen(false); setReporting(true) }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-ink hover:opacity-80"
              style={{ display: 'block' }}>
              ⚑ {t('report')}
            </button>
            <button onClick={block}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:opacity-80"
              style={{ display: 'block', color: 'var(--rose, #D03878)' }}>
              ⊘ {t('block')}
            </button>
          </div>
        </>
      )}

      {reporting && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4"
          style={{ background: 'rgba(40,20,10,0.45)' }} onClick={() => !busy && setReporting(false)}>
          <div className="glass w-full" style={{ maxWidth: 380, padding: 20, borderRadius: 18 }}
            onClick={e => e.stopPropagation()}>
            <h3 className="font-display font-semibold text-lg text-ink mb-1">{t('reportTitle', { name })}</h3>
            <p className="text-xs text-muted mb-3">{t('reportHint')}</p>
            <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)}
              placeholder={t('reportPlaceholder')} style={{ resize: 'none', marginBottom: 12 }} />
            <div className="flex gap-2">
              <button onClick={() => setReporting(false)} disabled={busy}
                className="btn-ghost flex-1 py-2.5 text-sm">{tc('cancel')}</button>
              <button onClick={submitReport} disabled={busy}
                className="btn-grad flex-1 py-2.5 text-sm">{busy ? '…' : t('reportSubmit')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
