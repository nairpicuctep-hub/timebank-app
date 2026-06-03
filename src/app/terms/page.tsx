'use client'

/* Terms of Service (/terms) — clean, publishable. Fill [BRACKETS].
   The "Time Credits have no monetary value" clause is intentional and
   load-bearing — it keeps TC outside financial-services regulation. */

export default function TermsPage() {
  return (
    <div className="min-h-screen px-5 py-12 max-w-2xl mx-auto">
      <a href="/home" className="text-sm text-muted">← Back</a>
      <h1 className="font-display font-semibold text-[30px] text-ink mt-4 mb-1">Terms of Service</h1>
      <p className="text-xs text-muted font-mono mb-8">Last updated: [DATE]</p>

      <div className="flex flex-col gap-6">
        <Section title="1. The service">
          TimeBank Academy is a platform for exchanging skills using Time Credits (TC). TC represent time taught and learned. TC have no monetary value, are not currency, are not redeemable for cash, and cannot be transferred off the platform.
        </Section>
        <Section title="2. Eligibility">
          You must be at least [16] and able to enter a binding agreement.
        </Section>
        <Section title="3. Time Credits">
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>New members receive a starting balance of TC.</li>
            <li>You earn TC by teaching and spend TC by learning.</li>
            <li>TC are held in escrow when a session is booked and released when both parties confirm.</li>
            <li>We may adjust, withhold, or reverse TC in cases of fraud, abuse, or fabricated sessions.</li>
            <li>TC are not property and have no cash value.</li>
          </ul>
        </Section>
        <Section title="4. Conduct">
          You agree to teach and learn in good faith, not to fabricate sessions to obtain TC, not to harass other members, and not to misrepresent your skills or identity. Fake or non-genuine sessions are prohibited and may result in TC reversal and account termination.
        </Section>
        <Section title="5. Sessions and content">
          You are responsible for content you share in sessions. We provide video through Jitsi and may offer optional AI-generated lesson plans; these are aids, not professional advice.
        </Section>
        <Section title="6. Verified profiles">
          &ldquo;Verified Master&rdquo; or VIP status is assigned by us to genuine, consenting expert members. It does not constitute our endorsement of their advice.
        </Section>
        <Section title="7. No professional advice">
          Skills shared on TimeBank — including legal, financial, and medical topics — are peer knowledge, not professional advice. Consult a qualified professional for important decisions.
        </Section>
        <Section title="8. Liability">
          To the extent permitted by law, we provide the service &ldquo;as is&rdquo; and are not liable for indirect or consequential losses. Nothing limits liability that cannot be limited under Belgian or EU consumer law.
        </Section>
        <Section title="9. Termination">
          We may suspend or terminate accounts for breach of these terms. You may close your account at any time.
        </Section>
        <Section title="10. Governing law">
          These terms are governed by Belgian law, with disputes subject to the competent courts of [JURISDICTION], without prejudice to mandatory consumer protections.
        </Section>
        <Section title="11. Contact">
          [LEGAL ENTITY NAME], [ADDRESS] — hello@timebank.academy
        </Section>
      </div>

      <div className="flex gap-4 justify-center mt-10">
        <a href="/privacy" className="text-xs grad-text font-medium">Privacy Policy</a>
        <a href="/settings/privacy" className="text-xs grad-text font-medium">Privacy settings</a>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display font-semibold text-base text-ink mb-1.5">{title}</h2>
      <div className="text-sm text-text leading-relaxed flex flex-col gap-2">{children}</div>
    </section>
  )
}
