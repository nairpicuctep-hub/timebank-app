'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import MirrorSuggestions from '@/components/MirrorSuggestions'
import { toast } from '@/components/ui/Feedback'

/* -------------------------------------------------------------------------
   Skill Mirror (/mirror) — standalone profile-building tool (FEATURE 7 moves
   it here from the bottom nav). Reflective questions → Gemini suggestions
   (MirrorSuggestions) → confirmed skills are persisted as teacher user_skills
   and merged into profiles.teach_skills for the logged-in user.
   ------------------------------------------------------------------------- */

export default function MirrorPage() {
  const t = useTranslations('mirror')
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [lang, setLang] = useState('en')
  const [teachSlugs, setTeachSlugs] = useState<string[]>([])
  const [answers, setAnswers] = useState({ topic: '', friends_ask: '', flow: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      setUid(session.user.id)
      const { data: p } = await supabase.from('profiles')
        .select('teach_skills, language').eq('id', session.user.id).single()
      setTeachSlugs(p?.teach_skills || [])
      setLang(p?.language || 'en')
      const { data: r } = await supabase.from('skill_mirror_responses')
        .select('topic, friends_ask, flow_activity').eq('user_id', session.user.id).maybeSingle()
      if (r) setAnswers({ topic: r.topic || '', friends_ask: r.friends_ask || '', flow: r.flow_activity || '' })
      setLoading(false)
    }
    load()
  }, [router])

  async function persist(slugs: string[]) {
    const supabase = createClient()
    // resolve canonical slugs -> ids (slugs already come from add_skill, so they're real)
    const { data: rows } = await supabase.from('skills').select('id, slug').in('slug', slugs)
    const records = (rows || []).map(r => ({ user_id: uid, skill_id: r.id, role: 'teacher', proficiency: 2 }))
    if (records.length) {
      await supabase.from('user_skills').upsert(records, { onConflict: 'user_id,skill_id,role', ignoreDuplicates: true })
    }
    const merged = Array.from(new Set([...teachSlugs, ...slugs]))
    await supabase.from('profiles').update({ teach_skills: merged }).eq('id', uid)
    setTeachSlugs(merged)
    // save the reflective answers too (so they persist across visits)
    await supabase.from('skill_mirror_responses').upsert(
      { user_id: uid, topic: answers.topic || null, friends_ask: answers.friends_ask || null, flow_activity: answers.flow || null },
      { onConflict: 'user_id' },
    )
  }

  const QS = [
    { key: 'topic' as const, q: t('q1'), ph: t('q1Ph') },
    { key: 'friends_ask' as const, q: t('q2'), ph: t('q2Ph') },
    { key: 'flow' as const, q: t('q3'), ph: t('q3Ph') },
  ]

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm font-mono text-muted">…</p></div>

  return (
    <div className="min-h-screen px-5 pt-12" style={{ paddingBottom: 96 }}>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display font-semibold text-[26px] text-ink">✦ {t('title')}</h1>
        <button onClick={() => router.push('/profile')} className="text-xs text-muted">← Profile</button>
      </div>
      <p className="text-sm text-muted mb-5">{t('subtitle')}</p>

      <div className="flex flex-col gap-3">
        {QS.map(m => (
          <div key={m.key} className="glass p-4">
            <label className="block text-sm font-semibold text-ink mb-2">{m.q}</label>
            <textarea rows={2} value={answers[m.key]} placeholder={m.ph}
              onChange={e => setAnswers(a => ({ ...a, [m.key]: e.target.value }))} style={{ resize: 'none' }} />
          </div>
        ))}

        <div className="glass p-4">
          <MirrorSuggestions
            answers={answers}
            language={lang}
            alreadySelected={teachSlugs}
            onAddSlugs={persist}
          />
        </div>
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
