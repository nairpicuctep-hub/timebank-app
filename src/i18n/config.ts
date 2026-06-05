// Pure locale config — no server-only imports (safe for client components).
// Keep this free of next/headers etc. so it can be imported anywhere.

export const locales = ['en', 'nl', 'fr', 'ro'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  nl: 'Nederlands',
  fr: 'Français',
  ro: 'Română',
}

export const LOCALE_COOKIE = 'tb_locale'
