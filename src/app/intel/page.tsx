'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/Feedback'

/* -------------------------------------------------------------------------
   Intel dashboard (/intel) — admin-gated.
   Two halves:
     • TRAFFIC — first-party, cookieless web/app analytics (our own GA):
       source + range toggles, live visitors, KPIs, daily chart, top pages,
       referrers, geography, tech. Built on the intel_traffic* RPCs.
     • PRODUCT — investor/impact analytics: KPIs, TC economy, activation
       funnel, skill demand, geography, growth, marketing-site funnel.
   Aggregate only — exports exclude personal data.
   ------------------------------------------------------------------------- */

type Site = 'all' | 'website' | 'app'

export default function IntelPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  // product
  const [ov, setOv] = useState<any>(null)
  const [funnel, setFunnel] = useState<any>(null)
  const [demand, setDemand] = useState<any[]>([])
  const [geo, setGeo] = useState<any[]>([])
  const [signups, setSignups] = useState<any[]>([])
  const [web, setWeb] = useState<any>(null)

  // traffic
  const [site, setSite] = useState<Site>('all')
  const [days, setDays] = useState<number>(30)
  const [traffic, setTraffic] = useState<any>(null)
  const [byDay, setByDay] = useState<any[]>([])
  const [topPages, setTopPages] = useState<any[]>([])
  const [refs, setRefs] = useState<any[]>([])
  const [geoT, setGeoT] = useState<any[]>([])
  const [tech, setTech] = useState<any>(null)
  const [live, setLive] = useState<number>(0)
  const [tLoading, setTLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
      if (!me?.is_admin) { setAllowed(false); return }
      setAllowed(true)

      const [o, f, d, g, s, w] = await Promise.all([
        supabase.rpc('intel_overview'),
        supabase.rpc('intel_funnel'),
        supabase.rpc('intel_skill_demand'),
        supabase.rpc('intel_geography'),
        supabase.rpc('intel_signups_by_day'),
        supabase.rpc('intel_website'),
      ])
      setOv(o.data); setFunnel(f.data)
      setDemand(d.data || []); setGeo(g.data || []); setSignups(s.data || [])
      setWeb(w.data)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!allowed) return
    const supabase = createClient()
    let cancelled = false

    async function loadTraffic() {
      setTLoading(true)
      const [t, bd, tp, rf, gt, tc, lv] = await Promise.all([
        supabase.rpc('intel_traffic', { p_days: days, p_site: site }),
        supabase.rpc('intel_traffic_by_day', { p_days: days, p_site: site }),
        supabase.rpc('intel_top_pages', { p_days: days, p_site: site }),
        supabase.rpc('intel_referrers', { p_days: days, p_site: site }),
        supabase.rpc('intel_geo_traffic', { p_days: days, p_site: site }),
        supabase.rpc('intel_tech', { p_days: days, p_site: site }),
        supabase.rpc('intel_live', { p_site: site }),
      ])
      if (cancelled) return
      setTraffic(t.data); setByDay(bd.data || []); setTopPages(tp.data || [])
      setRefs(rf.data || []); setGeoT(gt.data || []); setTech(tc.data); setLive(lv.data || 0)
      setTLoading(false)
    }
    loadTraffic()

    // light "realtime": refresh the live count every 30s
    const iv = setInterval(async () => {
      const { data } = await supabase.rpc('intel_live', { p_site: site })
      if (!cancelled) setLive(data || 0)
    }, 30000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [allowed, site, days])

  function exportCSV(name: string, rows: any[]) {
    if (!rows.length) { toast('No data to export yet.'); return }
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
  const dayMax = Math.max(1, ...byDay.map(d => Number(d.views) || 0))

  return (
    <div className="min-h-screen pb-12 px-5 pt-12 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display font-semibold text-[26px] text-ink">Intel</h1>
        <div className="flex gap-3">
          <button onClick={() => router.push('/admin')} className="text-xs text-muted">Admin</button>
          <button onClick={() => router.push('/home')} className="text-xs text-muted">← App</button>
        </div>
      </div>
      <p className="text-sm text-muted mb-5">Traffic &amp; product analytics. First-party and cookieless — aggregate only, exports exclude personal data.</p>

      {/* ===================== TRAFFIC ===================== */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-lg text-ink">Traffic</h2>
        <span className="inline-flex items-center gap-1.5 text-xs font-mono"
          style={{ color: live > 0 ? 'var(--mint)' : 'var(--faint)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: live > 0 ? 'var(--mint)' : 'var(--faint)', display: 'inline-block' }} />
          {live} online now
        </span>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1 p-1 rounded-pill glass">
          {(['all', 'website', 'app'] as Site[]).map(s => (
            <button key={s} onClick={() => setSite(s)}
              className="px-3 py-1.5 rounded-pill text-xs font-semibold capitalize transition-all"
              style={site === s ? { background: 'var(--grad)', color: '#fff' } : { color: 'var(--muted)' }}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-pill glass">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className="px-3 py-1.5 rounded-pill text-xs font-semibold transition-all"
              style={days === d ? { background: 'var(--grad)', color: '#fff' } : { color: 'var(--muted)' }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {tLoading && !traffic ? <p className="text-sm text-muted mb-6">Loading traffic…</p> : (
        <div className="flex flex-col gap-5 mb-8" style={{ opacity: tLoading ? 0.6 : 1, transition: 'opacity .2s' }}>

          {/* traffic KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { l: 'Page views', v: fmtNum(traffic?.pageviews), i: '👁️' },
              { l: 'Unique visitors', v: fmtNum(traffic?.visitors), i: '🧑' },
              { l: 'Sessions', v: fmtNum(traffic?.sessions), i: '🗂️' },
              { l: 'Avg. engaged', v: fmtDur(traffic?.avg_seconds), i: '⏱️' },
              { l: 'Views / session', v: traffic?.views_per_session ?? '—', i: '📄' },
              { l: 'Bounce rate', v: traffic ? `${traffic.bounce_rate}%` : '—', i: '↩️' },
            ].map(k => (
              <div key={k.l} className="glass p-4">
                <div className="text-lg mb-1">{k.i}</div>
                <div className="font-display font-bold text-2xl text-ink">{k.v}</div>
                <div className="text-[11px] text-muted">{k.l}</div>
              </div>
            ))}
          </div>

          {/* daily chart */}
          <div className="glass p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-base text-ink">Visitors by day</h3>
              <span className="text-[10px] font-mono text-faint">bars = page views · {days}d</span>
            </div>
            {byDay.length === 0 ? <p className="text-xs text-muted">No traffic in this period yet.</p> : (
              <div className="flex items-end gap-0.5 h-28">
                {byDay.map((d, i) => (
                  <div key={i} className="flex-1 rounded-t transition-all hover:opacity-80"
                    title={`${d.day}: ${d.views} views · ${d.visitors} visitors`}
                    style={{ height: `${Math.max(4, 100 * Number(d.views) / dayMax)}%`, background: 'var(--grad)', minWidth: 2 }} />
                ))}
              </div>
            )}
          </div>

          {/* top pages + referrers */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="glass p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-base text-ink">Top pages</h3>
                <button onClick={() => exportCSV('top-pages', topPages)} className="text-[11px] font-medium grad-text">CSV ↓</button>
              </div>
              {topPages.length === 0 ? <p className="text-xs text-muted">No data yet.</p> : (
                <div className="flex flex-col gap-1.5">
                  <div className="flex text-[10px] font-mono uppercase tracking-widest text-faint">
                    <span className="flex-1">Page</span><span className="w-12 text-right">Views</span><span className="w-12 text-right">Uniq</span><span className="w-14 text-right">Time</span>
                  </div>
                  {topPages.slice(0, 12).map((p, i) => (
                    <div key={i} className="flex items-center text-sm">
                      <span className="flex-1 truncate text-ink" title={p.page}>{p.page}</span>
                      <span className="w-12 text-right font-mono text-muted">{p.views}</span>
                      <span className="w-12 text-right font-mono text-muted">{p.visitors}</span>
                      <span className="w-14 text-right font-mono text-faint text-xs">{fmtDur(p.avg_seconds)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass p-4">
              <h3 className="font-display font-semibold text-base text-ink mb-3">Referrers</h3>
              {refs.length === 0 ? <p className="text-xs text-muted">Mostly direct traffic so far.</p> : (
                <Bars rows={refs.map((r: any) => ({ k: r.source || 'Direct', v: Number(r.views) }))} max={Math.max(1, ...refs.map((r: any) => Number(r.views)))} />
              )}
            </div>
          </div>

          {/* geography + tech */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="glass p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-base text-ink">Geography</h3>
                <button onClick={() => exportCSV('geo-traffic', geoT)} className="text-[11px] font-medium grad-text">CSV ↓</button>
              </div>
              {geoT.length === 0 ? <p className="text-xs text-muted">No data yet.</p> : (
                <div className="flex flex-col gap-1.5">
                  {geoT.slice(0, 12).map((g, i) => (
                    <div key={i} className="flex items-center text-sm">
                      <span className="flex-1 truncate text-ink">{flag(g.country)} {g.city || '—'} <span className="text-faint text-xs">{g.country}</span></span>
                      <span className="font-mono text-muted text-xs">{g.views} · {g.visitors} uniq</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass p-4">
              <h3 className="font-display font-semibold text-base text-ink mb-3">Tech &amp; language</h3>
              {!tech ? <p className="text-xs text-muted">No data yet.</p> : (
                <div className="flex flex-col gap-3">
                  <TechBlock title="Browser" rows={tech.browsers} />
                  <TechBlock title="OS" rows={tech.os} />
                  <TechBlock title="Device" rows={tech.devices} />
                  <TechBlock title="Language" rows={tech.languages} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== PRODUCT ===================== */}
      <h2 className="font-display font-semibold text-lg text-ink mb-3">Product &amp; impact</h2>
      {!ov ? <p className="text-sm text-muted">Crunching numbers…</p> : (
        <div className="flex flex-col gap-5">

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

          <div className="glass p-4">
            <h3 className="font-display font-semibold text-base text-ink mb-3">TC economy</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><div className="font-display font-bold text-xl grad-text">{Number(ov.tc_available).toFixed(0)}</div><div className="text-[11px] text-muted">Available</div></div>
              <div><div className="font-display font-bold text-xl text-ink">{Number(ov.tc_escrowed).toFixed(0)}</div><div className="text-[11px] text-muted">In escrow</div></div>
              <div><div className="font-display font-bold text-xl text-ink">{Number(ov.tc_earned_lifetime).toFixed(0)}</div><div className="text-[11px] text-muted">Earned lifetime</div></div>
            </div>
          </div>

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

          <div className="glass p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-base text-ink">Where members are</h3>
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

          {web && (
            <div className="glass p-4">
              <h3 className="font-display font-semibold text-base text-ink mb-3">Marketing website</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { l: 'Waitlist (all)', v: web.waitlist_total },
                  { l: 'Waitlist (30d)', v: web.waitlist_30d },
                  { l: 'Investor interest', v: web.investor_total },
                  { l: 'Page views (7d)', v: web.pageviews_7d },
                ].map(k => (
                  <div key={k.l} className="text-center">
                    <div className="font-display font-bold text-2xl text-ink">{Number(k.v ?? 0)}</div>
                    <div className="text-[11px] text-muted">{k.l}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted mt-3">From timebank.academy — waitlist signups, investor-interest registrations, and page views.{Number(web.pending_users) > 0 ? ` · ${web.pending_users} account${Number(web.pending_users) === 1 ? '' : 's'} pending approval.` : ''}</p>
            </div>
          )}

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

/* ---- small presentational helpers ---- */

function Bars({ rows, max }: { rows: { k: string; v: number }[]; max: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      {rows.slice(0, 8).map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-24 truncate text-ink text-xs" title={r.k}>{r.k}</span>
          <div className="flex-1 h-3.5 rounded-pill overflow-hidden" style={{ background: 'rgba(120,70,40,0.06)' }}>
            <div className="h-full rounded-pill" style={{ width: `${Math.max(4, 100 * r.v / max)}%`, background: 'var(--grad)' }} />
          </div>
          <span className="w-10 text-right font-mono text-muted text-xs">{r.v}</span>
        </div>
      ))}
    </div>
  )
}

function TechBlock({ title, rows }: { title: string; rows: { k: string; v: number }[] }) {
  if (!rows || rows.length === 0) return null
  const max = Math.max(1, ...rows.map(r => Number(r.v)))
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-widest text-faint mb-1.5">{title}</div>
      <Bars rows={rows.map(r => ({ k: r.k, v: Number(r.v) }))} max={max} />
    </div>
  )
}

function fmtNum(n: any): string {
  const v = Number(n || 0)
  if (v >= 10000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(v)
}

function fmtDur(seconds: any): string {
  const s = Math.round(Number(seconds || 0))
  if (!s) return '0s'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem ? `${m}m ${rem}s` : `${m}m`
}

// best-effort flag from a 2-letter ISO country code
function flag(cc: any): string {
  if (typeof cc !== 'string' || cc.length !== 2) return '🌐'
  const A = 0x1f1e6
  const up = cc.toUpperCase()
  return String.fromCodePoint(A + (up.charCodeAt(0) - 65)) + String.fromCodePoint(A + (up.charCodeAt(1) - 65))
}
