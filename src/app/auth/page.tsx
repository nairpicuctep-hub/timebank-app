'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'signup' | 'forgot'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()
  const router = useRouter()

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      if (error.message.includes('Email not confirmed')) setError('Please confirm your account via the email we sent first.')
      else if (error.message.includes('Invalid login credentials')) setError('Wrong email or password.')
      else setError(error.message)
      return
    }
    router.push('/auth/confirm')
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); setLoading(false); return }
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: name } },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    if (data.session) { router.push('/auth/confirm'); return }
    setSuccess('Account created! You can now sign in with your email and password.')
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/confirm` })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess('Password reset link sent — check your inbox.')
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth/confirm` } })
  }

  const titles = {
    login:  { h: 'Welcome back', s: 'Sign in to your account' },
    signup: { h: 'Create account', s: 'Join TimeBank Academy — free forever' },
    forgot: { h: 'Reset password', s: "We'll send you a reset link" },
  }

  const labelCls = 'block text-xs font-mono text-muted uppercase tracking-widest mb-1.5'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(ellipse,#F0A830 0%,transparent 70%)', opacity: 0.18 }} />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(ellipse,#D03878 0%,transparent 70%)', opacity: 0.14 }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8 rise">
          <div className="font-display font-semibold text-3xl text-ink">time<span className="grad-text">bank</span></div>
          <div className="text-xs text-muted font-mono tracking-[0.3em] uppercase mt-1">academy</div>
        </div>

        <div className="glass rise-1" style={{ padding: 32 }}>
          {mode !== 'forgot' && (
            <div className="flex mb-6 p-1 rounded-btn" style={{ background: 'var(--cream-2)' }}>
              {(['login', 'signup'] as Mode[]).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
                  className="flex-1 py-2 rounded-btn text-sm font-semibold transition-all"
                  style={mode === m ? { background: 'var(--grad)', color: '#fff' } : { color: 'var(--muted)' }}>
                  {m === 'login' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>
          )}

          <h1 className="font-display font-semibold text-2xl text-ink mb-1">{titles[mode].h}</h1>
          <p className="text-xs text-muted mb-6">{titles[mode].s}</p>

          {success ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3">✦</div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--mint)' }}>{success}</p>
              <button onClick={() => { setSuccess(''); setMode('login') }} className="btn-grad w-full py-3 text-sm">Sign in now →</button>
            </div>
          ) : (
            <>
              <form onSubmit={mode === 'login' ? handleEmailLogin : mode === 'signup' ? handleSignup : handleForgot}>
                {mode === 'signup' && (
                  <div className="mb-3">
                    <label className={labelCls}>Full name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required />
                  </div>
                )}
                <div className="mb-3">
                  <label className={labelCls}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
                {mode !== 'forgot' && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-mono text-muted uppercase tracking-widest">Password</label>
                      {mode === 'login' && (
                        <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                          className="text-xs font-mono grad-text font-semibold">Forgot?</button>
                      )}
                    </div>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'} required />
                  </div>
                )}

                {error && <p className="text-xs mb-3" style={{ color: 'var(--coral)' }}>{error}</p>}

                <button type="submit" disabled={loading} className="btn-grad w-full py-3 text-sm">
                  {loading ? '…' : mode === 'login' ? 'Sign in →' : mode === 'signup' ? 'Create account →' : 'Send reset link →'}
                </button>

                {mode === 'forgot' && (
                  <button type="button" onClick={() => { setMode('login'); setError('') }}
                    className="w-full text-center text-xs text-muted mt-3">← Back to sign in</button>
                )}
              </form>

              {mode !== 'forgot' && (
                <>
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
                    <span className="text-xs text-muted font-mono">or</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
                  </div>

                  <button onClick={handleGoogle} className="btn-ghost w-full py-3 text-sm flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>
                </>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-6">Teach what you know. Learn what you need.</p>
      </div>
    </div>
  )
}
