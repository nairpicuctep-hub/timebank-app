'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import SkillPicker from '@/components/SkillPicker'
import BottomNav from '@/components/layout/BottomNav'

// rich-text chunk renderers shared across steps
const grad = (chunks: ReactNode) => <span className="grad-text">{chunks}</span>
const bold = (chunks: ReactNode) => <b className="text-ink">{chunks}</b>

/* -------------------------------------------------------------------------
   Onboarding v3 — dynamic skills + Phase A data foundation.
   Steps: Skill Mirror → Learn → Proficiency → About You (geo/lang/consent) → Welcome
   • Geography: coarse (city + country), structured for analytics.
   • Language: detected + confirmable.
   • Demographics: clearly OPTIONAL (age band, gender) — never a blocker.
   • Research opt-in: unchecked by default, honest one-liner. This is the
     lawful gate that feeds the aggregate skill-graph asset.
   ------------------------------------------------------------------------- */

// mirror questions reference catalog keys (q + placeholder) rather than literals
const MIRROR_QS = [
  { key: 'topic',       q: 'mirrorQ1', ph: 'mirrorQ1Ph' },
  { key: 'friends_ask', q: 'mirrorQ2', ph: 'mirrorQ2Ph' },
  { key: 'flow',        q: 'mirrorQ3', ph: 'mirrorQ3Ph' },
]

const LANGS = [
  { code: 'en', label: 'English' }, { code: 'nl', label: 'Nederlands' },
  { code: 'fr', label: 'Français' }, { code: 'ro', label: 'Română' },
  { code: 'de', label: 'Deutsch' }, { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' }, { code: 'pt', label: 'Português' },
]
const AGE_BANDS = ['<18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+']
const GENDERS = [
  { val: 'female',     key: 'genderFemale' },
  { val: 'male',       key: 'genderMale' },
  { val: 'non-binary', key: 'genderNonBinary' },
  { val: 'prefer-not', key: 'genderPreferNot' },
] as const

type Step = 'mirror' | 'learn' | 'levels' | 'about' | 'welcome'

export default function OnboardingPage() {
  const router = useRouter()
  const t = useTranslations('onboarding')
  const tc = useTranslations('common')
  const [step, setStep] = useState<Step>('mirror')

  const [mirror, setMirror] = useState<Record<string, string>>({})
  const [teachSkills, setTeachSkills] = useState<string[]>([])
  const [learnSkills, setLearnSkills] = useState<string[]>([])
  const [levels, setLevels] = useState<Record<string, number>>({})

  // about-you
  const detected = typeof navigator !== 'undefined' ? (navigator.language || 'en').slice(0, 2).toLowerCase() : 'en'
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('BE')
  const [langs, setLangs] = useState<string[]>([detected])
  const [ageBand, setAgeBand] = useState('')
  const [gender, setGender] = useState('')
  const [researchOptIn, setResearchOptIn] = useState(false)

  const [loading, setLoading] = useState(false)

  const stepNum = step === 'mirror' ? 1 : step === 'learn' ? 2 : step === 'levels' ? 3 : 4
  const primaryLang = langs[0] || detected

  function toggleLang(code: string) {
    setLangs(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
  }

  async function finish() {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }
    const uid = session.user.id

    // profile: skills, geo, language, optional demographics
    await supabase.from('profiles').update({
      teach_skills: teachSkills,
      learn_skills: learnSkills,
      language: primaryLang,
      languages_spoken: langs,
      city: city || null,
      country_code: country || null,
      age_band: ageBand || null,
      gender: gender || null,
      skill_mirror_done: true,
      onboarding_complete: true,
      onboarding_step: 5,
    }).eq('id', uid)

    // skill mirror responses
    await supabase.from('skill_mirror_responses').upsert({
      user_id: uid,
      topic: mirror.topic || null,
      friends_ask: mirror.friends_ask || null,
      flow_activity: mirror.flow || null,
    }, { onConflict: 'user_id' })

    // normalised user_skills
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

    // consent (logged via RPC) — research opt-in is the lawful aggregate gate
    await supabase.rpc('update_consent', { p_consent: 'research', p_granted: researchOptIn })

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
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="flex-1 h-1.5 rounded-pill transition-all duration-500"
                style={{ background: n <= stepNum ? 'var(--grad)' : 'rgba(120,70,40,0.10)' }} />
            ))}
          </div>
          {step === 'mirror' && (
            <div className="rise">
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted mb-2">{t('step1Label')}</div>
              <h1 className="font-display font-semibold text-[28px] leading-[1.1] text-ink">{t.rich('step1Title', { grad })}</h1>
              <p className="text-sm text-muted mt-2">{t('step1Subtitle')}</p>
            </div>
          )}
          {step === 'learn' && (
            <div className="rise">
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted mb-2">{t('step2Label')}</div>
              <h1 className="font-display font-semibold text-[28px] leading-[1.1] text-ink">{t.rich('learnTitle', { grad })}</h1>
              <p className="text-sm text-muted mt-2">{t('learnSubtitle')}</p>
            </div>
          )}
          {step === 'levels' && (
            <div className="rise">
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted mb-2">{t('step3Label')}</div>
              <h1 className="font-display font-semibold text-[28px] leading-[1.1] text-ink">{t.rich('proficiencyTitle', { grad })}</h1>
              <p className="text-sm text-muted mt-2">{t('proficiencySubtitle')}</p>
            </div>
          )}
          {step === 'about' && (
            <div className="rise">
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted mb-2">{t('step4Label')}</div>
              <h1 className="font-display font-semibold text-[28px] leading-[1.1] text-ink">{t.rich('aboutTitle', { grad })}</h1>
              <p className="text-sm text-muted mt-2">{t('aboutSubtitle')}</p>
            </div>
          )}
        </div>
      )}

      {/* STEP 1: MIRROR + teach picker */}
      {step === 'mirror' && (
        <div className="flex-1 overflow-y-auto px-5 pb-2 no-scrollbar">
          <div className="flex flex-col gap-3">
            {MIRROR_QS.map((m, i) => (
              <div key={m.key} className={`glass p-4 rise-${i + 1}`}>
                <label className="block text-sm font-semibold text-ink mb-2">{t(m.q)}</label>
                <textarea rows={2} value={mirror[m.key] || ''} placeholder={t(m.ph)}
                  onChange={e => setMirror(p => ({ ...p, [m.key]: e.target.value }))} style={{ resize: 'none' }} />
              </div>
            ))}
            <div className="glass p-4 rise-4">
              <div className="text-sm font-semibold text-ink mb-1">✨ {t('teachQuestion')}</div>
              <p className="text-xs text-muted mb-3">{t('teachSearchHint')}</p>
              <SkillPicker selected={teachSkills} onChange={setTeachSkills} language={primaryLang} accent="grad" />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: LEARN */}
      {step === 'learn' && (
        <div className="flex-1 overflow-y-auto px-5 pb-2 no-scrollbar">
          <div className="glass p-4">
            <SkillPicker selected={learnSkills} onChange={setLearnSkills} language={primaryLang} accent="mint" />
          </div>
        </div>
      )}

      {/* STEP 3: PROFICIENCY */}
      {step === 'levels' && (
        <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
          {teachSkills.length === 0 ? (
            <div className="glass p-6 text-center">
              <p className="text-sm text-muted">{t('noTeachSkills')}</p>
            </div>
          ) : (
            <TeachLevels teachSkills={teachSkills} levels={levels} setLevels={setLevels} />
          )}
        </div>
      )}

      {/* STEP 4: ABOUT YOU + CONSENT */}
      {step === 'about' && (
        <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
          <div className="flex flex-col gap-3">
            {/* location */}
            <div className="glass p-4">
              <label className="block text-sm font-semibold text-ink mb-2">{t('locationLabel')}</label>
              <div className="flex gap-2">
                <input value={city} onChange={e => setCity(e.target.value)} placeholder={t('cityPlaceholder')} style={{ flex: 2 }} />
                <input value={country} onChange={e => setCountry(e.target.value.toUpperCase().slice(0, 2))} placeholder="BE" style={{ flex: 1, textAlign: 'center' }} maxLength={2} />
              </div>
              <p className="text-[11px] text-muted mt-2">{t('cityHint')}</p>
            </div>

            {/* languages */}
            <div className="glass p-4">
              <label className="block text-sm font-semibold text-ink mb-2">{t('languagesLabel')}</label>
              <div className="flex flex-wrap gap-2">
                {LANGS.map(l => {
                  const on = langs.includes(l.code)
                  return (
                    <button key={l.code} onClick={() => toggleLang(l.code)}
                      className="px-3 py-1.5 rounded-btn text-xs font-medium transition-all"
                      style={on ? { background: 'var(--grad)', color: '#fff', border: '1.5px solid transparent' }
                                 : { background: 'rgba(255,255,255,0.6)', color: 'var(--text)', border: '1.5px solid var(--line)' }}>
                      {l.label} {on && '✓'}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted mt-2">{t('languagesHint')}</p>
            </div>

            {/* optional demographics */}
            <div className="glass p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-ink">{t('optionalLabel')}</label>
                <span className="text-[10px] font-mono uppercase tracking-widest text-faint">{t('optionalBadge')}</span>
              </div>
              <p className="text-[11px] text-muted mb-3">{t('optionalHint')}</p>
              <div className="mb-3">
                <div className="text-xs text-muted mb-1.5">{t('ageLabel')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {AGE_BANDS.map(a => (
                    <button key={a} onClick={() => setAgeBand(ageBand === a ? '' : a)}
                      className="px-2.5 py-1 rounded-pill text-xs transition-all"
                      style={ageBand === a ? { background: 'var(--grad)', color: '#fff' } : { background: 'var(--cream-2)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted mb-1.5">{t('genderLabel')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {GENDERS.map(({ val, key }) => (
                    <button key={val} onClick={() => setGender(gender === val ? '' : val)}
                      className="px-2.5 py-1 rounded-pill text-xs transition-all"
                      style={gender === val ? { background: 'var(--grad)', color: '#fff' } : { background: 'var(--cream-2)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* research consent */}
            <div className="glass p-4">
              <button onClick={() => setResearchOptIn(v => !v)} className="flex items-start gap-3 text-left w-full">
                <div className="flex-shrink-0 mt-0.5 rounded-md flex items-center justify-center"
                  style={{ width: 22, height: 22, background: researchOptIn ? 'var(--grad)' : 'rgba(255,255,255,0.6)', border: researchOptIn ? '1.5px solid transparent' : '1.5px solid var(--line)' }}>
                  {researchOptIn && <span style={{ color: '#fff', fontSize: 13 }}>✓</span>}
                </div>
                <div>
                  <div className="text-sm font-medium text-ink">{t('consentLabel')}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {t.rich('consentBody', { b: (c: ReactNode) => <b>{c}</b> })}
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: WELCOME */}
      {step === 'welcome' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="grad-card tc-pop" style={{ width: 132, height: 132, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
            <div className="blob blob-1" /><div className="blob blob-2" />
            <div style={{ position: 'relative', textAlign: 'center' }}>
              <div className="font-display font-bold" style={{ fontSize: 46, lineHeight: 1, color: '#fff' }}>3</div>
              <div className="font-mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.9)' }}>TC</div>
            </div>
          </div>
          <h1 className="font-display font-semibold text-[30px] leading-tight text-ink mb-2 rise-1">{t.rich('welcomeTitle', { grad })}</h1>
          <p className="text-sm text-muted mb-1 rise-2">{t.rich('welcomeBalance', { amount: 3, b: bold })}</p>
          <p className="text-sm text-muted mb-8 rise-2">{t('welcomeBody')}</p>
          <button onClick={() => router.push('/home?welcome=1')} className="btn-grad w-full py-4 text-sm rise-3" style={{ maxWidth: 320 }}>{t('exploreCta')} →</button>
        </div>
      )}

      <BottomNav active="mirror" />

      {/* BOTTOM CTA */}
      {step !== 'welcome' && (
        <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--line-2)' }}>
          {step === 'mirror' && (
            <button onClick={() => setStep('learn')} disabled={teachSkills.length === 0} className="btn-grad w-full py-3.5 text-sm">
              {teachSkills.length === 0 ? t('ctaAddSkill') : `${t('ctaContinueTeach', { count: teachSkills.length })} →`}
            </button>
          )}
          {step === 'learn' && (
            <button onClick={() => setStep('levels')} disabled={learnSkills.length === 0} className="btn-grad w-full py-3.5 text-sm">
              {t('ctaContinueLearn', { count: learnSkills.length })} →
            </button>
          )}
          {step === 'levels' && (
            <div className="flex flex-col gap-2">
              <button onClick={() => setStep('about')} className="btn-grad w-full py-3.5 text-sm">{tc('continue')} →</button>
              <button onClick={() => setStep('learn')} className="w-full py-2.5 text-xs text-muted">← {tc('back')}</button>
            </div>
          )}
          {step === 'about' && (
            <div className="flex flex-col gap-2">
              <button onClick={finish} disabled={loading} className="btn-grad w-full py-3.5 text-sm">
                {loading ? t('settingUp') : `${t('finish')} ✦`}
              </button>
              <button onClick={() => setStep('levels')} className="w-full py-2.5 text-xs text-muted">← {tc('back')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TeachLevels({ teachSkills, levels, setLevels }: {
  teachSkills: string[]; levels: Record<string, number>; setLevels: (v: any) => void
}) {
  const t = useTranslations('onboarding')
  const [names, setNames] = useState<Record<string, { name: string; icon: string }>>({})
  useState(() => {
    const supabase = createClient()
    supabase.from('skills').select('slug, name, icon').in('slug', teachSkills).then(({ data }) => {
      setNames(Object.fromEntries((data || []).map((s: any) => [s.slug, { name: s.name, icon: s.icon }])))
    })
  })
  const LV = [t('profBeginner'), t('profIntermediate'), t('profAdvanced'), t('profExpert')]
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
                  style={cur === i + 1 ? { background: 'var(--grad)', color: '#fff', border: '1.5px solid transparent' }
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
