import type { Metadata } from 'next'
import './globals.css'
import CookieConsent from '@/components/CookieConsent'
import { FeedbackHost } from '@/components/ui/Feedback'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export const metadata: Metadata = {
  title: 'TimeBank Academy',
  description: '1 hour taught = 1 TimeCredit = 1 hour learned from anyone on earth.',
  metadataBase: new URL('https://app.timebank.academy'),
  openGraph: {
    title: 'TimeBank Academy',
    description: 'Peer-to-peer skill exchange. Zero fees.',
    url: 'https://app.timebank.academy',
    siteName: 'TimeBank Academy',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages()
  return (
    <html lang="en">
      <body className="relative z-10">
        <NextIntlClientProvider messages={messages}>
          {children}
          <CookieConsent />
          <FeedbackHost />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}