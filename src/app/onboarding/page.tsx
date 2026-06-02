'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/* -------------------------------------------------------------------------
   TimeBank Academy — Onboarding (clean rebuild)
   Light cream + Bricolage. 4 steps, fast, ends on the signature TC moment.
     1. Skill Mirror   — warm prompts that reveal what they can teach
     2. Learn          — what they want to learn
     3. Proficiency    — quick level on each teach skill
     4. Welcome        — 3 TC lands (animated), → home
   Availability + bio/photo are deferred to a later profile nudge so nothing
   blocks the magic moment.
   Wired to: profiles.{teach_skills,learn_skills,skill_mirror_done,onboarding_*},
             user_skills (role+proficiency), skill_mirror_responses,
             rpc award_badge('skill_mirror'), rpc update_streak.
   ------------------------------------------------------------------------- */

type SkillDef = { slug: string; name: string; icon: string; cat: string }

const SKILLS: SkillDef[] = [
  { slug: 'react', name: 'React', icon: '⚛️', cat: 'Tech' },
  { slug: 'javascript', name: 'JavaScript', icon: '🟨', cat: 'Tech' },
  { slug: 'python', name: 'Python', icon: '🐍', cat: 'Tech' },
  { slug: 'typescript', name: 'TypeScript', icon: '🔷', cat: 'Tech' },
  { slug: 'design', name: 'Design', icon: '🎨', cat: 'Creative' },
  { slug: 'figma', name: 'Figma', icon: '🖌️', cat: 'Creative' },
  { slug: 'photography', name: 'Photography', icon: '📷', cat: 'Creative' },
  { slug: 'writing', name: 'Writing', icon: '✍️', cat: 'Creative' },
  { slug: 'english', name: 'English', icon: '🇬🇧', cat: 'Language' },
  { slug: 'french', name: 'French', icon: '🇫🇷', cat: 'Language' },
  { slug: 'dutch', name: 'Dutch', icon: '🇳🇱', cat: 'Language' },
  { slug: 'spanish', name: 'Spanish', icon: '🇪🇸', cat: 'Language' },
  { slug: 'romanian', name: 'Romanian', icon: '🇷🇴', cat: 'Language' },
  { slug: 'business', name: 'Business', icon: '📊', cat: 'Business' },
  { slug: 'marketing', name: 'Marketing', icon: '📣', cat: 'Business' },
  { slug: 'public_speaking', name: 'Public Speaking', icon: '🎤', cat: 'Business' },
  { slug: 'finance', name: 'Finance', icon: '💰', cat: 'Finance' },
  { slug: 'investing', name: 'Investing', icon: '📈', cat: 'Finance' },
  { slug: 'guitar', name: 'Guitar', icon: '🎸', cat: 'Music' },
  { slug: 'piano', name: 'Piano', icon: '🎹', cat: 'Music' },
  { slug: 'singing', name: 'Singing', icon: '🎙️', cat: 'Music' },
  { slug: 'cooking', name: 'Cooking', icon: '🍳', cat: 'Lifestyle' },
  { slug: 'fitness', name: 'Fitness', icon: '🏋️', cat: 'Lifestyle' },
  { slug: 'yoga', name: 'Yoga', icon: '🧘', cat: 'Lifestyle' },
  { slug: 'chess', name: 'Chess', icon: '♟️', cat: 'Lifestyle' },
]

const CATS = ['All', 'Tech', 'Creative', 'Language', 'Business', 'Finance', 'Music', 'Lifestyle']
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

// Skill Mirror — the activation hook. Warm, human prompts (free text).
const MIRROR_QS = [
  { key: 'topic',        q: 'What could you talk about for an hour without notes?',  ph: 'e.g. how I learned to cook proper risotto' },
  { key: 'friends_ask',  q: 'What do friends always ask you for help with?',          ph: 'e.g. fixing their CV, guitar chords…' },
  { key: 'flow',         q: 'What were you doing last time you lost track of time?',   ph: 'e.g. editing photos, debugging code' },
]

type Step = 'mirror' | 'learn' | 'levels' | 'welcome'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('mirror')

  const [mirror, setMirror] = useState<Record<string, string>>({})
  const [teachSkills, setTeachSkills] = useState<string[]>([])
  const [learnSkills, setLearnSkills] = useState<string[]>([])
  const [levels, setLevels] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')
  const [loading, setLoading] = useState(false)

  const stepNum = step === 'mirror' ? 1 : step === 'learn' ? 2 : step === 'levels' ? 3 : 4

  const filtered = SKILLS.filter(s => {
    const ms = s.name.toLowerCase().includes(search.toLowerCase())
    const mc = cat === 'All' || s.cat === cat
    return ms && mc
  })

  const toggle = (slug: string, list: string[], set: (v: string[]) => void) =>
    set(list.includes(slug) ? list.filter(x => x !== slug) : [...list, slug])

  async function finish() {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }
    const uid = session.user.id

    // 1. profile arrays + onboarding state
    await supabase.from('profiles').update({
      teach_skills: teachSkills,
      learn_skills: learnSkills,
      skill_mirror_done: true,
      onboarding_complete: true,
      onboarding_step: 4,
    }).eq('id', uid)

    // 2. skill mirror free-text responses
    await supabase.from('skill_mirror_responses').upsert({
      user_id: uid,
      topic: mirror.topic || null,
      friends_ask: mirror.friends_ask || null,
      flow_activity: mirror.flow || null,
    }, { onConflict: 'user_id' })

    // 3. normalised user_skills (map slug -> id)
    const slugs = Array.from(new Set([...teachSkills, ...learnSkills]))
    if (slugs.length) {
      const { data: rows } = await supabase.from('skills').select('id, slug').in('slug', slugs)
      const idBySlug = Object.fromEntries((rows || []).map(r => [r.slug, r.id]))
      const records = [
        ...teachSkills.filter(s => idBySlug[s]).map(s => ({
          user_id: uid, skill_id: idBySlug[s], role: 'teacher', proficiency: levels[s] || 2,
        })),
        ...learnSkills.filter(s => idBySlug[s]).map(s => ({
          user_id: uid, skill_id: idBySlug[s], role: 'learner', proficiency: 1,
        })),
      ]
      if (records.length) {
        await supabase.from('user_skills').delete().eq('user_id', uid)
        await supabase.from('user_skills').insert(records)
      }
    }

    // 4. reward + streak
    await supabase.rpc('award_badge', { p_user_id: uid, p_badge_id: 'skill_mirror' })
    await supabase.rpc('update_streak', { p_user_id: uid })

    setStep('welcome')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* progress */}
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
              <p className="text-sm text-muted mt-2">Answer a few questions — we&apos;ll show you what you can teach.</p>
            </div>
          )}
          {step === 'learn' && (
            <div className="rise">
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted mb-2">Step 2</div>
              <h1 className="font-display font-semibold text-[28px] leading-[1.1] text-ink">
                What do you want to <span className="grad-text">learn?</span>
              </h1>
              <p className="text-sm text-muted mt-2">Pick anything that sparks your curiosity.</p>
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

      {/* ---- STEP 1: SKILL MIRROR ---- */}
      {step === 'mirror' && (
        <div className="flex-1 overflow-y-auto px-5 pb-2 no-scrollbar">
          <div className="flex flex-col gap-3">
            {MIRROR_QS.map((m, i) => (
              <div key={m.key} className={`glass p-4 rise-${i + 1}`}>
                <label className="block text-sm font-semibold text-ink mb-2">{m.q}</label>
                <textarea
                  rows={2}
                  value={mirror[m.key] || ''}
                  placeholder={m.ph}
                  onChange={e => setMirror(p => ({ ...p, [m.key]: e.target.value }))}
                  style={{ resize: 'none' }}
                />
              </div>
            ))}

            <div className="glass p-4 rise-4">
              <div className="text-sm font-semibold text-ink mb-1">
                ✨ Based on that, you could teach:
              </div>
              <p className="text-xs text-muted mb-3">Tap the ones that feel right — add more anytime.</p>
              <div className="flex flex-wrap gap-2">
                {SKILLS.slice(0, 12).map(s => {
                  const on = teachSkills.includes(s.slug)
                  return (
                    <button key={s.slug} onClick={() => toggle(s.slug, teachSkills, setTeachSkills)}
                      className="px-3 py-2 rounded-btn text-sm font-medium transition-all"
                      style={{
                        background: on ? 'var(--grad)' : 'rgba(255,255,255,0.6)',
                        color: on ? '#fff' : 'var(--text)',
                        border: on ? '1.5px solid transparent' : '1.5px solid var(--line)',
                        transform: on ? 'scale(1.03)' : 'scale(1)',
                      }}>
                      {s.icon} {s.name} {on && '✓'}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- STEP 2 & 3 share the skill grid for LEARN ---- */}
      {step === 'learn' && (
        <>
          <div className="px-5 flex-shrink-0">
            <div className="relative mb-3">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search skills…" style={{ paddingLeft: 38, fontSize: 13 }} />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">⌕</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
              {CATS.map(c => (
                <button key={c} onClick={() => setCat(c)}
                  className="pill flex-shrink-0"
                  style={c === cat ? { background: 'var(--grad)', color: '#fff', border: '1px solid transparent' } : {}}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-2 no-scrollbar">
            <div className="flex flex-wrap gap-2">
              {filtered.map(s => {
                const on = learnSkills.includes(s.slug)
                return (
                  <button key={s.slug} onClick={() => toggle(s.slug, learnSkills, setLearnSkills)}
                    className="px-3 py-2 rounded-btn text-sm font-medium transition-all"
                    style={{
                      background: on ? 'var(--grad)' : 'rgba(255,255,255,0.6)',
                      color: on ? '#fff' : 'var(--text)',
                      border: on ? '1.5px solid transparent' : '1.5px solid var(--line)',
                      transform: on ? 'scale(1.03)' : 'scale(1)',
                    }}>
                    {s.icon} {s.name} {on && '✓'}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ---- STEP 3: PROFICIENCY ---- */}
      {step === 'levels' && (
        <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
          {teachSkills.length === 0 ? (
            <div className="glass p-6 text-center">
              <p className="text-sm text-muted">No teaching skills yet — tap continue to finish. You can add some later.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {teachSkills.map(slug => {
                const s = SKILLS.find(x => x.slug === slug)
                if (!s) return null
                const cur = levels[slug] || 0
                return (
                  <div key={slug} className="glass p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{s.icon}</span>
                      <span className="text-sm font-semibold text-ink">{s.name}</span>
                    </div>
                    <div className="flex gap-2">
                      {LEVELS.map((label, i) => (
                        <button key={label} onClick={() => setLevels(p => ({ ...p, [slug]: i + 1 }))}
                          className="flex-1 py-2 rounded-btn text-xs font-medium transition-all"
                          style={{
                            background: cur === i + 1 ? 'var(--grad)' : 'rgba(255,255,255,0.6)',
                            color: cur === i + 1 ? '#fff' : 'var(--muted)',
                            border: cur === i + 1 ? '1.5px solid transparent' : '1.5px solid var(--line)',
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

      {/* ---- STEP 4: WELCOME — the signature moment ---- */}
      {step === 'welcome' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="grad-card tc-pop" style={{ width: 132, height: 132, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
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
          <button onClick={() => router.push('/home?welcome=1')}
            className="btn-grad w-full py-4 text-sm rise-3" style={{ maxWidth: 320 }}>
            Explore TimeBank →
          </button>
        </div>
      )}

      {/* ---- BOTTOM CTA ---- */}
      {step !== 'welcome' && (
        <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--line-2)' }}>
          {step === 'mirror' && (
            <button onClick={() => { setSearch(''); setCat('All'); setStep('learn') }}
              disabled={teachSkills.length === 0}
              className="btn-grad w-full py-3.5 text-sm">
              {teachSkills.length === 0 ? 'Pick at least one skill to teach' : `Continue · ${teachSkills.length} to teach →`}
            </button>
          )}
          {step === 'learn' && (
            <div className="flex flex-col gap-2">
              <button onClick={() => { setSearch(''); setCat('All'); setStep('levels') }}
                disabled={learnSkills.length === 0}
                className="btn-grad w-full py-3.5 text-sm">
                Continue · {learnSkills.length} to learn →
              </button>
            </div>
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
