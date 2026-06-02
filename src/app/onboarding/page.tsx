'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SkillPicker from '@/components/SkillPicker'

/* -------------------------------------------------------------------------
   Onboarding (clean rebuild + dynamic skills)
   4 steps: Skill Mirror → Learn → Proficiency → Welcome
   • Skill Mirror keeps the warm prompts AND uses SkillPicker (unlimited,
     searchable, add-your-own) for what you can teach.
   • Learn step uses SkillPicker too.
   • Captures the user's browser language onto the profile.
   ------------------------------------------------------------------------- */

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

const MIRROR_QS = [
  { key: 'topic',       q: 'What could you talk about for an hour without notes?', ph: 'e.g. how I learned to cook proper risotto' },
  { key: 'friends_ask', q: 'What do friends always ask you for help with?',         ph: 'e.g. fixing their CV, guitar chords…' },
  { key: 'flow',        q: 'What were you doing last time you lost track of time?',  ph: 'e.g. editing photos, debugging code' },
]

type Step = 'mirror' | 'learn' | 'levels' | 'welcome'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('mirror')

  const [mirror, setMirror] = useState<Record<string, string>>({})
  const [teachSkills, setTeachSkills] = useState<string[]>([])
  const [learnSkills, setLearnSkills] = useState<string[]>([])
  const [levels, setLevels] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  // detect browser language → short code (en/nl/fr/ro/…); default en
  const detectedLang = typeof navigator !== 'undefined'
    ? (navigator.language || 'en').slice(0, 2).toLowerCase()
    : 'en'

  const stepNum = step === 'mirror' ? 1 : step === 'learn' ? 2 : step === 'levels' ? 3 : 4

  async function finish() {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }
    const uid = session.user.id

    await supabase.from('profiles').update({
      teach_skills: teachSkills,
      learn_skills: learnSkills,
      language: detectedLang,
      skill_mirror_done: true,
      onboarding_complete: true,
      onboarding_step: 4,
    }).eq('id', uid)

    await supabase.from('skill_mirror_responses').upsert({
      user_id: uid,
      topic: mirror.topic || null,
      friends_ask: mirror.friends_ask || null,
      flow_activity: mirror.flow || null,
    }, { onConflict: 'user_id' })

    // normalised user_skills (resolve slug -> id)
    const slugs = Array.from(new Set([...teachSkills, ...learnSkills]))
    if (slugs.length) {
      const { data: rows } = await supabase.from('skills').select('id, slug').in('slug', slugs)
      const idBySlug = Object.fromEntries((rows || []).map(r => [r.slug, r.id]))
      const records = [
        ...teachSkills.filter(s => idBySlug[s]).map(s => ({ user_id: uid, skill_id: idBySlug[s], role: 'teacher', proficiency: levels[s] || 2 })),
        ...learnSkills.filter(s => idBySlug[s]).map(s => ({ user_id: uid, skill_id: idBySlug[s], role: 'learner', proficiency: 1 })),
      ]
      if (records.length) {
        await supabase.from('user_skills').delete().eq('user_id', uid)
        await supabase.from('user_skills').insert(records)
      }
    }

    await supabase.rpc('award_badge', { p_user_id: uid, p_badge_id: 'skill_mirror' })
    await supabase.rpc('update_streak', { p_user_id: uid })

    setStep('welcome'); setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* progress + headings */}
      {step !== 'welcome' && (
        <div className="px-5 pt-12 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex-1 h-1.5 rounded-pill transition-all duration-500"
                style={{ background: n <= stepNum ? 'var(--grad)' : 'rgba(120,70,40,0.10)' }} />
            ))}
          </div>
          {step === 'mirror' && (
            <div className="rise">
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted mb-2">The Skill Mirror · Step 1</div>
              <h1 className="font-display font-semibold text-[28px] leading-[1.1] text-ink">
                Everyone&apos;s an expert<br/>in <span className="grad-text">something.</span>
              </h1>
              <p className="text-sm text-muted mt-2">Answer a few questions, then add what you can teach.</p>
            </div>
          )}
          {step === 'learn' && (
            <div className="rise">
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted mb-2">Step 2</div>
              <h1 className="font-display font-semibold text-[28px] leading-[1.1] text-ink">
                What do you want to <span className="grad-text">learn?</span>
              </h1>
              <p className="text-sm text-muted mt-2">Search anything. Can&apos;t find it? Add it.</p>
            </div>
          )}
          {step === 'levels' && (
            <div className="rise">
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted mb-2">Step 3</div>
              <h1 className="font-display font-semibold text-[28px] leading-[1.1] text-ink">
                How good are you, <span className="grad-text">really?</span>
              </h1>
              <p className="text-sm text-muted mt-2">Helps us match you with the right learners.</p>
            </div>
          )}
        </div>
      )}

      {/* STEP 1: MIRROR + teach SkillPicker */}
      {step === 'mirror' && (
        <div className="flex-1 overflow-y-auto px-5 pb-2 no-scrollbar">
          <div className="flex flex-col gap-3">
            {MIRROR_QS.map((m, i) => (
              <div key={m.key} className={`glass p-4 rise-${i + 1}`}>
                <label className="block text-sm font-semibold text-ink mb-2">{m.q}</label>
                <textarea rows={2} value={mirror[m.key] || ''} placeholder={m.ph}
                  onChange={e => setMirror(p => ({ ...p, [m.key]: e.target.value }))} style={{ resize: 'none' }} />
              </div>
            ))}
            <div className="glass p-4 rise-4">
              <div className="text-sm font-semibold text-ink mb-1">✨ What can you teach?</div>
              <p className="text-xs text-muted mb-3">Search or add anything — a language, a craft, a niche skill.</p>
              <SkillPicker selected={teachSkills} onChange={setTeachSkills} language={detectedLang} accent="grad" />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: LEARN SkillPicker */}
      {step === 'learn' && (
        <div className="flex-1 overflow-y-auto px-5 pb-2 no-scrollbar">
          <div className="glass p-4">
            <SkillPicker selected={learnSkills} onChange={setLearnSkills} language={detectedLang} accent="mint" />
          </div>
        </div>
      )}

      {/* STEP 3: PROFICIENCY */}
      {step === 'levels' && (
        <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
          {teachSkills.length === 0 ? (
            <div className="glass p-6 text-center">
              <p className="text-sm text-muted">No teaching skills — tap finish to continue. You can add some anytime.</p>
            </div>
          ) : (
            <TeachLevels teachSkills={teachSkills} levels={levels} setLevels={setLevels} />
          )}
        </div>
      )}

      {/* STEP 4: WELCOME */}
      {step === 'welcome' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="grad-card tc-pop" style={{ width: 132, height: 132, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
            <div className="blob blob-1" /><div className="blob blob-2" />
            <div style={{ position: 'relative', textAlign: 'center' }}>
              <div className="font-display font-bold" style={{ fontSize: 46, lineHeight: 1, color: '#fff' }}>3</div>
              <div className="font-mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.9)' }}>TC</div>
            </div>
          </div>
          <h1 className="font-display font-semibold text-[30px] leading-tight text-ink mb-2 rise-1">
            Welcome, <span className="grad-text">Time Seed.</span>
          </h1>
          <p className="text-sm text-muted mb-1 rise-2">You&apos;ve got <b className="text-ink">3 Time Credits</b> to start learning.</p>
          <p className="text-sm text-muted mb-8 rise-2">Teach an hour, earn one back. Time is your currency.</p>
          <button onClick={() => router.push('/home?welcome=1')} className="btn-grad w-full py-4 text-sm rise-3" style={{ maxWidth: 320 }}>
            Explore TimeBank →
          </button>
        </div>
      )}

      {/* BOTTOM CTA */}
      {step !== 'welcome' && (
        <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--line-2)' }}>
          {step === 'mirror' && (
            <button onClick={() => setStep('learn')} disabled={teachSkills.length === 0} className="btn-grad w-full py-3.5 text-sm">
              {teachSkills.length === 0 ? 'Add at least one skill to teach' : `Continue · ${teachSkills.length} to teach →`}
            </button>
          )}
          {step === 'learn' && (
            <button onClick={() => setStep('levels')} disabled={learnSkills.length === 0} className="btn-grad w-full py-3.5 text-sm">
              Continue · {learnSkills.length} to learn →
            </button>
          )}
          {step === 'levels' && (
            <div className="flex flex-col gap-2">
              <button onClick={finish} disabled={loading} className="btn-grad w-full py-3.5 text-sm">
                {loading ? 'Setting up…' : 'Finish ✦'}
              </button>
              <button onClick={() => setStep('learn')} className="w-full py-2.5 text-xs text-muted">← Back</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* proficiency sub-component — resolves slug names for display */
function TeachLevels({ teachSkills, levels, setLevels }: {
  teachSkills: string[]; levels: Record<string, number>; setLevels: (v: any) => void
}) {
  const [names, setNames] = useState<Record<string, { name: string; icon: string }>>({})
  useState(() => {
    const supabase = createClient()
    supabase.from('skills').select('slug, name, icon').in('slug', teachSkills).then(({ data }) => {
      setNames(Object.fromEntries((data || []).map((s: any) => [s.slug, { name: s.name, icon: s.icon }])))
    })
  })
  const LV = ['Beginner', 'Intermediate', 'Advanced', 'Expert']
  return (
    <div className="flex flex-col gap-3">
      {teachSkills.map(slug => {
        const meta = names[slug] || { name: slug, icon: '✨' }
        const cur = levels[slug] || 0
        return (
          <div key={slug} className="glass p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{meta.icon}</span>
              <span className="text-sm font-semibold text-ink">{meta.name}</span>
            </div>
            <div className="flex gap-2">
              {LV.map((label, i) => (
                <button key={label} onClick={() => setLevels((p: any) => ({ ...p, [slug]: i + 1 }))}
                  className="flex-1 py-2 rounded-btn text-xs font-medium transition-all"
                  style={cur === i + 1
                    ? { background: 'var(--grad)', color: '#fff', border: '1.5px solid transparent' }
                    : { background: 'rgba(255,255,255,0.6)', color: 'var(--muted)', border: '1.5px solid var(--line)' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
