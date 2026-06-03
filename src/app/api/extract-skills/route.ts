import { NextRequest, NextResponse } from 'next/server'

/* -------------------------------------------------------------------------
   POST /api/extract-skills
   Body: { text: string }   — plain text extracted from the user's CV
   Returns: { skills: [{ name, category, confidence }], languages: string[] }

   Server-side only. Uses GEMINI_API_KEY (never NEXT_PUBLIC). The key never
   reaches the browser. Output is a DRAFT — the client lets the user add/remove
   before saving, so extraction quality is never a blocker.
   ------------------------------------------------------------------------- */

const GEMINI_MODEL = 'gemini-2.0-flash'   // fast + cheap for extraction
const CATEGORIES = ['Tech', 'Creative', 'Language', 'Business', 'Finance', 'Music', 'Lifestyle', 'Other']

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      return NextResponse.json({ error: 'Please provide CV text (at least a few lines).' }, { status: 400 })
    }
    // cap input size to keep the call cheap/safe
    const cv = text.slice(0, 12000)

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured.' }, { status: 503 })
    }

    const prompt = `You extract teachable skills from a CV/resume for a peer-to-peer skill-exchange platform.
From the text below, identify concrete skills this person could TEACH others (not soft traits like "team player").
Also detect languages they speak.

Return ONLY valid JSON, no markdown, in exactly this shape:
{"skills":[{"name":"React","category":"Tech","confidence":0.9}],"languages":["en","nl"]}

Rules:
- category must be one of: ${CATEGORIES.join(', ')}
- name: short, canonical (e.g. "Project Management", "Python", "Guitar")
- confidence: 0..1
- languages: ISO-639-1 codes (en, nl, fr, ro, de, es, it, pt). Only ones clearly indicated.
- max 15 skills, most teachable first.

CV TEXT:
"""${cv}"""`

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
        }),
      }
    )

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '')
      console.error('Gemini error', resp.status, detail)
      return NextResponse.json({ error: 'Could not analyze the CV right now. You can add skills manually.' }, { status: 502 })
    }

    const data = await resp.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'

    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch {
      // last-resort: strip any stray fencing
      const cleaned = raw.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(cleaned)
    }

    // sanitize output
    const skills = Array.isArray(parsed.skills) ? parsed.skills
      .filter((s: any) => s && typeof s.name === 'string' && s.name.trim().length >= 2)
      .slice(0, 15)
      .map((s: any) => ({
        name: String(s.name).trim().slice(0, 40),
        category: CATEGORIES.includes(s.category) ? s.category : 'Other',
        confidence: typeof s.confidence === 'number' ? Math.max(0, Math.min(1, s.confidence)) : 0.6,
      })) : []

    const languages = Array.isArray(parsed.languages)
      ? parsed.languages.filter((l: any) => typeof l === 'string' && l.length === 2).map((l: string) => l.toLowerCase()).slice(0, 8)
      : []

    return NextResponse.json({ skills, languages })
  } catch (err) {
    console.error('extract-skills route error', err)
    return NextResponse.json({ error: 'Something went wrong. You can add skills manually.' }, { status: 500 })
  }
}
