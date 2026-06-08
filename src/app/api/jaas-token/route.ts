import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

/* -------------------------------------------------------------------------
   POST /api/jaas-token
   Body: { sessionId: string }
   Returns: { jwt, room, appId }   — room is the FULL "<appId>/<bareRoom>"

   Mints a short-lived RS256 JWT for JaaS (8x8.vc) so the caller joins the
   session's video room instantly as an authenticated MODERATOR — no login
   wall, no "waiting for a moderator".

   Security:
   • JAAS_PRIVATE_KEY (PEM) is read server-side only and NEVER leaves the server.
     The App ID and kid are public identifiers (they appear in client URLs), so
     they're fine as constants / non-secret env.
   • The room name is derived server-side from the session row, and the session
     read runs under RLS via the cookie-bound client — so only the session's
     teacher or learner can obtain a token, and only for their own room. We keep
     the existing room-name-per-session logic (sessions.daily_room_name).
   ------------------------------------------------------------------------- */

export const runtime = 'nodejs' // needs Node crypto + PEM; not edge-compatible

const JAAS_APP_ID = process.env.JAAS_APP_ID || 'vpaas-magic-cookie-9a72f7b3954449ce858d09af35c84de2'
const JAAS_KID = process.env.JAAS_KID || 'vpaas-magic-cookie-9a72f7b3954449ce858d09af35c84de2/c4abc0'

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing sessionId.' }, { status: 400 })
    }

    const privateKeyRaw = process.env.JAAS_PRIVATE_KEY
    if (!privateKeyRaw) {
      console.error('JAAS_PRIVATE_KEY is not set')
      return NextResponse.json({ error: 'Video service not configured.' }, { status: 503 })
    }
    // allow the PEM to be stored as a single line with literal \n escapes (env-friendly)
    const privateKey = privateKeyRaw.includes('\\n') ? privateKeyRaw.replace(/\\n/g, '\n') : privateKeyRaw

    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

    // RLS scopes this read to the session's participants only — doubles as authz
    const { data: s } = await supabase.from('sessions')
      .select('id, daily_room_name, teacher_id, learner_id')
      .eq('id', sessionId).single()
    if (!s) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    if (s.teacher_id !== user.id && s.learner_id !== user.id) {
      return NextResponse.json({ error: 'You are not part of this session.' }, { status: 403 })
    }

    // keep the existing room-name-per-session logic, identical to the session page
    const bareRoom = s.daily_room_name ? `timebank-${s.daily_room_name}` : `timebank-${String(sessionId).slice(0, 12)}`

    // display name for the tile
    const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
    const displayName = (profile?.full_name || user.email || 'Member').toString().slice(0, 80)

    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'RS256', kid: JAAS_KID, typ: 'JWT' }
    const payload = {
      aud: 'jitsi',
      iss: 'chat',
      sub: JAAS_APP_ID,
      room: bareRoom,
      iat: now,
      nbf: now - 10,
      exp: now + 60 * 60 * 3, // 3h — comfortably longer than any single session
      context: {
        user: {
          id: user.id,
          name: displayName,
          email: user.email || '',
          avatar: profile?.avatar_url || '',
          moderator: 'true', // every participant joins as moderator → no waiting wall
        },
        features: {
          livestreaming: 'false',
          recording: 'false',
          transcription: 'false',
          'outbound-call': 'false',
        },
      },
    }

    const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
    const signer = crypto.createSign('RSA-SHA256')
    signer.update(signingInput)
    signer.end()
    let signature: string
    try {
      signature = b64url(signer.sign(privateKey))
    } catch (e) {
      console.error('JaaS JWT signing failed — check JAAS_PRIVATE_KEY format', e)
      return NextResponse.json({ error: 'Video service misconfigured.' }, { status: 503 })
    }
    const jwt = `${signingInput}.${signature}`

    return NextResponse.json({ jwt, room: `${JAAS_APP_ID}/${bareRoom}`, appId: JAAS_APP_ID })
  } catch (err) {
    console.error('jaas-token route error', err)
    return NextResponse.json({ error: 'Could not start the video room.' }, { status: 500 })
  }
}
