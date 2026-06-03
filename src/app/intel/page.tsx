'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/* -------------------------------------------------------------------------
   Intel dashboard (/intel) — Phase C + D.
   Admin-gated investor/EU analytics built on the 0008 RPCs.
   Sections: Headline KPIs · Flywheel funnel · Skill supply/demand ·
             Geography · Growth · CSV export (Phase D).
   Architected around the Data Strategy's valuable metrics, not vanity counts.
   ------------------------------------------------------------------------- */

export default function IntelPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [ov, setOv] = useState<any>(null)
  const [funnel, setFunnel] = useState<any>(null)
  const [demand, setDemand] = useState<any[]>([])
  const [geo, setGeo] = useState<any[]>([])
  const [signups, setSignups] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
      if (!me?.is_admin) { setAllowed(false); return }
      setAllowed(true)

      const [o, f, d, g, s] = await Promise.all([
        supabase.rpc('intel_overview'),
        supabase.rpc('intel_funnel'),
        supabase.rpc('intel_skill_demand'),
        supabase.rpc('intel_geography'),
        supabase.rpc('intel_signups_by_day'),
      ])
      setOv(o.data); setFunnel(f.data)
      setDemand(d.data || []); setGeo(g.data || []); setSignups(s.data || [])
    }
    init()
  }, [router])

  function exportCSV(name: string, rows: any[]) {
    if (!rows.length) { alert('No data to export yet.'); return }
    const cols = Object.keys(rows[0])
    const csv = [cols.join(','), ...rows.map(r => cols.map(c => JSON.stringify(r[c] ?? '')).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `timebank-${name}-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (allowed === null) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm font-mono text-muted">Loading intel…</p></div>
  if (allowed === false) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
      <div className="text-4xl mb-3">🔒</div>
      <h1 className="font-display font-semibold text-xl text-ink mb-1">Admins only</h1>
      <button onClick={() => router.push('/home')} className="btn-grad px-5 py-3 text-sm mt-4">Back to home</button>
    </div>
  )

  const conv = ov && ov.learners > 0 ? Math.round(100 * ov.both_sides / ov.learners) : 0
  const liquidityRatio = ov && ov.learners > 0 ? (ov.teachers / ov.learners).toFixed(2) : '—'

  const funnelSteps = funnel ? [
    { label: 'Signed up', v: funnel.signed_up },
    { label: 'Onboarded', v: funnel.onboarded },
    { label: 'Set skills', v: funnel.set_skills },
    { label: 'Set availability', v: funnel.set_avail },
    { label: 'Booked a session', v: funnel.booked },
    { label: 'Completed a session', v: funnel.completed },
    { label: 'Became a teacher', v: funnel.became_teacher },
  ] : []
  const funnelMax = Math.max(1, ...funnelSteps.map(s => s.v || 0))
  const signupMax = Math.max(1, ...signups.map(s => Number(s.signups) || 0))

  return (
    <div className="min-h-screen pb-12 px-5 pt-12 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display font-semibold text-[26px] text-ink">Intel</h1>
        <div className="flex gap-3">
          <button onClick={() => router.push('/admin')} className="text-xs text-muted">Admin</button>
          <button onClick={() => router.push('/home')} className="text-xs text-muted">← App</button>
        </div>
      </div>
      <p className="text-sm text-muted mb-5">Investor &amp; impact analytics. Aggregate only — exports exclude personal data.</p>

      {!ov ? <p className="text-sm text-muted">Crunching numbers…</p> : (
        <div className="flex flex-col gap-5">

          {/* HEADLINE KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: 'Total users', v: ov.total_users, i: '👥' },
              { l: 'Onboarded', v: ov.onboarded, i: '✓' },
              { l: 'Teachers', v: ov.teachers, i: '🎓' },
              { l: 'Learners', v: ov.learners, i: '📚' },
              { l: 'Liquidity (T/L)', v: liquidityRatio, i: '⚖️', hint: 'teachers ÷ learners — balance of the marketplace' },
              { l: 'Both-sides %', v: `${conv}%`, i: '🔁', hint: 'the flywheel: users who teach AND learn' },
              { l: 'Completion rate', v: `${ov.completion_rate}%`, i: '🏁' },
              { l: 'Countries', v: ov.countries, i: '🌍' },
            ].map(k => (
              <div key={k.l} className="glass p-4" title={k.hint || ''}>
                <div className="text-lg mb-1">{k.i}</div>
                <div className="font-display font-bold text-2xl text-ink">{k.v}</div>
                <div className="text-[11px] text-muted">{k.l}</div>
              </div>
            ))}
          </div>

          {/* ECONOMY STRIP */}
          <div className="glass p-4">
            <h3 className="font-display font-semibold text-base text-ink mb-3">TC economy</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><div className="font-display font-bold text-xl grad-text">{Number(ov.tc_available).toFixed(0)}</div><div className="text-[11px] text-muted">Available</div></div>
              <div><div className="font-display font-bold text-xl text-ink">{Number(ov.tc_escrowed).toFixed(0)}</div><div className="text-[11px] text-muted">In escrow</div></div>
              <div><div className="font-display font-bold text-xl text-ink">{Number(ov.tc_earned_lifetime).toFixed(0)}</div><div className="text-[11px] text-muted">Earned lifetime</div></div>
            </div>
          </div>

          {/* FLYWHEEL FUNNEL */}
          <div className="glass p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-base text-ink">Activation funnel</h3>
              <span className="text-[10px] font-mono text-faint">the flywheel</span>
            </div>
            <div className="flex flex-col gap-2">
              {funnelSteps.map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="text-xs w-36 flex-shrink-0 text-muted">{s.label}</div>
                  <div className="flex-1 h-6 rounded-pill overflow-hidden" style={{ background: 'rgba(120,70,40,0.06)' }}>
                    <div className="h-full rounded-pill flex items-center justify-end pr-2" style={{ width: `${Math.max(8, 100 * (s.v || 0) / funnelMax)}%`, background: 'var(--grad)' }}>
                      <span className="text-[11px] font-mono font-semibold text-white">{s.v || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SKILL SUPPLY / DEMAND */}
          <div className="glass p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-base text-ink">Skill demand vs supply</h3>
              <button onClick={() => exportCSV('skill-demand', demand)} className="text-[11px] font-medium grad-text">Export CSV ↓</button>
            </div>
            {demand.length === 0 ? <p className="text-xs text-muted">No skill data yet.</p> : (
              <div className="flex flex-col gap-2">
                <div className="flex text-[10px] font-mono uppercase tracking-widest text-faint">
                  <span className="flex-1">Skill</span><span className="w-16 text-right">Teach</span><span className="w-16 text-right">Learn</span><span className="w-16 text-right">Gap</span>
                </div>
                {demand.slice(0, 15).map((d, i) => (
                  <div key={i} className="flex items-center text-sm">
                    <span className="flex-1 truncate text-ink">{d.skill}</span>
                    <span className="w-16 text-right font-mono text-muted">{d.teachers}</span>
                    <span className="w-16 text-right font-mono text-muted">{d.learners}</span>
                    <span className="w-16 text-right font-mono font-semibold" style={{ color: Number(d.gap) > 0 ? 'var(--rose)' : 'var(--mint)' }}>
                      {Number(d.gap) > 0 ? `+${d.gap}` : d.gap}
                    </span>
                  </div>
                ))}
                <p className="text-[11px] text-muted mt-1">Positive gap = unmet demand (more learners than teachers) — your supply-acquisition targets.</p>
              </div>
            )}
          </div>

          {/* GEOGRAPHY */}
          <div className="glass p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-base text-ink">Geography</h3>
              <button onClick={() => exportCSV('geography', geo)} className="text-[11px] font-medium grad-text">Export CSV ↓</button>
            </div>
            {geo.length === 0 ? <p className="text-xs text-muted">No geographic data yet.</p> : (
              <div className="flex flex-col gap-1.5">
                {geo.slice(0, 12).map((g, i) => (
                  <div key={i} className="flex items-center text-sm">
                    <span className="flex-1 text-ink">{g.city || '—'} <span className="text-muted text-xs">{g.country_code}</span></span>
                    <span className="font-mono text-muted text-xs">{g.users} users · {g.teachers} teaching</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GROWTH */}
          <div className="glass p-4">
            <h3 className="font-display font-semibold text-base text-ink mb-3">Signups (30 days)</h3>
            {signups.length === 0 ? <p className="text-xs text-muted">No signups in the last 30 days.</p> : (
              <div className="flex items-end gap-1 h-24">
                {signups.map((s, i) => (
                  <div key={i} className="flex-1 rounded-t" title={`${s.day}: ${s.signups}`}
                    style={{ height: `${Math.max(6, 100 * Number(s.signups) / signupMax)}%`, background: 'var(--grad)', minWidth: 4 }} />
                ))}
              </div>
            )}
          </div>

          {/* EXPORT ALL */}
          <div className="glass p-4 flex items-center gap-3">
            <span className="text-xl">📦</span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-ink">Investor / partner export</div>
              <div className="text-xs text-muted">Aggregate, anonymized — no personal data included.</div>
            </div>
            <button onClick={() => { exportCSV('skill-demand', demand); exportCSV('geography', geo); exportCSV('signups', signups) }}
              className="btn-grad px-3 py-2 text-xs whitespace-nowrap">Export pack ↓</button>
          </div>

          <p className="text-[11px] text-muted text-center px-4">
            Insights become powerful with scale — these numbers tell the real story once you have an active community. Aggregate exports are GDPR-safe (no individual records, small cells suppressed in the public aggregate view).
          </p>
        </div>
      )}
    </div>
  )
}
