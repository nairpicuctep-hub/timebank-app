'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'

/* -------------------------------------------------------------------------
   Global feedback: design-system toast + alert/confirm modal.
   Replaces native alert()/confirm() for visual consistency.

   Usage (from anywhere, no props/threading needed):
     import { toast, showAlert, showConfirm } from '@/components/ui/Feedback'
     toast('Saved')                                   // transient toast
     await showAlert('Something went wrong')          // styled OK dialog
     if (await showConfirm('Delete this?', { danger:true })) { ... }  // styled confirm

   Callers pass already-localized strings (they have useTranslations); the host
   supplies localized OK/Cancel button labels from the `common` namespace.
   Mount <FeedbackHost/> once near the app root.
   ------------------------------------------------------------------------- */

type Variant = 'info' | 'success' | 'error'
type ToastItem = { id: number; message: string; variant: Variant }
type Dialog = {
  id: number
  title?: string
  message: string
  confirmLabel?: string
  cancel: boolean // true → confirm (two buttons); false → alert (OK only)
  danger?: boolean
  resolve: (ok: boolean) => void
}

let toasts: ToastItem[] = []
let dialog: Dialog | null = null
let counter = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
const getToasts = () => toasts
const getDialog = () => dialog

export function toast(message: string, variant: Variant = 'info') {
  const id = counter++
  toasts = [...toasts, { id, message, variant }]
  emit()
  setTimeout(() => { toasts = toasts.filter(t => t.id !== id); emit() }, 4200)
}

export function showAlert(message: string, opts?: { title?: string; confirmLabel?: string }): Promise<void> {
  return new Promise(resolve => {
    dialog = { id: counter++, message, title: opts?.title, confirmLabel: opts?.confirmLabel, cancel: false, resolve: () => resolve() }
    emit()
  })
}

export function showConfirm(
  message: string,
  opts?: { title?: string; confirmLabel?: string; danger?: boolean },
): Promise<boolean> {
  return new Promise(resolve => {
    dialog = { id: counter++, message, title: opts?.title, confirmLabel: opts?.confirmLabel, cancel: true, danger: opts?.danger, resolve }
    emit()
  })
}

export function FeedbackHost() {
  const tc = useTranslations('common')
  const items = useSyncExternalStore(subscribe, getToasts, getToasts)
  const dlg = useSyncExternalStore(subscribe, getDialog, getDialog)
  const [, force] = useState(0)

  // close-on-Escape for the dialog (acts as cancel for confirm, OK for alert)
  useEffect(() => {
    if (!dlg) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dlg?.id])

  function finish(ok: boolean) {
    if (!dialog) return
    const d = dialog
    dialog = null
    emit()
    force(n => n + 1)
    d.resolve(ok)
  }

  return (
    <>
      {/* toasts */}
      <div className="fixed left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)' }}>
        {items.map(t => (
          <div key={t.id}
            className="glass px-4 py-2.5 rounded-pill text-sm font-medium shadow-lg max-w-[90vw] text-center"
            style={{
              color: t.variant === 'error' ? 'var(--rose, #D03878)' : t.variant === 'success' ? 'var(--mint)' : 'var(--ink, #2a1a12)',
              animation: 'tb-toast-in 0.22s ease-out',
            }}>
            {t.message}
          </div>
        ))}
      </div>

      {/* alert / confirm dialog */}
      {dlg && (
        <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center px-4"
          style={{ background: 'rgba(40,20,10,0.45)' }}
          onClick={() => finish(false)}>
          <div className="glass w-full" style={{ maxWidth: 380, padding: 20, borderRadius: 18, animation: 'tb-toast-in 0.2s ease-out' }}
            onClick={e => e.stopPropagation()}>
            {dlg.title && <h3 className="font-display font-semibold text-lg text-ink mb-1">{dlg.title}</h3>}
            <p className="text-sm text-text" style={{ marginBottom: 16, whiteSpace: 'pre-line' }}>{dlg.message}</p>
            <div className="flex gap-2">
              {dlg.cancel && (
                <button onClick={() => finish(false)} className="btn-ghost flex-1 py-2.5 text-sm">{tc('cancel')}</button>
              )}
              <button onClick={() => finish(true)}
                className={dlg.danger ? 'flex-1 py-2.5 text-sm font-semibold rounded-btn' : 'btn-grad flex-1 py-2.5 text-sm'}
                style={dlg.danger ? { background: 'var(--request-bg)', color: 'var(--rose, #D03878)', border: '1px solid #fecdd3' } : undefined}>
                {dlg.confirmLabel || tc('ok')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes tb-toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
