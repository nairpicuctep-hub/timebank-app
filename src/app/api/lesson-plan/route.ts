import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/* -------------------------------------------------------------------------
   POST /api/lesson-plan
   Body: { sessionId: string }
   Returns: { blocks: [{ title, detail }] }

   Server-side only. Uses GEMINI_API_KEY (never NEXT_PUBLIC — same pattern as
   /api/extract-skills). Drafts a short, structured lesson plan (objectives /
   outline / prep) for a freshly booked 1:1 session, tailored to the skill and
   the learner's self-rated level, and stores it in course_plans.

   Auth: we use the cookie-bound server client, so this runs AS the calling
   user — `sessions read` RLS only returns the row if they're the teacher or
   learner, which both authenticates the caller and scopes the data in one
   step. `course_plans` RLS ("plans rw") lets either participant read/write
   their own session's plan, so the upsert below is RLS-safe as-is.

   This is a nice-to-have: any failure here (missing key, bad Gemini response,
   network) returns a clean error and the session keeps working without a
   plan — the caller treats this as best-effort and never blocks on it.
   ------------------------------------------------------------------------- */

const GEMINI_MODEL = 'gemini-2.0-flash'
const LEVEL_LABELS: Record<number, string> = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced', 4: 'Expert' }

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing sessionId.' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

    const { data: s } = await supabase.from('sessions')
      .select('id, learner_id, skill_id, duration_min, skill:skill_id(name, category)')
      .eq('id', sessionId).single()
    if (!s) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })

    const skill: any = Array.isArray(s.skill) ? s.skill[0] : s.skill
    if (!skill?.name) return NextResponse.json({ error: 'This session has no skill set.' }, { status: 400 })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'AI service not configured.' }, { status: 503 })

    // learner's self-rated level for this skill (set during onboarding / skill add —
    // may not exist for ad-hoc bookings) + a short bio for extra "goal" context
    const [uskillRes, learnerRes] = await Promise.all([
      supabase.from('user_skills').select('proficiency')
        .eq('user_id', s.learner_id).eq('role', 'learner').eq('skill_id', s.skill_id).maybeSingle(),
      supabase.from('profiles').select('bio').eq('id', s.learner_id).single(),
    ])
    const levelLabel = LEVEL_LABELS[uskillRes.data?.proficiency as number] || 'not yet self-rated — assume Beginner'
    const bio = String(learnerRes.data?.bio || '').trim().slice(0, 300)
    const duration = s.duration_min || 60

    const prompt = `You draft a short, structured lesson plan for ONE 1:1 peer-to-peer session on TimeBank Academy, a community skill-exchange platform where members trade time, not money — one person teaches, the other learns, in a single ${duration}-minute video call.

Skill being taught: "${skill.name}"${skill.category ? ` (category: ${skill.category})` : ''}
Learner's self-rated level in this skill: ${levelLabel}
${bio ? `What the learner says about themselves (may hint at their goal): "${bio}"` : ''}

Draft a plan with exactly 3 sections to help both people get the most out of this one session:
1. "Objectives" — 2-3 concrete things the learner should understand or be able to do by the end.
2. "Session outline" — a brief ordered flow with rough timing that fits inside ${duration} minutes.
3. "How to prepare" — 1-3 short, practical things the learner (and optionally the teacher) can do beforehand.

Return ONLY valid JSON, no markdown, in exactly this shape:
{"blocks":[{"title":"Objectives","detail":"..."},{"title":"Session outline","detail":"..."},{"title":"How to prepare","detail":"..."}]}

Each "detail" must be plain text (no markdown, no asterisks), under 500 characters, warm, concrete, and realistic for a single short session. This is a draft aid for both people, not professional advice.`

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
        }),
      }
    )

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '')
      console.error('Gemini error', resp.status, detail)
      return NextResponse.json({ error: 'Could not draft a plan right now.' }, { status: 502 })
    }

    const data = await resp.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'

    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch {
      const cleaned = raw.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(cleaned)
    }

    const blocks = Array.isArray(parsed.blocks) ? parsed.blocks
      .filter((b: any) => b && typeof b.title === 'string' && typeof b.detail === 'string' && b.detail.trim().length > 0)
      .slice(0, 5)
      .map((b: any) => ({ title: String(b.title).trim().slice(0, 60), detail: String(b.detail).trim().slice(0, 600) }))
      : []

    if (!blocks.length) {
      return NextResponse.json({ error: 'Could not draft a usable plan right now.' }, { status: 502 })
    }

    // store for both participants — RLS ("plans rw") allows this for teacher or learner
    const { error: upErr } = await supabase.from('course_plans')
      .upsert({ session_id: sessionId, plan: blocks }, { onConflict: 'session_id' })
    if (upErr) console.error('course_plans upsert error', upErr)

    return NextResponse.json({ blocks })
  } catch (err) {
    console.error('lesson-plan route error', err)
    return NextResponse.json({ error: 'Something went wrong drafting the plan.' }, { status: 500 })
  }
}
