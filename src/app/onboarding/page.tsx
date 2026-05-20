'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const QUESTIONS = [
  {
    q: 'What topic could you talk about for an hour without any preparation?',
    options: ['A technical skill or tool', 'A language or culture', 'Music, art or creativity', 'Business or strategy', 'Health, sport or wellness', 'History, science or ideas']
  },
  {
    q: 'What do friends and colleagues ask you for help with most?',
    options: ['Fixing tech problems', 'Explaining complex things simply', 'Creative projects', 'Life advice or listening', 'Planning and organisation', 'Language or communication']
  },
  {
    q: 'Which activity makes you completely lose track of time?',
    options: ['Building or coding something', 'Playing or creating music', 'Learning a new language', 'Teaching or mentoring', 'Designing or making things', 'Reading or researching']
  },
  {
    q: 'What skill do you wish you had discovered earlier in life?',
    options: ['A second language', 'A creative outlet', 'Financial literacy', 'A physical skill', 'Public speaking', 'Technical skills']
  },
  {
    q: 'If you had to teach one thing tomorrow, what would feel most natural?',
    options: ['Something I use at work daily', 'A hobby I am passionate about', 'A life skill I had to learn', 'A language I speak natively', 'A technique or methodology', 'Something I am self-taught in']
  },
  {
    q: 'How do you prefer to share knowledge?',
    options: ['Step by step, very structured', 'Through examples and stories', 'Hands-on, learning by doing', 'Open conversation and questions', 'Visually with diagrams', 'Written guides or resources']
  },
  {
    q: 'Which of these best describes something unique about your background?',
    options: ['I have lived in multiple countries', 'I switched careers dramatically', 'I am self-taught in my field', 'I come from a rare cultural background', 'I have niche professional expertise', 'I have an unusual combination of skills']
  }
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [freeText, setFreeText] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const current = QUESTIONS[step]
  const progress = ((step) / QUESTIONS.length) * 100

  async function handleNext() {
    if (!selected) return
    const newAnswers = [...answers, selected]

    if (step < QUESTIONS.length - 1) {
      setAnswers(newAnswers)
      setSelected(null)
      setStep(step + 1)
      return
    }

    // Final step — save and mark done
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Save responses
    const rows = QUESTIONS.map((q, i) => ({
      user_id: user.id,
      question_no: i + 1,
      question: q.q,
      answer: newAnswers[i] || ''
    }))
    await supabase.from('skill_mirror_responses').insert(rows)

    // Mark onboarding done
    await supabase.from('profiles')
      .update({ skill_mirror_done: true, onboarding_step: 7 })
      .eq('id', user.id)

    router.push('/home?welcome=1')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8 fade-up">
          <div className="inline-block text-xs font-mono text-muted uppercase tracking-widest mb-3"
            style={{ background: 'rgba(240,168,48,0.1)', border: '1px solid rgba(240,168,48,0.2)', borderRadius: '100px', padding: '6px 16px' }}>
            The Skill Mirror
          </div>
          <h1 className="font-display text-4xl font-light leading-tight">
            Let's find what<br /><em>you can teach</em>
          </h1>
          <p className="text-sm text-muted mt-3">
            Question {step + 1} of {QUESTIONS.length}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8 fade-up-1" style={{ background: 'rgba(245,237,216,0.06)', height: '2px', borderRadius: '1px' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}
          />
        </div>

        {/* Question card */}
        <div className="fade-up-1 mb-4"
          style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)', borderRadius: '24px', padding: '28px' }}>
          <p className="font-display text-2xl font-light leading-snug mb-6">
            {current.q}
          </p>

          <div className="space-y-2">
            {current.options.map((opt) => (
              <button
                key={opt}
                onClick={() => setSelected(opt)}
                className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                style={{
                  background: selected === opt ? 'rgba(240,168,48,0.1)' : '#242018',
                  border: selected === opt ? '1px solid #F0A830' : '1px solid rgba(245,237,216,0.06)',
                  color: selected === opt ? '#F0A830' : '#F5EDD8',
                }}>
                {opt}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={!selected || loading}
          className="w-full py-4 rounded-xl text-white text-sm font-medium transition-opacity disabled:opacity-30 fade-up-2"
          style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
          {loading ? 'Analysing your skills…' : step === QUESTIONS.length - 1 ? 'Reveal my skills ✦' : 'Continue →'}
        </button>

        <button
          onClick={() => router.push('/home')}
          className="w-full text-center text-xs text-muted mt-4 fade-up-3">
          Skip for now
        </button>
      </div>
    </div>
  )
}
