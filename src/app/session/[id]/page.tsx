'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Message { id: string; user_id: string; content: string; type: string; created_at: string }
interface PlanBlock { title: string; duration: number; description: string; completed: boolean; notes: string }

export default function SessionRoomPage() {
  const { id: sessionId } = useParams()
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState<'chat'|'ai'|'docs'>('chat')
  const [plan, setPlan] = useState<PlanBlock[]>([])
  const [generating, setGenerating] = useState(false)
  const [aiInput, setAiInput] = useState({ skill: '', level: 'beginner', duration: 60 })
  const [elapsed, setElapsed] = useState(0)
  const [isTeacher, setIsTeacher] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession) { router.push('/auth'); return }
      setCurrentUser(authSession.user)

      const { data: sess } = await supabase.from('sessions')
        .select('*, skills(name, icon), teacher:teacher_id(full_name), learner:learner_id(full_name)')
        .eq('id', sessionId).single()

      if (!sess) { router.push('/home'); return }
      setSession(sess)
      setIsTeacher(sess.teacher_id === authSession.user.id)
      setAiInput(prev => ({ ...prev, skill: sess.skills?.name || '' }))

      // Load existing messages
      const { data: msgs } = await supabase.from('session_messages')
        .select('*').eq('session_id', sessionId).order('created_at')
      setMessages(msgs || [])

      // Load existing plan
      const { data: existingPlan } = await supabase.from('course_plans')
        .select('*').eq('session_id', sessionId).single()
      if (existingPlan?.plan) setPlan(existingPlan.plan)

      // Mark session as active
      if (sess.status === 'pending') {
        await supabase.from('sessions').update({
          status: 'active',
          actual_start: new Date().toISOString()
        }).eq('id', sessionId)
      }

      setLoading(false)

      // Subscribe to new messages
      supabase.channel('session-' + sessionId)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'session_messages',
          filter: `session_id=eq.${sessionId}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        }).subscribe()
    }
    load()
  }, [sessionId, router])

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatTime = (s: number) => `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  async function sendMessage() {
    if (!newMsg.trim()) return
    const supabase = createClient()
    await supabase.from('session_messages').insert({
      session_id: sessionId,
      user_id: currentUser.id,
      content: newMsg,
      type: 'text'
    })
    setNewMsg('')
  }

  async function generatePlan() {
    setGenerating(true)
    try {
      const prompt = `You are an expert educator creating a session plan for a peer-to-peer skill exchange.

Skill being taught: ${aiInput.skill}
Learner level: ${aiInput.level}
Session duration: ${aiInput.duration} minutes

Create a structured lesson plan. Respond ONLY with a JSON array (no markdown, no explanation):
[
  {
    "title": "Introduction & level check",
    "duration": 10,
    "description": "Brief description of what to cover",
    "completed": false,
    "notes": ""
  }
]

Make it practical, engaging, and appropriate for the level. Include 4-7 blocks that total exactly ${aiInput.duration} minutes.`

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
        })
      })

      const data = await res.json()
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
      text = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(text)
      setPlan(parsed)

      // Save plan to DB
      const supabase = createClient()
      await supabase.from('course_plans').upsert({
        session_id: sessionId,
        teacher_id: currentUser.id,
        skill: aiInput.skill,
        learner_level: aiInput.level,
        duration_min: aiInput.duration,
        plan: parsed
      }, { onConflict: 'session_id' })

    } catch (err) {
      console.error('Plan generation error:', err)
      alert('Could not generate plan — check your Gemini API key')
    }
    setGenerating(false)
  }

  async function toggleBlock(index: number) {
    const updated = plan.map((b, i) => i === index ? { ...b, completed: !b.completed } : b)
    setPlan(updated)
    const supabase = createClient()
    await supabase.from('course_plans').update({ plan: updated }).eq('session_id', sessionId)
  }

  async function updateNote(index: number, note: string) {
    const updated = plan.map((b, i) => i === index ? { ...b, notes: note } : b)
    setPlan(updated)
  }

  async function saveNotes() {
    const supabase = createClient()
    await supabase.from('course_plans').update({ plan }).eq('session_id', sessionId)
  }

  async function endSession() {
    if (!confirm('End this session?')) return
    const supabase = createClient()
    await supabase.rpc('complete_session', {
      p_session_id: sessionId,
      p_actual_end: new Date().toISOString()
    })
    router.push(`/session/${sessionId}/review`)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0c0906' }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full mx-auto mb-3" style={{ background: 'linear-gradient(135deg, #F0A830, #D03878)', animation: 'spin 2s linear infinite' }} />
        <p className="text-sm font-mono" style={{ color: '#9a8f82' }}>Joining session…</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen" style={{ background: '#0c0906', color: '#F5EDD8' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: '#141210', borderBottom: '1px solid rgba(245,237,216,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: '#1ED8A0', boxShadow: '0 0 6px #1ED8A0' }} />
          <span className="text-sm font-medium">{session?.skills?.icon} {session?.skills?.name}</span>
          <span className="text-xs font-mono" style={{ color: '#9a8f82' }}>
            {isTeacher ? `Teaching ${session?.learner?.full_name}` : `Learning from ${session?.teacher?.full_name}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm font-mono px-3 py-1 rounded-full"
            style={{ background: 'rgba(30,216,160,0.1)', color: '#1ED8A0', border: '1px solid rgba(30,216,160,0.2)' }}>
            ⏱ {formatTime(elapsed)}
          </div>
          <button onClick={endSession}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(232,80,48,0.15)', color: '#E85030', border: '1px solid rgba(232,80,48,0.3)' }}>
            End session
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Video area */}
        <div className="flex-1 relative" style={{ background: '#0a0806' }}>
          <iframe
            src={`${session?.daily_room_url}?t=${Date.now()}`}
            allow="camera; microphone; fullscreen; speaker; display-capture"
            className="w-full h-full border-0"
            style={{ minHeight: '400px' }}
          />
        </div>

        {/* Right sidebar */}
        <div className="w-80 flex flex-col flex-shrink-0"
          style={{ background: '#141210', borderLeft: '1px solid rgba(245,237,216,0.06)' }}>

          {/* Panel tabs */}
          <div className="flex" style={{ borderBottom: '1px solid rgba(245,237,216,0.06)' }}>
            {([['chat','💬','Chat'],['ai','✦','AI Plan'],['docs','📎','Docs']] as const).map(([p, icon, label]) => (
              <button key={p} onClick={() => setPanel(p as any)}
                className="flex-1 py-3 text-xs font-mono flex items-center justify-center gap-1.5 transition-all"
                style={{
                  color: panel === p ? '#F0A830' : '#9a8f82',
                  borderBottom: panel === p ? '2px solid #F0A830' : '2px solid transparent'
                }}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* CHAT PANEL */}
          {panel === 'chat' && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: '#6a5f52' }}>Session started — say hello! 👋</p>
                )}
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.user_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                      style={{
                        background: m.user_id === currentUser?.id
                          ? 'linear-gradient(135deg, #F0A830, #E85030)'
                          : '#1c1917',
                        color: m.user_id === currentUser?.id ? '#fff' : '#F5EDD8',
                        border: m.user_id === currentUser?.id ? 'none' : '1px solid rgba(245,237,216,0.06)'
                      }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 flex gap-2" style={{ borderTop: '1px solid rgba(245,237,216,0.06)' }}>
                <input
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message…"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
                />
                <button onClick={sendMessage}
                  className="px-3 rounded-xl text-white text-xs"
                  style={{ background: 'linear-gradient(135deg, #F0A830, #D03878)', flexShrink: 0 }}>
                  →
                </button>
              </div>
            </div>
          )}

          {/* AI PLAN PANEL */}
          {panel === 'ai' && (
            <div className="flex-1 overflow-y-auto p-3">
              {plan.length === 0 ? (
                <div>
                  <p className="text-xs text-muted mb-4 leading-relaxed">
                    Generate a structured lesson plan with AI. Powered by Gemini — free.
                  </p>
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1">Skill</label>
                      <input value={aiInput.skill} onChange={e => setAiInput({...aiInput, skill: e.target.value})}
                        placeholder="e.g. Python for beginners" style={{ fontSize: '12px', padding: '8px 12px' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1">Learner level</label>
                      <select value={aiInput.level} onChange={e => setAiInput({...aiInput, level: e.target.value})}
                        style={{ fontSize: '12px', padding: '8px 12px' }}>
                        <option value="complete beginner">Complete beginner</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1">Duration (min)</label>
                      <select value={aiInput.duration} onChange={e => setAiInput({...aiInput, duration: parseInt(e.target.value)})}
                        style={{ fontSize: '12px', padding: '8px 12px' }}>
                        {[30,45,60,90,120].map(d => <option key={d} value={d}>{d} minutes</option>)}
                      </select>
                    </div>
                  </div>
                  <button onClick={generatePlan} disabled={generating || !aiInput.skill}
                    className="w-full py-3 rounded-xl text-white text-xs font-medium disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #F0A830, #D03878)' }}>
                    {generating ? '✦ Generating…' : '✦ Generate lesson plan'}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-mono text-muted">{plan.filter(b=>b.completed).length}/{plan.length} blocks done</span>
                    <button onClick={() => setPlan([])}
                      className="text-xs" style={{ color: '#9a8f82' }}>↺ Regenerate</button>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 rounded-full mb-4" style={{ background: 'rgba(245,237,216,0.06)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${(plan.filter(b=>b.completed).length/plan.length)*100}%`, background: 'linear-gradient(135deg, #F0A830, #D03878)' }} />
                  </div>
                  <div className="space-y-2">
                    {plan.map((block, i) => (
                      <div key={i} className="rounded-xl p-3"
                        style={{
                          background: block.completed ? 'rgba(30,216,160,0.06)' : '#1c1917',
                          border: `1px solid ${block.completed ? 'rgba(30,216,160,0.2)' : 'rgba(245,237,216,0.06)'}`
                        }}>
                        <div className="flex items-start gap-2 mb-1">
                          <button onClick={() => isTeacher && toggleBlock(i)}
                            className="w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center text-xs"
                            style={{
                              background: block.completed ? '#1ED8A0' : 'transparent',
                              border: `1px solid ${block.completed ? '#1ED8A0' : 'rgba(245,237,216,0.2)'}`,
                              cursor: isTeacher ? 'pointer' : 'default'
                            }}>
                            {block.completed && '✓'}
                          </button>
                          <div className="flex-1">
                            <div className="text-xs font-medium" style={{ color: block.completed ? '#1ED8A0' : '#F5EDD8' }}>
                              {block.title}
                            </div>
                            <div className="text-xs font-mono" style={{ color: '#6a5f52' }}>{block.duration} min</div>
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed ml-6 mb-2" style={{ color: '#9a8f82' }}>{block.description}</p>
                        {isTeacher && (
                          <input
                            value={block.notes}
                            onChange={e => updateNote(i, e.target.value)}
                            onBlur={saveNotes}
                            placeholder="Add notes…"
                            style={{ fontSize: '11px', padding: '6px 10px', marginLeft: '24px', width: 'calc(100% - 24px)' }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DOCS PANEL */}
          {panel === 'docs' && (
            <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
              <div className="text-3xl mb-3">📎</div>
              <p className="text-sm font-display mb-2">Document sharing</p>
              <p className="text-xs text-muted mb-4 leading-relaxed">
                Share a Google Doc, Notion page, or any link with your session partner.
              </p>
              <input placeholder="Paste a link to share…"
                style={{ marginBottom: '10px', fontSize: '12px', padding: '8px 12px' }} />
              <button className="w-full py-2 rounded-xl text-white text-xs"
                style={{ background: 'linear-gradient(135deg, #F0A830, #D03878)' }}>
                Share link →
              </button>
              <p className="text-xs mt-4" style={{ color: '#6a5f52' }}>
                Full document collaboration coming in v2
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
