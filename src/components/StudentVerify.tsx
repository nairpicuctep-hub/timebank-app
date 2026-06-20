'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/Feedback'

/* -------------------------------------------------------------------------
   StudentVerify — profile card to get verified as a student.
   Uploads proof (student card / enrolment) to the private `student-docs`
   bucket (own folder only, per RLS), then flags the profile 'pending' for
   admin review. On approval the admin grants the one-time bonus. Shows the
   current state: none/rejected → upload · pending → under review ·
   verified → badge.
   ------------------------------------------------------------------------- */

export default function StudentVerify() {
  const [status, setStatus] = useState<string>('none')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const { data } = await supabase.from('profiles').select('student_status').eq('id', session.user.id).single()
      setStatus(data?.student_status || 'none')
      setLoading(false)
    })()
  }, [])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 6 * 1024 * 1024) { toast('File too large (max 6MB).', 'error'); return }
    setUploading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setUploading(false); return }
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${session.user.id}/proof.${ext}`
    const { error: upErr } = await supabase.storage.from('student-docs').upload(path, file, { upsert: true })
    if (upErr) { toast('Upload failed: ' + upErr.message, 'error'); setUploading(false); return }
    const { error: rpcErr } = await supabase.rpc('submit_student_verification', { p_doc_path: path })
    if (rpcErr) { toast(rpcErr.message, 'error'); setUploading(false); return }
    setStatus('pending')
    toast("Submitted — we'll review it shortly.", 'success')
    setUploading(false)
  }

  if (loading) return null

  if (status === 'verified') return (
    <div className="glass p-4 flex items-center gap-3">
      <span className="text-xl">🎓</span>
      <div className="flex-1">
        <div className="text-sm font-semibold text-ink">Verified student</div>
        <div className="text-xs text-muted">You&apos;ll get exam-season credit boosts.</div>
      </div>
      <span className="text-[10px] font-mono px-2 py-1 rounded-pill" style={{ background: 'var(--mint-bg)', color: 'var(--mint)' }}>✓ VERIFIED</span>
    </div>
  )

  if (status === 'pending') return (
    <div className="glass p-4 flex items-center gap-3">
      <span className="text-xl">⏳</span>
      <div className="flex-1">
        <div className="text-sm font-semibold text-ink">Student verification under review</div>
        <div className="text-xs text-muted">We&apos;ll let you know as soon as it&apos;s approved.</div>
      </div>
    </div>
  )

  // none or rejected
  return (
    <div className="glass p-4">
      <div className="flex items-center gap-3 mb-2.5">
        <span className="text-xl">🎓</span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-ink">Are you a student?</div>
          <div className="text-xs text-muted">
            {status === 'rejected'
              ? "That didn't verify — try a clearer photo."
              : 'Get verified for 5 bonus credits + exam-season boosts.'}
          </div>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} />
      <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-grad w-full py-2.5 text-xs disabled:opacity-50">
        {uploading ? 'Uploading…' : 'Upload student proof'}
      </button>
      <p className="text-[10px] text-faint mt-2">Student card or enrolment proof. Private — only the team sees it, used once to verify.</p>
    </div>
  )
}
