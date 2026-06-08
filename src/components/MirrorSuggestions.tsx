'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/Feedback'

/* -------------------------------------------------------------------------
   MirrorSuggestions — turns Skill Mirror answers into teachable skills.
   • "Suggest" → POST /api/mirror-skills (Gemini) → candidate skill chips
   • User toggles which to keep, then confirms
   • Each confirmed name is canonicalised via add_skill() (server-side dedupe,
     same source-of-truth path SkillPicker uses) → returns real skills-row slugs
   • onAddSlugs(slugs) hands the canonical slugs back to the parent to persist

   Reused by onboarding (merges into teachSkills state) and the standalone
   /mirror page (persists directly to user_skills). Never a blocker — there's
   always manual skill entry alongside it.
   ------------------------------------------------------------------------- */

type Candidate = { name: string; category: string; confidence: number }

export default function MirrorSuggestions({
  answers,
  language = 'en',
  alreadySelected = [],
  onAddSlugs,
}: {
  answers: { topic?: string; friends_ask?: string; flow?: string }
  language?: string
  alreadySelected?: string[] // canonical slugs already chosen, to avoid re-adding
  onAddSlugs: (slugs: string[]) => void
}) {
  const t = useTranslations('mirror')
  const [stage, setStage] = useState<'idle' | 'loading' | 'review' | 'adding'>('idle')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const enoughText = ((answers.topic || '') + (answers.friends_ask || '') + (answers.flow || '')).trim().length >= 10

  async function suggest() {
    setStage('loading')
    try {
      const res = await fetch('/api/mirror-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast(json?.error || t('error'), 'error'); setStage('idle'); return }
      const cands: Candidate[] = json.skills || []
      if (!cands.length) { toast(t('none'), 'info'); setStage('idle'); return }
      setCandidates(cands)
      setSelected(new Set(cands.filter(c => c.confidence >= 0.5).map(c => c.name)))
      setStage('review')
    } catch {
      toast(t('error'), 'error')
      setStage('idle')
    }
  }

  function toggle(name: string) {
    setSelected(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })
  }

  async function confirm() {
    const names = candidates.filter(c => selected.has(c.name))
    if (!names.length) return
    setStage('adding')
    const supabase = createClient()
    const slugs: string[] = []
    for (const c of names) {
      try {
        const { data, error } = await supabase.rpc('add_skill', { p_name: c.name, p_language: language, p_category: c.category })
        if (!error && data?.slug && !alreadySelected.includes(data.slug)) slugs.push(data.slug)
      } catch { /* skip a single bad candidate, never block */ }
    }
    if (slugs.length) {
      onAddSlugs(slugs)
      toast(t('added', { count: slugs.length }), 'success')
    }
    setCandidates([]); setSelected(new Set()); setStage('idle')
  }

  if (stage === 'review') {
    return (
      <div>
        <p className="text-xs text-muted mb-3">{t('reviewHint')}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {candidates.map(c => {
            const on = selected.has(c.name)
            return (
              <button key={c.name} onClick={() => toggle(c.name)}
                className="px-3 py-2 rounded-btn text-sm font-medium transition-all"
                style={on ? { background: 'var(--grad)', color: '#fff', border: '1.5px solid transparent' }
                          : { background: 'rgba(255,255,255,0.6)', color: 'var(--text)', border: '1.5px solid var(--line)' }}>
                {c.name} {on ? '✓' : '+'}
              </button>
            )
          })}
        </div>
        <button onClick={confirm} disabled={selected.size === 0} className="btn-grad w-full py-2.5 text-sm">
          {t('addCta', { count: selected.size })}
        </button>
      </div>
    )
  }

  return (
    <button onClick={suggest} disabled={!enoughText || stage === 'loading' || stage === 'adding'}
      className="btn-ghost w-full py-2.5 text-sm disabled:opacity-50">
      {stage === 'loading' ? t('thinking') : stage === 'adding' ? t('adding') : `✦ ${t('suggestCta')}`}
    </button>
  )
}
