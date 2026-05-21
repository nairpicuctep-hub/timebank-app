'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const SKILLS = [
  { id: 'python',         name: 'Python',           icon: '🐍', cat: 'tech' },
  { id: 'javascript',     name: 'JavaScript',       icon: '⚡', cat: 'tech' },
  { id: 'excel',          name: 'Excel',             icon: '📊', cat: 'finance' },
  { id: 'power-bi',       name: 'Power BI',          icon: '📈', cat: 'finance' },
  { id: 'project-mgmt',   name: 'Project Mgmt',      icon: '🗂️', cat: 'business' },
  { id: 'french',         name: 'French',            icon: '🇫🇷', cat: 'language' },
  { id: 'romanian',       name: 'Romanian',          icon: '🇷🇴', cat: 'language' },
  { id: 'dutch',          name: 'Dutch',             icon: '🇧🇪', cat: 'language' },
  { id: 'spanish',        name: 'Spanish',           icon: '🇪🇸', cat: 'language' },
  { id: 'arabic',         name: 'Arabic',            icon: '🌙', cat: 'language' },
  { id: 'guitar',         name: 'Guitar',            icon: '🎸', cat: 'music' },
  { id: 'piano',          name: 'Piano',             icon: '🎹', cat: 'music' },
  { id: 'figma',          name: 'Design / Figma',    icon: '🎨', cat: 'arts' },
  { id: 'public-speaking',name: 'Public Speaking',   icon: '🎤', cat: 'business' },
  { id: 'chess',          name: 'Chess',             icon: '♟️', cat: 'sports' },
  { id: 'yoga',           name: 'Yoga',              icon: '🧘', cat: 'sports' },
  { id: 'data-science',   name: 'Data Science',      icon: '🔬', cat: 'tech' },
  { id: 'azure-devops',   name: 'Azure DevOps',      icon: '☁️', cat: 'tech' },
  { id: 'cooking',        name: 'Cooking',           icon: '👨‍🍳', cat: 'arts' },
  { id: 'photography',    name: 'Photography',       icon: '📸', cat: 'arts' },
  { id: 'writing',        name: 'Writing',           icon: '✍️', cat: 'arts' },
  { id: 'marketing',      name: 'Marketing',         icon: '📣', cat: 'business' },
  { id: 'italian',        name: 'Italian',           icon: '🇮🇹', cat: 'language' },
  { id: 'german',         name: 'German',            icon: '🇩🇪', cat: 'language' },
]

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert']
const LEVEL_COLORS = ['#1ED8A0','#F0A830','#E85030','#D03878']

type Step = 'learn' | 'teach' | 'levels' | 'done'

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('learn')
  const [learnSkills, setLearnSkills] = useState<string[]>([])
  const [teachSkills, setTeachSkills] = useState<string[]>([])
  const [levels, setLevels] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()

  const filtered = SKILLS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.cat.toLowerCase().includes(search.toLowerCase())
  )

  function toggleLearn(id: string) {
    setLearnSkills(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleTeach(id: string) {
    setTeachSkills(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function finish() {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Save skills to profiles
    await supabase.from('profiles').update({
      learn_skills: learnSkills,
      teach_skills: teachSkills,
      skill_mirror_done: true,
      onboarding_complete: true,
      onboarding_step: 3
    }).eq('id', session.user.id)

    // Save to user_skills table
    const skillRows = [
      ...teachSkills.map(sid => ({
        user_id: session.user.id,
        skill_id: null, // will resolve below
        role: 'teacher' as const,
        proficiency: levels[sid] || 2
      })),
      ...learnSkills.map(sid => ({
        user_id: session.user.id,
        skill_id: null,
        role: 'learner' as const,
        proficiency: 1
      }))
    ]

    // Get skill IDs from slugs
    const allSlugs = [...new Set([...teachSkills, ...learnSkills])]
    const { data: skillData } = await supabase
      .from('skills').select('id, slug').in('slug', allSlugs)

    const slugToId = Object.fromEntries((skillData || []).map(s => [s.slug, s.id]))

    const rows = [
      ...teachSkills.filter(s => slugToId[s]).map(s => ({
        user_id: session.user.id, skill_id: slugToId[s],
        role: 'teacher', proficiency: levels[s] || 2
      })),
      ...learnSkills.filter(s => slugToId[s]).map(s => ({
        user_id: session.user.id, skill_id: slugToId[s],
        role: 'learner', proficiency: 1
      }))
    ]

    if (rows.length > 0) {
      await supabase.from('user_skills').upsert(rows, { onConflict: 'user_id,skill_id,role' })
    }

    // Award XP + badge
    await supabase.rpc('award_badge', { p_user_id: session.user.id, p_badge_id: 'skill_mirror' })
    await supabase.rpc('update_streak', { p_user_id: session.user.id })

    router.push('/home?welcome=1')
  }

  const steps = [
    { id: 'learn', label: 'Learn', num: 1 },
    { id: 'teach', label: 'Teach', num: 2 },
    { id: 'levels', label: 'Levels', num: 3 },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0c0906' }}>

      {/* Progress */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-6">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all"
                  style={{
                    background: step === s.id ? 'linear-gradient(135deg, #F0A830, #D03878)' :
                      ['learn','teach','levels','done'].indexOf(step) > i ? 'rgba(30,216,160,0.3)' : 'rgba(245,237,216,0.08)',
                    color: step === s.id ? '#fff' : ['learn','teach','levels','done'].indexOf(step) > i ? '#1ED8A0' : '#9a8f82'
                  }}>
                  {['learn','teach','levels','done'].indexOf(step) > i ? '✓' : s.num}
                </div>
                <div className="text-xs font-mono mt-1" style={{ color: step === s.id ? '#F0A830' : '#9a8f82' }}>{s.label}</div>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 h-px mx-2 mt-[-16px]"
                  style={{ background: ['learn','teach','levels','done'].indexOf(step) > i ? 'rgba(30,216,160,0.4)' : 'rgba(245,237,216,0.08)' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: LEARN */}
      {step === 'learn' && (
        <div className="flex-1 flex flex-col px-5">
          <div className="mb-6">
            <h1 className="font-display text-3xl font-light mb-2">What do you want to <em>learn</em>?</h1>
            <p className="text-sm text-muted">Pick as many as you like. You can always change this later.</p>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search skills…" className="mb-4" />
          <div className="grid grid-cols-3 gap-2 flex-1 overflow-y-auto pb-4">
            {filtered.map(skill => {
              const selected = learnSkills.includes(skill.id)
              return (
                <button key={skill.id} onClick={() => toggleLearn(skill.id)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl transition-all aspect-square"
                  style={{
                    background: selected ? 'rgba(240,168,48,0.15)' : '#1c1917',
                    border: `2px solid ${selected ? '#F0A830' : 'rgba(245,237,216,0.06)'}`,
                    transform: selected ? 'scale(1.05)' : 'scale(1)'
                  }}>
                  <span className="text-2xl mb-1">{skill.icon}</span>
                  <span className="text-xs text-center leading-tight" style={{ color: selected ? '#F0A830' : '#F5EDD8' }}>
                    {skill.name}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="py-4">
            <button onClick={() => { setSearch(''); setStep('teach') }}
              disabled={learnSkills.length === 0}
              className="w-full py-4 rounded-2xl text-white font-medium disabled:opacity-30 transition-all"
              style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
              Continue ({learnSkills.length} selected) →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: TEACH */}
      {step === 'teach' && (
        <div className="flex-1 flex flex-col px-5">
          <div className="mb-6">
            <button onClick={() => setStep('learn')} className="text-xs text-muted mb-3 block">← Back</button>
            <h1 className="font-display text-3xl font-light mb-2">What can you <em>teach</em>?</h1>
            <p className="text-sm text-muted">Share your knowledge — earn TimeCredits for every session.</p>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search skills…" className="mb-4" />
          <div className="grid grid-cols-3 gap-2 flex-1 overflow-y-auto pb-4">
            {filtered.map(skill => {
              const selected = teachSkills.includes(skill.id)
              return (
                <button key={skill.id} onClick={() => toggleTeach(skill.id)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl transition-all aspect-square"
                  style={{
                    background: selected ? 'rgba(30,216,160,0.12)' : '#1c1917',
                    border: `2px solid ${selected ? '#1ED8A0' : 'rgba(245,237,216,0.06)'}`,
                    transform: selected ? 'scale(1.05)' : 'scale(1)'
                  }}>
                  <span className="text-2xl mb-1">{skill.icon}</span>
                  <span className="text-xs text-center leading-tight" style={{ color: selected ? '#1ED8A0' : '#F5EDD8' }}>
                    {skill.name}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="py-4 space-y-2">
            <button onClick={() => { setSearch(''); setStep('levels') }}
              disabled={teachSkills.length === 0}
              className="w-full py-4 rounded-2xl text-white font-medium disabled:opacity-30"
              style={{ background: 'linear-gradient(135deg, #1ED8A0, #185FA5)' }}>
              Continue ({teachSkills.length} selected) →
            </button>
            <button onClick={() => { setSearch(''); setStep('levels') }}
              className="w-full py-3 rounded-2xl text-sm text-muted">
              Skip — I only want to learn
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: LEVELS */}
      {step === 'levels' && (
        <div className="flex-1 flex flex-col px-5">
          <div className="mb-6">
            <button onClick={() => setStep('teach')} className="text-xs text-muted mb-3 block">← Back</button>
            <h1 className="font-display text-3xl font-light mb-2">What's your <em>level</em>?</h1>
            <p className="text-sm text-muted">Help learners find the right teacher for their level.</p>
          </div>
          {teachSkills.length === 0 ? (
            <p className="text-sm text-muted">No teaching skills selected — skip to continue.</p>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              {teachSkills.map(sid => {
                const skill = SKILLS.find(s => s.id === sid)
                if (!skill) return null
                const currentLevel = levels[sid] || 0
                return (
                  <div key={sid} className="rounded-2xl p-4"
                    style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{skill.icon}</span>
                      <span className="text-sm font-medium">{skill.name}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {LEVELS.map((level, i) => (
                        <button key={level} onClick={() => setLevels(prev => ({ ...prev, [sid]: i + 1 }))}
                          className="py-2 rounded-xl text-xs font-medium transition-all"
                          style={{
                            background: currentLevel === i + 1 ? `${LEVEL_COLORS[i]}20` : '#242018',
                            border: `1px solid ${currentLevel === i + 1 ? LEVEL_COLORS[i] : 'rgba(245,237,216,0.06)'}`,
                            color: currentLevel === i + 1 ? LEVEL_COLORS[i] : '#9a8f82'
                          }}>
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="py-4">
            <button onClick={finish} disabled={loading}
              className="w-full py-4 rounded-2xl text-white font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
              {loading ? 'Setting up your profile…' : "Let's go! ✦"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
