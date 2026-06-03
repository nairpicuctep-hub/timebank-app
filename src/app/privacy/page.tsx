'use client'

/* Privacy Policy (/privacy) — clean, publishable. Fill [BRACKETS] with real
   company details. Light/Bricolage to match the app. */

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-5 py-12 max-w-2xl mx-auto">
      <a href="/home" className="text-sm text-muted">← Back</a>
      <h1 className="font-display font-semibold text-[30px] text-ink mt-4 mb-1">Privacy Policy</h1>
      <p className="text-xs text-muted font-mono mb-8">Last updated: [DATE]</p>

      <div className="prose-tb flex flex-col gap-6 text-sm text-text leading-relaxed">
        <Section title="1. Who we are">
          TimeBank Academy (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates a peer-to-peer skill-exchange platform where members teach and learn using Time Credits (TC). Data controller: [LEGAL ENTITY NAME], [ADDRESS], Belgium. Contact: privacy@timebank.academy. We process personal data under the EU General Data Protection Regulation (GDPR).
        </Section>

        <Section title="2. What we collect and why">
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li><b>Email, password (hashed), name</b> — to create and secure your account. Basis: contract.</li>
            <li><b>Skills you teach and learn, proficiency</b> — to provide matching and the core service. Basis: contract.</li>
            <li><b>Session records, ratings, Time Credit ledger</b> — to operate the exchange and its economy. Basis: contract.</li>
            <li><b>City, country, languages</b> — for local matching and service quality. Basis: consent.</li>
            <li><b>Age range, gender (optional)</b> — to measure community impact and inclusion. Basis: explicit consent.</li>
            <li><b>Research participation</b> — to include your activity in anonymized, aggregated insights. Basis: explicit consent.</li>
            <li><b>Cookies</b> — essential cookies for login and security (strictly necessary); analytics and marketing cookies only with your consent.</li>
          </ul>
          We practice data minimisation: we collect only what serves these purposes.
        </Section>

        <Section title="3. What we never do">
          We never sell your personal data. We do not share individual records with third parties for their own marketing. Where we publish or share insights, they are aggregated and anonymized — no individual is identifiable, and small groups are suppressed.
        </Section>

        <Section title="4. Aggregated insights">
          With your research consent, your activity may contribute to anonymized statistics about how skills move through communities (for example, demand for a skill in a region). These aggregates contain no personal identifiers and cannot be traced back to you. You can withdraw consent anytime in Privacy &amp; data settings.
        </Section>

        <Section title="5. Service providers">
          We use trusted providers who process data on our behalf under contract: Supabase (database &amp; authentication), Vercel (hosting), Brevo (email), Jitsi (video sessions), and Google (AI features where applicable). [Confirm data-residency details with each provider.]
        </Section>

        <Section title="6. Retention">
          We keep your account data while your account is active. On deletion, we anonymize historical records (session and economy history is retained in anonymized form for integrity and aggregate statistics) and remove personal identifiers.
        </Section>

        <Section title="7. Your rights">
          You have the right to access, rectify, erase, restrict, port, and object. In the app you can download your data and withdraw consent anytime; for deletion, email privacy@timebank.academy. You may also lodge a complaint with the Belgian Data Protection Authority.
        </Section>

        <Section title="8. Cookies">
          Essential cookies are always active. Analytics and marketing cookies require your consent, which you give or refuse via our cookie banner and can change anytime in settings.
        </Section>

        <Section title="9. Children">
          TimeBank is not directed at children under [16]. We do not knowingly process their personal data without parental consent.
        </Section>

        <Section title="10. Changes">
          We will notify you of material changes to this policy. Continued use after changes take effect constitutes acceptance where lawful.
        </Section>
      </div>

      <div className="flex gap-4 justify-center mt-10">
        <a href="/terms" className="text-xs grad-text font-medium">Terms of Service</a>
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
