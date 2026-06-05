import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { locales, defaultLocale, LOCALE_COOKIE, type Locale } from './config'

// Re-export the pure config so existing imports from '@/i18n/request' keep working.
// New client-side code should import from '@/i18n/config' directly to avoid pulling
// in next/headers (server-only).
export { locales, defaultLocale, localeNames, type Locale } from './config'

const COOKIE = LOCALE_COOKIE

// No-routing setup: the active locale lives in a cookie, not the URL path.
// This avoids restructuring the whole app/ directory under an [locale] segment.
export default getRequestConfig(async () => {
  const store = await cookies()
  const cookieLocale = store.get(COOKIE)?.value as Locale | undefined
  const locale: Locale =
    cookieLocale && locales.includes(cookieLocale) ? cookieLocale : defaultLocale

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
