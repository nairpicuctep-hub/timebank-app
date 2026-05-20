'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/confirm` }
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/confirm` }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, #F0A830 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full opacity-8"
          style={{ background: 'radial-gradient(ellipse, #D03878 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10 fade-up">
          <div className="font-display text-3xl font-light mb-2">time<em>bank</em></div>
          <div className="text-xs text-muted font-mono tracking-widest uppercase">academy</div>
        </div>

        <div className="fade-up-1"
          style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)', borderRadius: '24px', padding: '32px' }}>

          {!sent ? (
            <>
              <h1 className="font-display text-2xl font-light mb-2">Welcome back</h1>
              <p className="text-sm text-muted mb-8 leading-relaxed">
                Enter your email and we'll send you a magic link — no password needed.
              </p>

              <form onSubmit={handleMagicLink}>
                <div className="mb-4">
                  <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-2">Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required />
                </div>
                {error && <p className="text-xs mb-4" style={{ color: '#E85030' }}>{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-white text-sm font-medium transition-opacity disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
                  {loading ? 'Sending…' : 'Send magic link →'}
                </button>
              </form>

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px" style={{ background: 'rgba(245,237,216,0.08)' }} />
                <span className="text-xs text-muted font-mono">or</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(245,237,216,0.08)' }} />
              </div>

              <button onClick={handleGoogle}
                className="w-full py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                style={{ background: '#242018', border: '1px solid rgba(245,237,216,0.08)', color: '#F5EDD8' }}>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <p className="text-center text-xs text-muted mt-6 leading-relaxed">
                By continuing you agree to our{' '}
                <a href="https://timebank.academy/terms" className="underline" style={{ color: '#F0A830' }}>Terms</a>
                {' '}and{' '}
                <a href="https://timebank.academy/privacy" className="underline" style={{ color: '#F0A830' }}>Privacy Policy</a>.
              </p>
            </>
          ) : (
            <div className="text-center py-4 fade-up">
              <div className="text-4xl mb-4">✦</div>
              <h2 className="font-display text-2xl font-light mb-3">Check your inbox</h2>
              <p className="text-sm text-muted leading-relaxed mb-6">
                We sent a magic link to <strong style={{ color: '#F5EDD8' }}>{email}</strong>.
                Click it to sign in.
              </p>
              <button onClick={() => { setSent(false); setEmail('') }}
                className="text-xs font-mono" style={{ color: '#9a8f82' }}>
                ← Use a different email
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-8 fade-up-2">
          New to TimeBank?{' '}
          <span style={{ color: '#F0A830' }}>You're in the right place.</span>
          {' '}We'll set you up after you sign in.
        </p>
      </div>
    </div>
  )
}
