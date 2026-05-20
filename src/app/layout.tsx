import type { Metadata } from 'next'
import './globals.css'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative z-10">{children}</body>
    </html>
  )
}
