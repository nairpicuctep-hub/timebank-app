'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/* -------------------------------------------------------------------------
   Privacy & data settings (/settings/privacy)
   GDPR: consent must be as easy to withdraw as to give. Users can:
   • toggle research/data-insights consent (writes via update_consent RPC + logs)
   • reopen cookie preferences
   • request data export / account deletion (kicks off the flow)
   ------------------------------------------------------------------------- */

export default function PrivacySettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles')
        .select('consent_research, consent_marketing, consent_research_at').eq('id', session.user.id).single()
      setProfile(data)
    }
    load()
  }, [router])

  async function setConsent(type: 'research' | 'marketing', granted: boolean) {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('update_consent', { p_consent: type, p_granted: granted })
    if (!error) setProfile((p: any) => ({ ...p, [`consent_${type}`]: granted }))
    setSaving(false)
  }

  async function exportMyData() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const uid = session.user.id
    const [profile, skills, sessions, ledger] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('user_skills').select('*, skills(name)').eq('user_id', uid),
      supabase.from('sessions').select('*').or(`teacher_id.eq.${uid},learner_id.eq.${uid}`),
      supabase.from('tc_ledger').select('*').eq('user_id', uid),
    ])
    const bundle = { profile: profile.data, skills: skills.data, sessions: sessions.data, ledger: ledger.data, exported_at: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'my-timebank-data.json'; a.click()
    URL.revokeObjectURL(url)
  }

  if (!profile) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm font-mono text-muted">Loading…</p></div>

  return (
    <div className="min-h-screen pb-12 px-5 pt-12 max-w-lg mx-auto">
      <button onClick={() => router.push('/profile')} className="text-sm text-muted">← Back</button>
      <h1 className="font-display font-semibold text-[26px] text-ink mt-3 mb-1">Privacy &amp; data</h1>
      <p className="text-sm text-muted mb-5">You control your data. We never sell personal data — only anonymized, aggregated insights.</p>

      <div className="flex flex-col gap-3">
        <Toggle
          title="Contribute to community insights"
          desc="Include my activity in anonymized, aggregated research about how skills move through communities."
          checked={!!profile.consent_research}
          onChange={v => setConsent('research', v)}
          disabled={saving}
        />
        <Toggle
          title="Marketing updates"
          desc="Occasional product news and tips. Off by default."
          checked={!!profile.consent_marketing}
          onChange={v => setConsent('marketing', v)}
          disabled={saving}
        />

        <button onClick={() => window.dispatchEvent(new Event('open-cookie-prefs'))} className="glass p-4 flex items-center gap-3 text-left">
          <span className="text-xl">🍪</span>
          <div className="flex-1"><div className="text-sm font-semibold text-ink">Cookie preferences</div><div className="text-xs text-muted">Review or change your cookie choices</div></div>
          <span className="text-muted">→</span>
        </button>

        <button onClick={exportMyData} className="glass p-4 flex items-center gap-3 text-left">
          <span className="text-xl">📥</span>
          <div className="flex-1"><div className="text-sm font-semibold text-ink">Download my data</div><div className="text-xs text-muted">Export everything we hold about you (JSON)</div></div>
          <span className="text-muted">→</span>
        </button>

        <a href="mailto:privacy@timebank.academy?subject=Account%20deletion%20request" className="glass p-4 flex items-center gap-3 text-left">
          <span className="text-xl">🗑️</span>
          <div className="flex-1"><div className="text-sm font-semibold text-ink">Delete my account</div><div className="text-xs text-muted">Request deletion — history is anonymized, not sold</div></div>
          <span className="text-muted">→</span>
        </a>

        <div className="flex gap-4 justify-center mt-2">
          <a href="/privacy" className="text-xs grad-text font-medium">Privacy Policy</a>
          <a href="/terms" className="text-xs grad-text font-medium">Terms of Service</a>
        </div>
      </div>
    </div>
  )
}

function Toggle({ title, desc, checked, onChange, disabled }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="glass p-4 flex items-start gap-3">
      <div className="flex-1">
        <div className="text-sm font-semibold text-ink">{title}</div>
        <div className="text-xs text-muted mt-0.5">{desc}</div>
      </div>
      <button onClick={() => onChange(!checked)} disabled={disabled}
        className="flex-shrink-0 rounded-pill transition-all" style={{ width: 44, height: 26, background: checked ? 'var(--grad)' : 'rgba(120,70,40,0.15)', position: 'relative' }}>
        <span style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  )
}
