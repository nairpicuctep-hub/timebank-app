import type { Metadata, Viewport } from 'next'
import './globals.css'
import CookieConsent from '@/components/CookieConsent'
import { FeedbackHost } from '@/components/ui/Feedback'
import AppSplash from '@/components/AppSplash'
import PWARegister from '@/components/PWARegister'
import TrackBeacon from '@/components/TrackBeacon'
import AppFrame from '@/components/layout/AppFrame'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export const metadata: Metadata = {
  title: 'TimeBank Academy',
  description: '1 hour taught = 1 TimeCredit = 1 hour learned from anyone on earth.',
  metadataBase: new URL('https://app.timebank.academy'),
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'TimeBank', statusBarStyle: 'default' },
  openGraph: {
    title: 'TimeBank Academy',
    description: 'Peer-to-peer skill exchange. Zero fees.',
    url: 'https://app.timebank.academy',
    siteName: 'TimeBank Academy',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
}

export const viewport: Viewport = {
  themeColor: '#E85030',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages()
  return (
    <html lang="en">
      <body className="relative z-10">
        <NextIntlClientProvider messages={messages}>
          <AppFrame>{children}</AppFrame>
          <CookieConsent />
          <FeedbackHost />
          <AppSplash />
          <PWARegister />
          <TrackBeacon />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}