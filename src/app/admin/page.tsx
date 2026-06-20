'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/Feedback'

/* -------------------------------------------------------------------------
   Admin core (/admin) — Phase B.
   Gated by profiles.is_admin. Sections: Overview / Users / Skills.
   • Users: search, view, toggle VIP (with title/headline), toggle admin, suspend
   • Skills: review user-added skills, recategorize, hide junk, see usage
   • Overview: the operational KPI snapshot (full intel dashboard is Phase C)
   All privileged writes go through admin-gated RPCs (set_vip, admin_set_role,
   admin_set_skill) — never raw table writes from the client.
   ------------------------------------------------------------------------- */

type Tab = 'overview' | 'users' | 'skills' | 'reports' | 'support'

export default function AdminPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [skills, setSkills] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [supportRequests, setSupportRequests] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<any>(null)   // user being VIP-edited
  const [pendingOnly, setPendingOnly] = useState(false)  // filter Users to not-yet-approved

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
      if (!me?.is_admin) { setAllowed(false); return }
      setAllowed(true)
      loadAll()
    }
    init()
  }, [router])

  async function loadAll() {
    const supabase = createClient()
    const [usersRes, skillsRes, ledgerRes, sessionsRes, reportsRes, supportRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, location, city, country_code, level, xp, tc_available, tc_escrowed, sessions_taught, sessions_taken, is_vip, vip_title, headline_skill, is_admin, is_approved, consent_research, created_at, signup_order').order('signup_order', { ascending: false }),
      supabase.from('skills').select('*').order('usage_count', { ascending: false }),
      supabase.from('tc_ledger').select('d_available, reason'),
      supabase.from('sessions').select('status, tc_released'),
      supabase.from('user_reports').select('*, reporter:reporter_id(full_name), reported:reported_id(full_name)').order('created_at', { ascending: false }),
      supabase.from('support_requests').select('*, user:user_id(full_name)').order('created_at', { ascending: false }),
    ])
    setUsers(usersRes.data || [])
    setSkills(skillsRes.data || [])
    setReports(reportsRes.data || [])
    setSupportRequests(supportRes.data || [])

    const u = usersRes.data || []
    const s = skillsRes.data || []
    const sess = sessionsRes.data || []
    const teachers = u.filter(x => (x.sessions_taught || 0) >= 0)  // refined below via user_skills if needed
    setStats({
      users: u.length,
      vips: u.filter(x => x.is_vip).length,
      researchOptIn: u.filter(x => x.consent_research).length,
      tcInCirculation: u.reduce((a, x) => a + Number(x.tc_available || 0) + Number(x.tc_escrowed || 0), 0),
      skills: s.length,
      userAddedSkills: s.filter(x => x.created_by).length,
      sessionsTotal: sess.length,
      sessionsCompleted: sess.filter(x => x.status === 'completed').length,
      countries: new Set(u.map(x => x.country_code).filter(Boolean)).size,
      openReports: (reportsRes.data || []).filter((r: any) => r.status === 'open').length,
      openSupport: (supportRes.data || []).filter((r: any) => r.status === 'open').length,
      pendingApprovals: u.filter(x => !x.is_approved).length,
    })
  }

  async function setReportStatus(id: number, status: string) {
    const supabase = createClient()
    const { error } = await supabase.rpc('admin_set_report_status', { p_report_id: id, p_status: status })
    if (error) { toast(error.message, 'error'); return }
    loadAll()
  }

  async function setSupportStatus(id: string, status: string) {
    const supabase = createClient()
    const { error } = await supabase.rpc('admin_set_support_status', { p_request_id: id, p_status: status })
    if (error) { toast(error.message, 'error'); return }
    loadAll()
  }

  async function toggleVip(user: any, isVip: boolean, title?: string, headline?: string) {
    const supabase = createClient()
    const { error } = await supabase.rpc('set_vip', {
      p_user_id: user.id, p_is_vip: isVip,
      p_vip_title: title ?? user.vip_title, p_headline_skill: headline ?? user.headline_skill,
    })
    if (error) { toast(error.message, 'error'); return }
    setEditing(null); loadAll()
  }

  async function setRole(user: any, field: 'is_admin', value: boolean) {
    const supabase = createClient()
    const { error } = await supabase.rpc('admin_set_role', { p_user_id: user.id, p_is_admin: value })
    if (error) { toast(error.message, 'error'); return }
    loadAll()
  }

  async function setApproved(user: any, value: boolean) {
    const supabase = createClient()
    const { error } = await supabase.rpc('admin_set_approved', { p_user_id: user.id, p_is_approved: value })
    if (error) { toast(error.message, 'error'); return }
    toast(value ? `${user.full_name || 'User'} approved` : 'Access revoked')
    loadAll()
  }

  async function moderateSkill(skill: any, patch: { category?: string; is_approved?: boolean }) {
    const supabase = createClient()
    const { error } = await supabase.rpc('admin_set_skill', {
      p_skill_id: skill.id,
      p_category: patch.category ?? skill.category,
      p_is_approved: patch.is_approved ?? skill.is_approved,
    })
    if (error) { toast(error.message, 'error'); return }
    loadAll()
  }

  if (allowed === null) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm font-mono text-muted">Checking access…</p></div>
  if (allowed === false) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
      <div className="text-4xl mb-3">🔒</div>
      <h1 className="font-display font-semibold text-xl text-ink mb-1">Admins only</h1>
      <p className="text-sm text-muted mb-5">You don&apos;t have access to this area.</p>
      <button onClick={() => router.push('/home')} className="btn-grad px-5 py-3 text-sm">Back to home</button>
    </div>
  )

  const filteredUsers = users.filter(u => (!pendingOnly || !u.is_approved) && (!q || (u.full_name || '').toLowerCase().includes(q.toLowerCase()) || (u.city || '').toLowerCase().includes(q.toLowerCase())))
  const filteredSkills = skills.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()))
  const filteredReports = reports.filter(r => !q
    || (r.reported?.full_name || '').toLowerCase().includes(q.toLowerCase())
    || (r.reporter?.full_name || '').toLowerCase().includes(q.toLowerCase()))
  const filteredSupport = supportRequests.filter(r => !q
    || (r.email || '').toLowerCase().includes(q.toLowerCase())
    || (r.user?.full_name || '').toLowerCase().includes(q.toLowerCase()))
  const CATS = ['Tech', 'Creative', 'Language', 'Business', 'Finance', 'Music', 'Lifestyle', 'Other']
  const REPORT_STATUS = ['open', 'reviewing', 'resolved', 'dismissed']
  const reportStatusColor: Record<string, { bg: string; tx: string }> = {
    open:      { bg: 'var(--request-bg)', tx: 'var(--rose)' },
    reviewing: { bg: '#fff7ed', tx: '#c2410c' },
    resolved:  { bg: 'var(--mint-bg)', tx: 'var(--mint)' },
    dismissed: { bg: 'var(--cream-2)', tx: 'var(--muted)' },
  }
  const SUPPORT_STATUS = ['open', 'resolved']
  const supportStatusColor: Record<string, { bg: string; tx: string }> = {
    open:     { bg: 'var(--request-bg)', tx: 'var(--rose)' },
    resolved: { bg: 'var(--mint-bg)', tx: 'var(--mint)' },
  }

  return (
    <div className="min-h-screen pb-12 px-5 pt-12 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display font-semibold text-[26px] text-ink">Admin</h1>
        <button onClick={() => router.push('/home')} className="text-xs text-muted">← App</button>
      </div>
      <p className="text-sm text-muted mb-5">Operational tools. Full investor analytics live in the Intel dashboard.</p>

      {/* tabs */}
      <div className="flex gap-1 p-1 rounded-pill glass mb-5">
        {(['overview', 'users', 'skills', 'reports', 'support'] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setQ('') }}
            className="flex-1 py-2 rounded-pill text-xs font-semibold capitalize transition-all"
            style={tab === t ? { background: 'var(--grad)', color: '#fff' } : { color: 'var(--muted)' }}>
            {t}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && stats && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total users', val: stats.users, icon: '👥' },
            { label: 'Countries', val: stats.countries, icon: '🌍' },
            { label: 'VIP masters', val: stats.vips, icon: '✦' },
            { label: 'Research opt-in', val: stats.researchOptIn, icon: '📊' },
            { label: 'TC in circulation', val: stats.tcInCirculation.toFixed(0), icon: '◈' },
            { label: 'Skills', val: `${stats.skills} (${stats.userAddedSkills} user-added)`, icon: '✨' },
            { label: 'Sessions', val: stats.sessionsTotal, icon: '🎓' },
            { label: 'Completed', val: stats.sessionsCompleted, icon: '✓' },
            { label: 'Open reports', val: stats.openReports, icon: '⚑' },
            { label: 'Open support requests', val: stats.openSupport, icon: '💬' },
            { label: 'Pending approvals', val: stats.pendingApprovals, icon: '⏳' },
          ].map(s => (
            <div key={s.label} className="glass p-4">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="font-display font-bold text-xl text-ink">{s.val}</div>
              <div className="text-xs text-muted">{s.label}</div>
            </div>
          ))}
          <div className="col-span-2 glass p-4">
            <p className="text-xs text-muted">📈 Full KPI analytics — liquidity, learner→teacher conversion, skill-demand graph, geographic coverage, EU impact metrics — arrive in the Intel dashboard (Phase C). This overview is the operational snapshot.</p>
          </div>
        </div>
      )}

      {/* search (users + skills) */}
      {tab !== 'overview' && (
        <div className="relative mb-3">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${tab}…`} style={{ paddingLeft: 38, fontSize: 13 }} />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">⌕</span>
        </div>
      )}

      {/* USERS */}
      {tab === 'users' && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-1.5 mb-1">
            <button onClick={() => setPendingOnly(false)} className="text-xs font-medium px-3 py-1.5 rounded-pill"
              style={!pendingOnly ? { background: 'var(--grad)', color: '#fff' } : { background: 'var(--cream-2)', color: 'var(--muted)', border: '1px solid var(--line)' }}>All</button>
            <button onClick={() => setPendingOnly(true)} className="text-xs font-medium px-3 py-1.5 rounded-pill"
              style={pendingOnly ? { background: 'var(--grad)', color: '#fff' } : { background: 'var(--cream-2)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
              Pending{stats?.pendingApprovals ? ` (${stats.pendingApprovals})` : ''}
            </button>
          </div>
          {filteredUsers.map(u => (
            <div key={u.id} className="glass p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0" style={{ background: 'var(--grad)' }}>
                  {u.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink flex items-center gap-1.5 truncate">
                    {u.full_name || 'Unnamed'}
                    {u.is_vip && <span title="VIP">✦</span>}
                    {u.is_admin && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-pill" style={{ background: 'var(--tc-bg)', color: 'var(--tc-tx)' }}>ADMIN</span>}
                    {!u.is_approved && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-pill" style={{ background: 'var(--request-bg)', color: 'var(--rose)' }}>PENDING</span>}
                  </div>
                  <div className="text-[11px] text-muted font-mono">
                    {u.city || u.location || '—'}{u.country_code ? `, ${u.country_code}` : ''} · L{u.level} · {Number(u.tc_available || 0)} TC · taught {u.sessions_taught || 0}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setEditing(editing?.id === u.id ? null : u)}
                  className="text-xs font-medium px-3 py-1.5 rounded-pill"
                  style={{ background: u.is_vip ? 'var(--tc-bg)' : 'var(--cream-2)', color: u.is_vip ? 'var(--tc-tx)' : 'var(--muted)', border: '1px solid var(--line)' }}>
                  {u.is_vip ? '✦ VIP — edit' : 'Make VIP'}
                </button>
                <button onClick={() => setRole(u, 'is_admin', !u.is_admin)}
                  className="text-xs font-medium px-3 py-1.5 rounded-pill"
                  style={{ background: 'var(--cream-2)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
                  {u.is_admin ? 'Remove admin' : 'Make admin'}
                </button>
              </div>

              {/* VIP editor */}
              {editing?.id === u.id && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--line-2)' }}>
                  <VipEditor user={u} onSave={toggleVip} onUnset={() => toggleVip(u, false)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SKILLS */}
      {tab === 'skills' && (
        <div className="flex flex-col gap-2">
          {filteredSkills.map(s => (
            <div key={s.id} className="glass p-3.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">
                    {s.name}
                    {s.created_by && <span className="text-[9px] font-mono ml-2 px-1.5 py-0.5 rounded-pill" style={{ background: 'var(--mint-bg)', color: 'var(--mint)' }}>USER-ADDED</span>}
                    {!s.is_approved && <span className="text-[9px] font-mono ml-1 px-1.5 py-0.5 rounded-pill" style={{ background: 'var(--request-bg)', color: 'var(--rose)' }}>HIDDEN</span>}
                  </div>
                  <div className="text-[11px] text-muted font-mono">{s.slug} · {s.language} · used {s.usage_count}×</div>
                </div>
              </div>
              <div className="flex gap-2 mt-2.5 flex-wrap items-center">
                <select value={s.category} onChange={e => moderateSkill(s, { category: e.target.value })}
                  style={{ fontSize: 11, padding: '4px 8px', width: 'auto' }}>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => moderateSkill(s, { is_approved: !s.is_approved })}
                  className="text-xs font-medium px-3 py-1.5 rounded-pill"
                  style={{ background: 'var(--cream-2)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
                  {s.is_approved ? 'Hide' : 'Unhide'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REPORTS */}
      {tab === 'reports' && (
        <div className="flex flex-col gap-2">
          {filteredReports.length === 0 && (
            <div className="glass p-6 text-center"><p className="text-sm text-muted">No reports.</p></div>
          )}
          {filteredReports.map(r => {
            const c = reportStatusColor[r.status] || reportStatusColor.open
            return (
              <div key={r.id} className="glass p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-sm font-semibold text-ink truncate">
                    ⚑ {r.reported?.full_name || 'Unknown'}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-pill flex-shrink-0"
                    style={{ background: c.bg, color: c.tx }}>{r.status}</span>
                </div>
                <div className="text-[11px] text-muted font-mono mb-2">
                  by {r.reporter?.full_name || 'Unknown'} · {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                {r.reason
                  ? <p className="text-sm text-text mb-3">&ldquo;{r.reason}&rdquo;</p>
                  : <p className="text-xs text-faint mb-3">No reason provided.</p>}
                <div className="flex gap-1.5 flex-wrap">
                  {REPORT_STATUS.filter(s => s !== r.status).map(s => (
                    <button key={s} onClick={() => setReportStatus(r.id, s)}
                      className="text-xs font-medium px-3 py-1.5 rounded-pill capitalize"
                      style={{ background: 'var(--cream-2)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* SUPPORT REQUESTS */}
      {tab === 'support' && (
        <div className="flex flex-col gap-2">
          {filteredSupport.length === 0 && (
            <div className="glass p-6 text-center"><p className="text-sm text-muted">No support requests.</p></div>
          )}
          {filteredSupport.map(r => {
            const c = supportStatusColor[r.status] || supportStatusColor.open
            const turns = Array.isArray(r.conversation) ? r.conversation : []
            const preview = turns.find((m: any) => m?.role === 'user')?.content || turns[0]?.content || ''
            return (
              <div key={r.id} className="glass p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-sm font-semibold text-ink truncate">
                    💬 {r.email}{r.user?.full_name ? ` · ${r.user.full_name}` : ''}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-pill flex-shrink-0"
                    style={{ background: c.bg, color: c.tx }}>{r.status}</span>
                </div>
                <div className="text-[11px] text-muted font-mono mb-2">
                  {turns.length} message{turns.length === 1 ? '' : 's'} · {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                {preview
                  ? <p className="text-sm text-text mb-3 line-clamp-3">&ldquo;{preview}&rdquo;</p>
                  : <p className="text-xs text-faint mb-3">No conversation recorded.</p>}
                <div className="flex gap-1.5 flex-wrap">
                  {SUPPORT_STATUS.filter(s => s !== r.status).map(s => (
                    <button key={s} onClick={() => setSupportStatus(r.id, s)}
                      className="text-xs font-medium px-3 py-1.5 rounded-pill capitalize"
                      style={{ background: 'var(--cream-2)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
                      Mark {s}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* VIP editor sub-form */
function VipEditor({ user, onSave, onUnset }: { user: any; onSave: any; onUnset: any }) {
  const [title, setTitle] = useState(user.vip_title || '')
  const [headline, setHeadline] = useState(user.headline_skill || '')
  return (
    <div className="flex flex-col gap-2">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="VIP title (e.g. Physicist & author)" style={{ fontSize: 13 }} />
      <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Headline skill (e.g. Quantum Physics)" style={{ fontSize: 13 }} />
      <div className="flex gap-2">
        <button onClick={() => onSave(user, true, title, headline)} className="btn-grad flex-1 py-2.5 text-xs">
          {user.is_vip ? 'Update VIP' : 'Set as VIP'}
        </button>
        {user.is_vip && <button onClick={onUnset} className="btn-ghost flex-1 py-2.5 text-xs">Remove VIP</button>}
      </div>
    </div>
  )
}
