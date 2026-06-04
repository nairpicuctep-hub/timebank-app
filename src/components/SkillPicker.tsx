'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

/* -------------------------------------------------------------------------
   SkillPicker — reusable live skill search + add-new.
   Used by onboarding (teach + learn) and "add a skill later" flows.
   • Searches the skills table via search_skills(query) RPC (fuzzy, ranked)
   • Dedupe: if the typed term matches an existing skill, it's suggested
   • Add-new: if no match, "Add '<term>'" creates it instantly via add_skill()
   • Language-aware: passes the user's detected language to new skills

   Props:
     selected:   string[]            slugs currently chosen
     onChange:   (slugs) => void
     language?:  string              detected user language (default 'en')
     accent?:    'grad' | 'mint'     selected-chip color (teach vs learn)
   ------------------------------------------------------------------------- */

type Skill = { id: number; slug: string; name: string; icon: string; category: string }

export default function SkillPicker({
  selected,
  onChange,
  language = 'en',
  accent = 'grad',
}: {
  selected: string[]
  onChange: (slugs: string[]) => void
  language?: string
  accent?: 'grad' | 'mint'
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Skill[]>([])
  const [chosen, setChosen] = useState<Skill[]>([])     // resolved skill objects for selected slugs
  const [adding, setAdding] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounce = useRef<any>(null)

  // resolve selected slugs -> skill objects (for chip display) on mount/change
  useEffect(() => {
    const supabase = createClient()
    async function resolve() {
      if (selected.length === 0) { setChosen([]); return }
      const { data } = await supabase.from('skills').select('*').in('slug', selected)
      setChosen(data || [])
    }
    resolve()
  }, [selected])

  // debounced search
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (!query.trim()) { setResults([]); return }
    setSearching(true)
    debounce.current = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase.rpc('search_skills', { p_query: query.trim() })
      setResults(data || [])
      setSearching(false)
    }, 220)
    return () => debounce.current && clearTimeout(debounce.current)
  }, [query])

  const isSelected = (slug: string) => selected.includes(slug)

  function toggle(skill: Skill) {
    if (isSelected(skill.slug)) {
      onChange(selected.filter(s => s !== skill.slug))
    } else {
      onChange([...selected, skill.slug])
      setChosen(prev => prev.find(s => s.slug === skill.slug) ? prev : [...prev, skill])
      setQuery(''); setResults([])
    }
  }

  async function addNew() {
    const term = query.trim()
    if (term.length < 2) return
    setAdding(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('add_skill', { p_name: term, p_language: language })
    setAdding(false)
    if (error) { alert('Couldn’t add skill: ' + error.message); return }
    // add_skill dedupes server-side, so data is the canonical skill
    if (data && !isSelected(data.slug)) {
      onChange([...selected, data.slug])
      setChosen(prev => [...prev, data])
    }
    setQuery(''); setResults([])
  }

  // does the typed term already exist in results (exact, normalized)?
  const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ')
  const exactExists = results.some(r => norm(r.name) === norm(query))
  const showAdd = query.trim().length >= 2 && !exactExists

  const chipSelectedStyle = accent === 'mint'
    ? { background: 'var(--mint)', color: '#fff', border: '1.5px solid transparent' }
    : { background: 'var(--grad)', color: '#fff', border: '1.5px solid transparent' }
  const chipIdleStyle = { background: 'rgba(255,255,255,0.6)', color: 'var(--text)', border: '1.5px solid var(--line)' }

  return (
    <div>
      {/* search box */}
      <div className="relative mb-3">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search a skill, or type a new one…"
          style={{ paddingLeft: 38, fontSize: 14 }}
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">⌕</span>
      </div>

      {/* selected chips */}
      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {chosen.map(s => (
            <button key={s.slug} onClick={() => toggle(s)}
              className="px-3 py-2 rounded-btn text-sm font-medium transition-all"
              style={chipSelectedStyle}>
              {s.icon} {s.name} ✕
            </button>
          ))}
        </div>
      )}

      {/* live results */}
      {query.trim() && (
        <div className="flex flex-wrap gap-2">
          {searching && results.length === 0 && (
            <span className="text-xs text-muted py-2">Searching…</span>
          )}
          {results.filter(r => !isSelected(r.slug)).map(s => (
            <button key={s.slug} onClick={() => toggle(s)}
              className="px-3 py-2 rounded-btn text-sm font-medium transition-all"
              style={chipIdleStyle}>
              {s.icon} {s.name}
            </button>
          ))}

          {/* add-new */}
          {showAdd && (
            <button onClick={addNew} disabled={adding}
              className="px-3 py-2 rounded-btn text-sm font-semibold transition-all"
              style={{ background: 'var(--cream-2)', color: 'var(--coral)', border: '1.5px dashed var(--coral)' }}>
              {adding ? 'Adding…' : `+ Add “${query.trim()}”`}
            </button>
          )}
        </div>
      )}

      {/* empty hint */}
      {!query.trim() && chosen.length === 0 && (
        <p className="text-xs text-muted">Start typing — e.g. “guitar”, “tax law”, “salsa”, “React”. Can’t find it? Add it.</p>
      )}
    </div>
  )
}
