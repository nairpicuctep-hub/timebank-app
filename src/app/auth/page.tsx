'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

type Mode = 'login' | 'signup' | 'forgot'

export default function AuthPage() {
  const t = useTranslations('auth')
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hint, setHint] = useState<{ text: string; action?: () => void; label?: string } | null>(null)
  const [success, setSuccess] = useState('')
  const supabase = createClient()
  const router = useRouter()

  function reset() { setError(''); setHint(null); setSuccess('') }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); reset()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setError(t('errNotConfirmed'))
        setHint({ text: t('hintResend'), label: t('hintResendLabel'), action: resendConfirmation })
      } else if (error.message.includes('Invalid login credentials')) {
        setError(t('errBadCredentials'))
        setHint({ text: t('hintResetPw'), label: t('hintResetLabel'), action: () => { setMode('forgot'); reset() } })
      } else setError(error.message)
      return
    }
    router.push('/auth/confirm')
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); reset()
    if (password.length < 8) { setError(t('errPasswordShort')); setLoading(false); return }
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: name }, emailRedirectTo: `${location.origin}/auth/confirm` },
    })
    setLoading(false)
    if (error) {
      if (error.message.toLowerCase().includes('already') || error.message.includes('registered')) {
        setError(t('errEmailExists'))
        setHint({ text: t('hintTrySignIn'), label: t('hintGoToSignIn'), action: () => { setMode('login'); reset() } })
      } else setError(error.message)
      return
    }
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError(t('errEmailExists'))
      setHint({ text: t('hintTrySignIn'), label: t('hintGoToSignIn'), action: () => { setMode('login'); reset() } })
      return
    }
    if (data.session) { router.push('/auth/confirm'); return }
    setSuccess(t('successSignup'))
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); reset()
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/confirm` })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess(t('successReset'))
  }

  async function resendConfirmation() {
    setLoading(true); reset()
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${location.origin}/auth/confirm` } })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess(t('successResend'))
  }

  async function handleOAuth(provider: 'google' | 'facebook' | 'linkedin_oidc') {
    reset()
    const { error } = await supabase.auth.signInWithOAuth({
      provider, options: { redirectTo: `${location.origin}/auth/confirm` },
    })
    if (error) setError(t('errOAuth', { provider: provider === 'linkedin_oidc' ? 'LinkedIn' : provider, message: error.message }))
  }

  const titles = {
    login:  { h: t('welcomeBack'),    s: t('signInSubtitle') },
    signup: { h: t('createAccount'),  s: t('signUpSubtitle') },
    forgot: { h: t('resetPassword'),  s: t('resetSubtitle') },
  }
  const labelCls = 'block text-xs font-mono text-muted uppercase tracking-widest mb-1.5'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
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
                <button key={m} onClick={() => { setMode(m); reset() }}
                  className="flex-1 py-2 rounded-btn text-sm font-semibold transition-all"
                  style={mode === m ? { background: 'var(--grad)', color: '#fff' } : { color: 'var(--muted)' }}>
                  {m === 'login' ? t('signIn') : t('signUp')}
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
              <button onClick={() => { setSuccess(''); setMode('login') }} className="btn-grad w-full py-3 text-sm">{t('signInNow')} →</button>
            </div>
          ) : (
            <>
              <form onSubmit={mode === 'login' ? handleEmailLogin : mode === 'signup' ? handleSignup : handleForgot}>
                {mode === 'signup' && (
                  <div className="mb-3">
                    <label className={labelCls}>{t('fullName')}</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('fullNamePlaceholder')} required />
                  </div>
                )}
                <div className="mb-3">
                  <label className={labelCls}>{t('email')}</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
                {mode !== 'forgot' && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-mono text-muted uppercase tracking-widest">{t('password')}</label>
                      {mode === 'login' && (
                        <button type="button" onClick={() => { setMode('forgot'); reset() }}
                          className="text-xs font-mono grad-text font-semibold">{t('forgot')}</button>
                      )}
                    </div>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? t('passwordPlaceholder') : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'} required />
                  </div>
                )}

                {error && <p className="text-xs mb-1" style={{ color: 'var(--coral)' }}>{error}</p>}
                {hint && (
                  <p className="text-xs mb-3 text-muted">
                    {hint.text}{' '}
                    {hint.action && <button type="button" onClick={hint.action} className="grad-text font-semibold">{hint.label}</button>}
                  </p>
                )}

                <button type="submit" disabled={loading} className="btn-grad w-full py-3 text-sm">
                  {loading ? '\u2026' : mode === 'login' ? `${t('signIn')} \u2192` : mode === 'signup' ? `${t('createAccount')} \u2192` : `${t('sendResetLink')} \u2192`}
                </button>

                {mode === 'forgot' && (
                  <button type="button" onClick={() => { setMode('login'); reset() }}
                    className="w-full text-center text-xs text-muted mt-3">\u2190 {t('backToSignIn')}</button>
                )}
              </form>

              {mode !== 'forgot' && (
                <>
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
                    <span className="text-xs text-muted font-mono">{t('orContinueWith')}</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <button onClick={() => handleOAuth('google')} className="btn-ghost w-full py-3 text-sm flex items-center justify-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      {t('continueWithGoogle')}
                    </button>

                    <button onClick={() => handleOAuth('facebook')} className="btn-ghost w-full py-3 text-sm flex items-center justify-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08V12h3.05V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.96h-1.52c-1.49 0-1.96.93-1.96 1.87V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12z"/></svg>
                      {t('continueWithFacebook')}
                    </button>

                    <button onClick={() => handleOAuth('linkedin_oidc')} className="btn-ghost w-full py-3 text-sm flex items-center justify-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#0A66C2" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>
                      {t('continueWithLinkedIn')}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-6">{t('tagline')}</p>
      </div>
    </div>
  )
}
