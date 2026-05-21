'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const SKILLS = [
  { id: 'python',          name: 'Python',           cat: 'Tech',      color: '#3B82F6' },
  { id: 'javascript',      name: 'JavaScript',       cat: 'Tech',      color: '#F59E0B' },
  { id: 'data-science',    name: 'Data Science',     cat: 'Tech',      color: '#8B5CF6' },
  { id: 'azure-devops',    name: 'Azure DevOps',     cat: 'Tech',      color: '#0EA5E9' },
  { id: 'excel',           name: 'Excel',            cat: 'Finance',   color: '#10B981' },
  { id: 'power-bi',        name: 'Power BI',         cat: 'Finance',   color: '#F59E0B' },
  { id: 'marketing',       name: 'Marketing',        cat: 'Business',  color: '#EC4899' },
  { id: 'project-mgmt',    name: 'Project Mgmt',     cat: 'Business',  color: '#6366F1' },
  { id: 'public-speaking', name: 'Public Speaking',  cat: 'Business',  color: '#F97316' },
  { id: 'french',          name: 'French',           cat: 'Language',  color: '#3B82F6' },
  { id: 'romanian',        name: 'Romanian',         cat: 'Language',  color: '#EF4444' },
  { id: 'dutch',           name: 'Dutch',            cat: 'Language',  color: '#F59E0B' },
  { id: 'spanish',         name: 'Spanish',          cat: 'Language',  color: '#EF4444' },
  { id: 'arabic',          name: 'Arabic',           cat: 'Language',  color: '#10B981' },
  { id: 'italian',         name: 'Italian',          cat: 'Language',  color: '#10B981' },
  { id: 'german',          name: 'German',           cat: 'Language',  color: '#6B7280' },
  { id: 'guitar',          name: 'Guitar',           cat: 'Music',     color: '#F97316' },
  { id: 'piano',           name: 'Piano',            cat: 'Music',     color: '#8B5CF6' },
  { id: 'figma',           name: 'Design',           cat: 'Creative',  color: '#EC4899' },
  { id: 'photography',     name: 'Photography',      cat: 'Creative',  color: '#6366F1' },
  { id: 'writing',         name: 'Writing',          cat: 'Creative',  color: '#14B8A6' },
  { id: 'cooking',         name: 'Cooking',          cat: 'Lifestyle', color: '#F97316' },
  { id: 'yoga',            name: 'Yoga',             cat: 'Lifestyle', color: '#10B981' },
  { id: 'chess',           name: 'Chess',            cat: 'Lifestyle', color: '#6B7280' },
]

const CATS = ['All', 'Tech', 'Language', 'Business', 'Finance', 'Music', 'Creative', 'Lifestyle']
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

type Step = 'learn' | 'teach' | 'levels'

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('learn')
  const [learnSkills, setLearnSkills] = useState<string[]>([])
  const [teachSkills, setTeachSkills] = useState<string[]>([])
  const [levels, setLevels] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')
  const router = useRouter()

  const filtered = SKILLS.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = cat === 'All' || s.cat === cat
    return matchSearch && matchCat
  })

  const toggle = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  }

  async function finish() {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase.from('profiles').update({
      learn_skills: learnSkills,
      teach_skills: teachSkills,
      skill_mirror_done: true,
      onboarding_complete: true,
      onboarding_step: 3
    }).eq('id', session.user.id)

    const allSlugs = Array.from(new Set([...teachSkills, ...learnSkills]))
    const { data: skillData } = await supabase.from('skills').select('id, slug').in('slug', allSlugs)
    const slugToId = Object.fromEntries((skillData || []).map(s => [s.slug, s.id]))

    const rows = [
      ...teachSkills.filter(s => slugToId[s]).map(s => ({
        user_id: session.user.id, skill_id: slugToId[s], role: 'teacher', proficiency: levels[s] || 2
      })),
      ...learnSkills.filter(s => slugToId[s]).map(s => ({
        user_id: session.user.id, skill_id: slugToId[s], role: 'learner', proficiency: 1
      }))
    ]

    if (rows.length > 0) {
      await supabase.from('user_skills').upsert(rows, { onConflict: 'user_id,skill_id,role' })
    }

    await supabase.rpc('award_badge', { p_user_id: session.user.id, p_badge_id: 'skill_mirror' })
    await supabase.rpc('update_streak', { p_user_id: session.user.id })
    router.push('/home?welcome=1')
  }

  const stepNum = step === 'learn' ? 1 : step === 'teach' ? 2 : 3

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0c0906', color: '#F5EDD8' }}>

      {/* Top progress */}
      <div className="px-5 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2 mb-5">
          {[1,2,3].map(n => (
            <div key={n} className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{ background: n <= stepNum ? 'linear-gradient(135deg, #F0A830, #D03878)' : 'rgba(245,237,216,0.08)' }} />
          ))}
        </div>

        {step === 'learn' && (
          <div>
            <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: '#9a8f82' }}>Step 1 of 3</div>
            <h1 className="font-display text-3xl font-light leading-tight mb-1">What do you want to <em>learn?</em></h1>
            <p className="text-sm" style={{ color: '#9a8f82' }}>Select all that interest you</p>
          </div>
        )}
        {step === 'teach' && (
          <div>
            <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: '#9a8f82' }}>Step 2 of 3</div>
            <h1 className="font-display text-3xl font-light leading-tight mb-1">What can you <em>teach?</em></h1>
            <p className="text-sm" style={{ color: '#9a8f82' }}>Earn 1 TC for every hour you teach</p>
          </div>
        )}
        {step === 'levels' && (
          <div>
            <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: '#9a8f82' }}>Step 3 of 3</div>
            <h1 className="font-display text-3xl font-light leading-tight mb-1">Your <em>expertise level</em></h1>
            <p className="text-sm" style={{ color: '#9a8f82' }}>Help learners find the right match</p>
          </div>
        )}
      </div>

      {step !== 'levels' && (
        <div className="px-5 flex-shrink-0">
          {/* Search */}
          <div className="relative mb-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search skills…"
              style={{ paddingLeft: '36px', fontSize: '13px' }}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#9a8f82' }}>⌕</span>
          </div>
          {/* Category pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-3 mb-1" style={{ scrollbarWidth: 'none' }}>
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0"
                style={{
                  background: cat === c ? 'linear-gradient(135deg, #F0A830, #D03878)' : 'rgba(245,237,216,0.06)',
                  color: cat === c ? '#fff' : '#9a8f82',
                  border: cat === c ? 'none' : '1px solid rgba(245,237,216,0.06)'
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Skill grid */}
      {step !== 'levels' && (
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          <div className="flex flex-wrap gap-2 pb-2">
            {filtered.map(skill => {
              const list = step === 'learn' ? learnSkills : teachSkills
              const selected = list.includes(skill.id)
              return (
                <button
                  key={skill.id}
                  onClick={() => step === 'learn'
                    ? toggle(skill.id, learnSkills, setLearnSkills)
                    : toggle(skill.id, teachSkills, setTeachSkills)
                  }
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: selected ? `${skill.color}18` : 'rgba(245,237,216,0.04)',
                    border: `1.5px solid ${selected ? skill.color : 'rgba(245,237,216,0.08)'}`,
                    color: selected ? skill.color : '#9a8f82',
                    transform: selected ? 'scale(1.02)' : 'scale(1)'
                  }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: skill.color }} />
                  {skill.name}
                  {selected && <span className="text-xs ml-0.5">✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Levels step */}
      {step === 'levels' && (
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {teachSkills.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm" style={{ color: '#9a8f82' }}>No teaching skills — tap continue to finish</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teachSkills.map(sid => {
                const skill = SKILLS.find(s => s.id === sid)
                if (!skill) return null
                const current = levels[sid] || 0
                return (
                  <div key={sid} className="rounded-2xl p-4"
                    style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.06)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full" style={{ background: skill.color }} />
                      <span className="text-sm font-medium">{skill.name}</span>
                    </div>
                    <div className="flex gap-2">
                      {LEVELS.map((label, i) => (
                        <button key={label} onClick={() => setLevels(prev => ({ ...prev, [sid]: i + 1 }))}
                          className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                          style={{
                            background: current === i + 1 ? `${skill.color}20` : 'rgba(245,237,216,0.04)',
                            border: `1.5px solid ${current === i + 1 ? skill.color : 'rgba(245,237,216,0.06)'}`,
                            color: current === i + 1 ? skill.color : '#9a8f82'
                          }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(245,237,216,0.05)' }}>
        {step === 'learn' && (
          <div className="space-y-2">
            <button onClick={() => { setSearch(''); setCat('All'); setStep('teach') }}
              disabled={learnSkills.length === 0}
              className="w-full py-3.5 rounded-2xl text-white text-sm font-medium disabled:opacity-25 transition-all"
              style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
              Continue · {learnSkills.length} selected →
            </button>
          </div>
        )}
        {step === 'teach' && (
          <div className="space-y-2">
            <button onClick={() => { setSearch(''); setCat('All'); setStep('levels') }}
              disabled={teachSkills.length === 0}
              className="w-full py-3.5 rounded-2xl text-white text-sm font-medium disabled:opacity-25"
              style={{ background: 'linear-gradient(135deg, #1ED8A0, #185FA5)' }}>
              Continue · {teachSkills.length} selected →
            </button>
            <button onClick={() => { setSearch(''); setCat('All'); setStep('levels') }}
              className="w-full py-2.5 rounded-2xl text-xs text-center" style={{ color: '#9a8f82' }}>
              I only want to learn — skip
            </button>
          </div>
        )}
        {step === 'levels' && (
          <div className="space-y-2">
            <button onClick={finish} disabled={loading}
              className="w-full py-3.5 rounded-2xl text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
              {loading ? 'Setting up…' : "Let's go ✦"}
            </button>
            <button onClick={() => setStep('teach')} className="w-full py-2.5 rounded-2xl text-xs text-center" style={{ color: '#9a8f82' }}>← Back</button>
          </div>
        )}
      </div>
    </div>
  )
}
