'use client'

import { useState, useRef } from 'react'

/* -------------------------------------------------------------------------
   CVImport — optional CV → skills helper for onboarding.
   • User uploads a CV (PDF / DOCX / TXT) OR pastes text.
   • Text is extracted client-side, sent to /api/extract-skills (server → Gemini).
   • Candidate skills shown as toggleable chips — user adds/removes freely.
   • Confirmed skills are returned via onConfirm(skillNames, languages).
   NEVER a blocker: there's always a "skip / add manually" path.

   PDF/DOCX parsing uses dynamic imports so the libs only load if used.
   Install once: npm i pdfjs-dist mammoth
   ------------------------------------------------------------------------- */

type Candidate = { name: string; category: string; confidence: number }

export default function CVImport({
  onConfirm, onSkip,
}: {
  onConfirm: (skills: string[], languages: string[]) => void
  onSkip?: () => void
}) {
  const [stage, setStage] = useState<'idle' | 'reading' | 'analyzing' | 'review' | 'paste'>('idle')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [languages, setLanguages] = useState<string[]>([])
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function extractText(file: File): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'txt') return await file.text()

    if (ext === 'pdf') {
      const pdfjs = await import('pdfjs-dist')
      // @ts-ignore - worker
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
      const buf = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: buf }).promise
      let text = ''
      for (let i = 1; i <= Math.min(pdf.numPages, 8); i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map((it: any) => it.str).join(' ') + '\n'
      }
      return text
    }

    if (ext === 'docx') {
      const mammoth = await import('mammoth')
      const buf = await file.arrayBuffer()
      const res = await mammoth.extractRawText({ arrayBuffer: buf })
      return res.value
    }

    throw new Error('Unsupported file. Use PDF, DOCX, or TXT — or paste your text.')
  }

  async function handleFile(file: File) {
    setError(''); setStage('reading')
    try {
      const text = await extractText(file)
      await analyze(text)
    } catch (e: any) {
      setError(e.message || 'Could not read that file. Try pasting your CV text instead.')
      setStage('paste')
    }
  }

  async function analyze(text: string) {
    setStage('analyzing'); setError('')
    try {
      const res = await fetch('/api/extract-skills', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed.')
      const cands: Candidate[] = data.skills || []
      setCandidates(cands)
      setSelected(new Set(cands.filter(c => c.confidence >= 0.5).map(c => c.name)))
      setLanguages(data.languages || [])
      setStage('review')
    } catch (e: any) {
      setError(e.message || 'Could not analyze. You can add skills manually.')
      setStage('idle')
    }
  }

  function toggle(name: string) {
    setSelected(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })
  }

  function confirm() {
    onConfirm(Array.from(selected), languages)
  }

  // ---- UI ----
  if (stage === 'reading' || stage === 'analyzing') return (
    <div className="glass p-6 text-center">
      <div className="text-3xl mb-2 tc-pop">✦</div>
      <p className="text-sm font-semibold text-ink">{stage === 'reading' ? 'Reading your CV…' : 'Finding your skills…'}</p>
      <p className="text-xs text-muted mt-1">This takes a few seconds.</p>
    </div>
  )

  if (stage === 'review') return (
    <div className="glass p-4">
      <div className="text-sm font-semibold text-ink mb-1">✨ We found these skills</div>
      <p className="text-xs text-muted mb-3">Tap to keep or drop. Add more later — this is just a head start.</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {candidates.length === 0 && <p className="text-xs text-muted">No clear skills found — no worries, add them manually.</p>}
        {candidates.map(c => {
          const on = selected.has(c.name)
          return (
            <button key={c.name} onClick={() => toggle(c.name)}
              className="px-3 py-2 rounded-btn text-sm font-medium transition-all"
              style={on ? { background: 'var(--grad)', color: '#fff', border: '1.5px solid transparent' }
                         : { background: 'rgba(255,255,255,0.6)', color: 'var(--text)', border: '1.5px solid var(--line)' }}>
              {c.name} {on ? '✓' : '+'}
            </button>
          )
        })}
      </div>
      {languages.length > 0 && (
        <p className="text-xs text-muted mb-3">Detected languages: {languages.join(', ').toUpperCase()}</p>
      )}
      <button onClick={confirm} disabled={selected.size === 0} className="btn-grad w-full py-3 text-sm">
        Add {selected.size} skill{selected.size === 1 ? '' : 's'} →
      </button>
      {onSkip && (
        <button onClick={onSkip} className="w-full py-2 mt-1 text-xs text-muted">
          {candidates.length === 0 ? "Never mind — I'll add skills myself" : 'Skip — none of these fit'}
        </button>
      )}
    </div>
  )

  if (stage === 'paste') return (
    <div className="glass p-4">
      <div className="text-sm font-semibold text-ink mb-2">Paste your CV text</div>
      {error && <p className="text-xs mb-2" style={{ color: 'var(--coral)' }}>{error}</p>}
      <textarea rows={6} value={pasteText} onChange={e => setPasteText(e.target.value)}
        placeholder="Paste your CV or a few lines about your experience…" style={{ resize: 'none', marginBottom: 10 }} />
      <div className="flex gap-2">
        <button onClick={() => analyze(pasteText)} disabled={pasteText.trim().length < 20} className="btn-grad flex-1 py-2.5 text-sm">Analyze</button>
        {onSkip && <button onClick={onSkip} className="btn-ghost flex-1 py-2.5 text-sm">Skip</button>}
      </div>
    </div>
  )

  // idle
  return (
    <div className="glass p-5 text-center">
      <div className="text-3xl mb-2">📄</div>
      <div className="text-sm font-semibold text-ink mb-1">Import skills from your CV</div>
      <p className="text-xs text-muted mb-4">Optional — we&apos;ll suggest skills you can teach. You stay in control of the final list.</p>
      {error && <p className="text-xs mb-2" style={{ color: 'var(--coral)' }}>{error}</p>}
      <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      <div className="flex flex-col gap-2">
        <button onClick={() => fileRef.current?.click()} className="btn-grad w-full py-3 text-sm">Upload CV (PDF, DOCX, TXT)</button>
        <button onClick={() => setStage('paste')} className="btn-ghost w-full py-2.5 text-sm">Or paste text instead</button>
        {onSkip && <button onClick={onSkip} className="w-full py-2 text-xs text-muted">Skip — I&apos;ll add skills myself</button>}
      </div>
    </div>
  )
}
