import type { MetadataRoute } from 'next'

// Web app manifest — makes TimeBank Academy installable (add-to-home-screen).
// Icons derive from the real logo; background matches the branded splash and
// theme_color is the brand coral. (Native store apps are out of scope.)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TimeBank Academy',
    short_name: 'TimeBank',
    description: '1 hour taught = 1 TimeCredit = 1 hour learned from anyone on earth.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAF2EA',
    theme_color: '#E85030',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
