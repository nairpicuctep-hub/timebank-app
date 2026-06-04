import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

// Supported locales. 'en' is the source/base.
export const locales = ['en', 'nl', 'fr', 'ro'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  nl: 'Nederlands',
  fr: 'Français',
  ro: 'Română',
}

const COOKIE = 'tb_locale'

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
