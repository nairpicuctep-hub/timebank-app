'use client'

import { useEffect } from 'react'
import { enablePush, showLocalNotification } from '@/lib/pushClient'

/* Registers the service worker (production only) for installable-PWA + offline
   shell, and — the moment the app is installed to the home screen — offers to
   turn on push notifications and shows a welcome notification on success. */
export default function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const onLoad = () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) }
    window.addEventListener('load', onLoad)

    // Fires once, right after the user installs the PWA. Good moment to ask for
    // notifications — they've just committed to the app. enablePush() prompts
    // for permission; if granted we greet them with a local notification.
    const onInstalled = async () => {
      const res = await enablePush()
      if (res === 'enabled') {
        await showLocalNotification(
          'Welcome to TimeBank Academy 🎉',
          "Notifications are on — you'll hear about messages, requests and your sessions.",
          '/home',
        )
      }
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('load', onLoad)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  return null
}
