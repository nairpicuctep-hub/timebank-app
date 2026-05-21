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
      if (error.message.includes('Email not confirmed')) {
        setError('Please check your email and confirm your account first.')
      } else if (error.message.includes('Invalid login credentials')) {
        setError('Wrong email or password.')
      } else {
        setError(error.message)
      }
      return
    }
    router.push('/auth/confirm')
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false); return
    }

    // Sign up without email confirmation requirement
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        // No emailRedirectTo = Supabase won't require confirmation if disabled
      }
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    // If session exists immediately, user is auto-confirmed
    if (data.session) {
      router.push('/auth/confirm')
      return
    }

    // Otherwise show success but let them try logging in
    setSuccess('Account created! You can now sign in with your email and password.')
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/confirm`
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess('Password reset link sent — check your inbox.')
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/confirm` }
    })
  }

  const titles = {
    login: { h: 'Welcome back', s: 'Sign in to your account' },
    signup: { h: 'Create account', s: 'Join TimeBank Academy — free forever' },
    forgot: { h: 'Reset password', s: 'We\'ll send you a reset link' }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, #F0A830 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full opacity-8"
          style={{ background: 'radial-gradient(ellipse, #D03878 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8 fade-up">
          <div className="font-display text-3xl font-light mb-1">time<em>bank</em></div>
          <div className="text-xs text-muted font-mono tracking-widest uppercase">academy</div>
        </div>

        <div className="fade-up-1"
          style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)', borderRadius: '24px', padding: '32px' }}>

          {mode !== 'forgot' && (
            <div className="flex mb-6" style={{ background: '#242018', borderRadius: '12px', padding: '4px' }}>
              {(['login','signup'] as Mode[]).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize"
                  style={{
                    background: mode === m ? 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' : 'transparent',
                    color: mode === m ? '#fff' : '#9a8f82'
                  }}>
                  {m === 'login' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>
          )}

          <h1 className="font-display text-2xl font-light mb-1">{titles[mode].h}</h1>
          <p className="text-xs text-muted mb-6">{titles[mode].s}</p>

          {success ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3">✦</div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#1ED8A0' }}>{success}</p>
              <button onClick={() => { setSuccess(''); setMode('login') }}
                className="w-full py-3 rounded-xl text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
                Sign in now →
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={mode === 'login' ? handleEmailLogin : mode === 'signup' ? handleSignup : handleForgot}>
                {mode === 'signup' && (
                  <div className="mb-3">
                    <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1.5">Full name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Your name" required />
                  </div>
                )}

                <div className="mb-3">
                  <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1.5">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required />
                </div>

                {mode !== 'forgot' && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-mono text-muted uppercase tracking-widest">Password</label>
                      {mode === 'login' && (
                        <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                          className="text-xs font-mono" style={{ color: '#F0A830' }}>
                          Forgot?
                        </button>
                      )}
                    </div>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'} required />
                  </div>
                )}

                {error && <p className="text-xs mb-3" style={{ color: '#E85030' }}>{error}</p>}

                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-white text-sm font-medium transition-opacity disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
                  {loading ? '…' : mode === 'login' ? 'Sign in →' : mode === 'signup' ? 'Create account →' : 'Send reset link →'}
                </button>

                {mode === 'forgot' && (
                  <button type="button" onClick={() => { setMode('login'); setError('') }}
                    className="w-full text-center text-xs text-muted mt-3">
                    ← Back to sign in
                  </button>
                )}
              </form>

              {mode !== 'forgot' && (
                <>
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px" style={{ background: 'rgba(245,237,216,0.08)' }} />
                    <span className="text-xs text-muted font-mono">or</span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(245,237,216,0.08)' }} />
                  </div>

                  <button onClick={handleGoogle}
                    className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 mb-3"
                    style={{ background: '#242018', border: '1px solid rgba(245,237,216,0.08)', color: '#F5EDD8' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>

                  <button disabled
                    className="w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 opacity-40 cursor-not-allowed"
                    style={{ background: '#242018', border: '1px solid rgba(245,237,216,0.08)', color: '#F5EDD8' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn <span style={{ fontSize: '10px', color: '#9a8f82' }}>(coming soon)</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-6">
          By continuing you agree to our{' '}
          <a href="https://timebank.academy/terms" style={{ color: '#F0A830' }}>Terms</a>
          {' '}and{' '}
          <a href="https://timebank.academy/privacy" style={{ color: '#F0A830' }}>Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
