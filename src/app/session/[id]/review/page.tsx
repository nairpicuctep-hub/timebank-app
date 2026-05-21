'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ReviewPage() {
  const { id: sessionId } = useParams()
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [topic, setTopic] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isTeacher, setIsTeacher] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session: auth } } = await supabase.auth.getSession()
      if (!auth) { router.push('/auth'); return }
      const { data } = await supabase.from('sessions')
        .select('*, skills(name, icon)').eq('id', sessionId).single()
      setSession(data)
      setIsTeacher(data?.teacher_id === auth.user.id)
      setTopic(data?.skills?.name || '')
    }
    load()
  }, [sessionId, router])

  async function submit() {
    setSubmitting(true)
    const supabase = createClient()
    const { data: { session: auth } } = await supabase.auth.getSession()
    if (!auth) return

    const update = isTeacher
      ? { teacher_rating: rating, teacher_topic_reported: topic, teacher_confirmed_at: new Date().toISOString() }
      : { learner_rating: rating, learner_topic_reported: topic, learner_confirmed_at: new Date().toISOString() }

    await supabase.from('sessions').update(update).eq('id', sessionId)

    // Check if both confirmed — trigger verification
    const { data: updated } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
    if (updated?.teacher_confirmed_at && updated?.learner_confirmed_at) {
      await supabase.rpc('submit_trust_score', {
        p_session_id: sessionId,
        p_score: 80,
        p_flags: []
      })
    }

    router.push('/home')
  }

  if (!session) return null

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">✦</div>
          <h1 className="font-display text-3xl font-light mb-2">Session complete</h1>
          <p className="text-sm text-muted">
            {isTeacher ? 'Great teaching!' : 'How was your session?'}
          </p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
          <div className="mb-5">
            <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-2">
              {isTeacher ? 'What did you teach?' : 'What did you learn?'}
            </label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder={`e.g. ${session.skills?.name} basics`} />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-3">
              Rate your {isTeacher ? 'learner' : 'teacher'}
            </label>
            <div className="flex gap-2 justify-center">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)}
                  className="text-2xl transition-all"
                  style={{ opacity: n <= rating ? 1 : 0.25 }}>
                  ★
                </button>
              ))}
            </div>
          </div>

          <button onClick={submit} disabled={submitting || !topic}
            className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
            {submitting ? 'Submitting…' : 'Submit & release TC →'}
          </button>
        </div>

        <p className="text-center text-xs text-muted mt-4">
          Your TimeCredits will be released once both parties confirm.
        </p>
      </div>
    </div>
  )
}
