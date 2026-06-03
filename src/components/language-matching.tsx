'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/* -------------------------------------------------------------------------
   Language-aware matching — soft-rank approach.
   • rankByLanguage(): teachers sharing the learner's languages first; others
     shown but labelled. English-first throughout.
   • languageLabel(): "Teaches in English, Dutch" — human, English-first.
   • <NotifyMeInLanguage>: the honest "only available in X — notify me" capture
     that records unmet demand (request_skill_language RPC).

   Design: language is profile-level (a teacher's languages apply to all their
   skills). Soft-rank now; can harden to a filter as inventory grows.
   ------------------------------------------------------------------------- */

const LANG_LABEL: Record<string, string> = {
  en: 'English', nl: 'Dutch', fr: 'French', ro: 'Romanian', de: 'German',
  es: 'Spanish', it: 'Italian', pt: 'Portuguese',
}

// English first, then alphabetical by label
export function orderLangs(codes: string[]): string[] {
  const uniq = Array.from(new Set(codes || []))
  return uniq.sort((a, b) => {
    if (a === 'en') return -1
    if (b === 'en') return 1
    return (LANG_LABEL[a] || a).localeCompare(LANG_LABEL[b] || b)
  })
}

export function languageLabel(codes: string[]): string {
  const ordered = orderLangs(codes)
  if (ordered.length === 0) return ''
  return ordered.map(c => LANG_LABEL[c] || c).join(', ')
}

// shared languages between learner and teacher (English-first)
export function sharedLanguages(learnerLangs: string[], teacherLangs: string[]): string[] {
  const tset = new Set(teacherLangs || [])
  return orderLangs((learnerLangs || []).filter(l => tset.has(l)))
}

/* Soft-rank a list of teacher objects by shared language with the learner.
   Each teacher must expose `languages_spoken: string[]`. Returns the same
   objects, sorted: shared-language teachers first (more shared = higher),
   then the rest. Adds `_shared` (string[]) for the UI to label.            */
export function rankByLanguage<T extends { languages_spoken?: string[] }>(
  teachers: T[], learnerLangs: string[]
): (T & { _shared: string[] })[] {
  return (teachers || [])
    .map(t => ({ ...t, _shared: sharedLanguages(learnerLangs, t.languages_spoken || []) }))
    .sort((a, b) => b._shared.length - a._shared.length)
}

/* The honest "not in your language" capture. Shows when a skill exists only in
   languages the learner doesn't speak. Records demand + offers a notify. */
export function NotifyMeInLanguage({
  skillId, skillName, availableLangs, learnerLangs,
}: {
  skillId?: number; skillName: string; availableLangs: string[]; learnerLangs: string[]
}) {
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const primary = orderLangs(learnerLangs)[0] || 'en'

  async function notify() {
    setBusy(true)
    const supabase = createClient()
    await supabase.rpc('request_skill_language', {
      p_skill_id: skillId ?? null, p_skill_name: skillName, p_language: primary,
    })
    setBusy(false); setSent(true)
  }

  if (sent) return (
    <div className="glass p-4 text-center">
      <div className="text-2xl mb-1">✓</div>
      <p className="text-sm text-ink font-semibold">We&apos;ll let you know</p>
      <p className="text-xs text-muted mt-0.5">When someone teaches {skillName} in {LANG_LABEL[primary] || primary}, you&apos;ll hear from us.</p>
    </div>
  )

  return (
    <div className="glass p-4 text-center">
      <div className="text-2xl mb-2">🌍</div>
      <p className="text-sm font-semibold text-ink mb-1">{skillName} isn&apos;t available in your language yet</p>
      <p className="text-xs text-muted mb-3">
        Currently taught in <b>{languageLabel(availableLangs)}</b>. You speak {LANG_LABEL[primary] || primary} —
        we&apos;ll notify you when a {LANG_LABEL[primary] || primary}-speaking teacher joins.
      </p>
      <button onClick={notify} disabled={busy} className="btn-grad w-full py-2.5 text-sm">
        {busy ? 'Saving…' : `Notify me ✦`}
      </button>
    </div>
  )
}
