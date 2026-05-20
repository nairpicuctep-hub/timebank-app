import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'

export default async function WalletPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [balanceRes, txRes] = await Promise.all([
    supabase.rpc('get_balance', { p_user_id: user.id }),
    supabase.from('tc_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
  ])

  const balance = balanceRes.data?.[0] || { available_balance: 0, escrowed_balance: 0 }
  const transactions = txRes.data || []

  const reasonLabel: Record<string, string> = {
    session_earned: 'Taught a session',
    session_spent:  'Booked a session',
    admin_grant:    'Admin grant',
    monthly_drip:   'Monthly credits',
    welcome_bonus:  'Welcome bonus',
    referral_bonus: 'Referral bonus',
    refund:         'Session refund',
    penalty:        'Penalty',
    adjustment:     'Balance adjustment',
  }

  return (
    <div className="min-h-screen pb-24 px-5 pt-14">

      <h1 className="font-display text-3xl font-light mb-6 fade-up">TimeCredits ◈</h1>

      {/* Balance hero */}
      <div className="rounded-3xl p-7 mb-6 relative overflow-hidden fade-up-1"
        style={{ background: 'linear-gradient(135deg, #F0A830, #E85030, #D03878)' }}>
        <div className="absolute right-[-20px] bottom-[-30px] font-display text-[140px] leading-none opacity-[0.08] pointer-events-none select-none">◎</div>
        <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Available balance
        </div>
        <div className="font-display text-6xl font-light text-white leading-none">
          {balance.available_balance}
        </div>
        <div className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
          ≈ {balance.available_balance} hours of learning anywhere on Earth
        </div>
        {balance.escrowed_balance > 0 && (
          <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
            + {balance.escrowed_balance} TC pending verification
          </div>
        )}
        <div className="flex gap-2 mt-5">
          {['Earn more', 'History', 'Go Premium'].map(label => (
            <button key={label} className="flex-1 py-2 rounded-xl text-xs font-medium text-white transition-opacity hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Premium upsell */}
      <div className="rounded-2xl p-5 mb-6 flex items-center gap-4 fade-up-2"
        style={{ background: '#1c1917', border: '1px solid rgba(240,168,48,0.2)' }}>
        <div className="text-2xl">✦</div>
        <div className="flex-1">
          <div className="text-sm font-medium mb-0.5">Go Premium — €4.99/mo</div>
          <div className="text-xs text-muted">Get 5 TC every month, priority matching, and no limits.</div>
        </div>
        <button className="text-xs font-mono px-3 py-2 rounded-xl whitespace-nowrap"
          style={{ background: 'linear-gradient(135deg, #F0A830, #D03878)', color: '#fff' }}>
          Upgrade →
        </button>
      </div>

      {/* Transaction list */}
      <div className="fade-up-2" style={{ background: '#1c1917', border: '1px solid rgba(245,237,216,0.08)', borderRadius: '20px', overflow: 'hidden' }}>
        <div className="px-5 py-4 font-display text-lg" style={{ borderBottom: '1px solid rgba(245,237,216,0.06)' }}>
          Activity
        </div>
        {transactions.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted">
            No transactions yet — teach your first session to earn TC!
          </div>
        ) : (
          transactions.map(tx => (
            <div key={tx.id} className="flex items-center gap-3 px-5 py-4"
              style={{ borderBottom: '1px solid rgba(245,237,216,0.04)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: tx.direction === 'credit' ? 'rgba(30,216,160,0.1)' : 'rgba(208,56,120,0.1)' }}>
                {tx.direction === 'credit' ? '↑' : '↓'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{reasonLabel[tx.reason] || tx.reason}</div>
                {tx.note && <div className="text-xs text-muted truncate mt-0.5">{tx.note}</div>}
                <div className="text-xs text-muted mt-0.5 font-mono">
                  {new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {tx.is_escrowed && ' · pending'}
                </div>
              </div>
              <div className="font-mono text-sm font-medium flex-shrink-0"
                style={{ color: tx.direction === 'credit' ? '#1ED8A0' : '#D03878' }}>
                {tx.direction === 'credit' ? '+' : '−'}{tx.amount} TC
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav active="wallet" />
    </div>
  )
}
