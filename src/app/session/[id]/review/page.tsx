'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

/* -------------------------------------------------------------------------
   Review (/session/[id]/review) — light/Bricolage.
   Calls confirm_session(p_session_id, p_rating, p_topic) — the safe RPC that
   records the rating, stamps this party's confirmation, and releases the
   escrow to the teacher once BOTH parties confirm.
   ------------------------------------------------------------------------- */

export default function ReviewPage() {
  const t = useTranslations('review')
  const tc = useTranslations('common')
  const { id: sessionId } = useParams()
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [topic, setTopic] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isTeacher, setIsTeacher] = useState(false)
  const [done, setDone] = useState(false)
  const [bothConfirmed, setBothConfirmed] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session: auth } } = await supabase.auth.getSession()
      if (!auth) { router.push('/auth'); return }
      const { data } = await supabase.from('sessions')
        .select('*, skill:skill_id(name, icon), teacher:teacher_id(full_name), learner:learner_id(full_name)')
        .eq('id', sessionId).single()
      if (data) {
        setSession(data)
        setIsTeacher(data.teacher_id === auth.user.id)
        setTopic(data.skill?.name || '')
      }
    }
    load()
  }, [sessionId, router])

  async function submit() {
    setSubmitting(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('confirm_session', {
      p_session_id: sessionId,
      p_rating: rating,
      p_topic: topic || null,
    })
    setSubmitting(false)
    if (error) { alert(t('couldntSubmit', { message: error.message })); return }
    setBothConfirmed(!!data?.tc_released)
    setDone(true)
  }

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm font-mono text-muted">{tc('loading')}</p>
    </div>
  )

  const otherName = isTeacher ? session.learner?.full_name : session.teacher?.full_name

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
      <div className="grad-card tc-pop" style={{ width: 120, height: 120, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <div className="blob blob-1" /><div className="blob blob-2" />
        <span style={{ fontSize: 44, color: '#fff', position: 'relative' }}>✦</span>
      </div>
      <h1 className="font-display font-semibold text-[28px] text-ink mb-2 rise-1">
        {bothConfirmed ? t('releasedTitle') : t('thanksTitle')}
      </h1>
      <p className="text-sm text-muted mb-8 rise-2" style={{ maxWidth: 300 }}>
        {bothConfirmed
          ? (isTeacher ? t('releasedBodyTeacher') : t('releasedBodyLearner', { name: otherName || t('yourTeacher') }))
          : t('waitingBody', { name: otherName || t('otherPerson') })}
      </p>
      <button onClick={() => router.push('/home')} className="btn-grad w-full py-4 text-sm rise-3" style={{ maxWidth: 320 }}>
        {t('backHome')} →
      </button>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7 rise">
          <div className="text-4xl mb-3">{session.skill?.icon || '✦'}</div>
          <h1 className="font-display font-semibold text-3xl text-ink mb-1">{t('title')}</h1>
          <p className="text-sm text-muted">{isTeacher ? t('subtitleTeacher') : t('subtitleLearner')}</p>
        </div>

        <div className="glass p-6 rise-1">
          <div className="mb-5">
            <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-2">
              {isTeacher ? t('whatTaught') : t('whatLearned')}
            </label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder={t('topicPlaceholder', { skill: session.skill?.name || t('topicSkillFallback') })} />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-3 text-center">
              {isTeacher ? t('rateLearner') : t('rateTeacher')}
            </label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRating(n)} className="transition-all"
                  style={{ fontSize: 30, opacity: n <= rating ? 1 : 0.25, transform: n <= rating ? 'scale(1.05)' : 'scale(1)' }}>
                  ⭐
                </button>
              ))}
            </div>
          </div>

          <button onClick={submit} disabled={submitting || !topic} className="btn-grad w-full py-3.5 text-sm">
            {submitting ? t('submitting') : `${t('confirmCta')} →`}
          </button>
        </div>

        <p className="text-center text-xs text-muted mt-4">
          {t('footer')}
        </p>
      </div>
    </div>
  )
}
