import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/* -------------------------------------------------------------------------
   POST /api/mirror-skills
   Body: { answers: { topic?, friends_ask?, flow? } }   — Skill Mirror free text
   Returns: { skills: [{ name, category, confidence }] }

   Turns the reflective Skill Mirror answers ("what could you talk about for
   hours", "what do friends ask you for", "what were you doing when you lost
   track of time") into concrete, TEACHABLE skill suggestions. The client then
   lets the user confirm which to keep and canonicalizes each via add_skill().

   Server-side only, GEMINI_API_KEY never reaches the browser (same pattern as
   /api/extract-skills). Requires auth. Best-effort: any failure returns a clean
   error and the user can still add skills manually.
   ------------------------------------------------------------------------- */

const GEMINI_MODEL = 'gemini-2.0-flash'
const CATEGORIES = ['Tech', 'Creative', 'Language', 'Business', 'Finance', 'Music', 'Lifestyle', 'Other']

export async function POST(req: NextRequest) {
  try {
    const { answers } = await req.json()
    const topic = String(answers?.topic || '').trim().slice(0, 600)
    const friends = String(answers?.friends_ask || '').trim().slice(0, 600)
    const flow = String(answers?.flow || '').trim().slice(0, 600)

    if ((topic + friends + flow).trim().length < 10) {
      return NextResponse.json({ error: 'Tell us a little more first.' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'AI service not configured.' }, { status: 503 })

    const prompt = `You help a member of TimeBank Academy (a peer-to-peer skill-exchange community) discover what they could TEACH others, based on a short reflective questionnaire ("Skill Mirror").

Their answers:
- "Something I could talk about for an hour without notes": ${topic || '(blank)'}
- "What friends always ask me for help with": ${friends || '(blank)'}
- "What I was doing the last time I lost track of time": ${flow || '(blank)'}

From these, infer concrete, teachable skills this person could realistically teach in a 1:1 session. Turn vague interests into specific, nameable skills (e.g. "made risotto from scratch" → "Italian Cooking"; "fixing friends' CVs" → "CV & Resume Writing"; "lost track of time editing photos" → "Photo Editing").

Return ONLY valid JSON, no markdown, in exactly this shape:
{"skills":[{"name":"Italian Cooking","category":"Lifestyle","confidence":0.8}]}

Rules:
- category must be one of: ${CATEGORIES.join(', ')}
- name: short, canonical, title-case, the kind of thing someone would search for (2-4 words max). No sentences.
- confidence: 0..1 — how clearly the answers support teaching this.
- Only suggest skills genuinely grounded in their answers. Do NOT invent unrelated skills. It's fine to return fewer than the max if the answers are thin.
- max 8 skills, most teachable first. No soft traits like "communication" or "leadership".`

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.35, responseMimeType: 'application/json' },
        }),
      }
    )

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '')
      console.error('Gemini error', resp.status, detail)
      return NextResponse.json({ error: 'Could not read your answers right now. You can add skills manually.' }, { status: 502 })
    }

    const data = await resp.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'

    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    }

    const skills = Array.isArray(parsed.skills) ? parsed.skills
      .filter((s: any) => s && typeof s.name === 'string' && s.name.trim().length >= 2)
      .slice(0, 8)
      .map((s: any) => ({
        name: String(s.name).trim().slice(0, 40),
        category: CATEGORIES.includes(s.category) ? s.category : 'Other',
        confidence: typeof s.confidence === 'number' ? Math.max(0, Math.min(1, s.confidence)) : 0.6,
      })) : []

    return NextResponse.json({ skills })
  } catch (err) {
    console.error('mirror-skills route error', err)
    return NextResponse.json({ error: 'Something went wrong. You can add skills manually.' }, { status: 500 })
  }
}
