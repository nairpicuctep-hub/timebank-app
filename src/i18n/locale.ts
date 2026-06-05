'use server'

import { cookies } from 'next/headers'
import { locales, defaultLocale, LOCALE_COOKIE, type Locale } from './config'

const COOKIE = LOCALE_COOKIE

export async function getUserLocale(): Promise<Locale> {
  const store = await cookies()
  const v = store.get(COOKIE)?.value as Locale | undefined
  return v && locales.includes(v) ? v : defaultLocale
}

export async function setUserLocale(locale: Locale) {
  if (!locales.includes(locale)) return
  const store = await cookies()
  // 1 year, available app-wide
  store.set(COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
}
