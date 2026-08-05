export const LOCALES = ["pt", "en", "es", "it", "ja"] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "pt"

/** Metadados de cada idioma para o seletor (bandeira em emoji + rótulo nativo). */
export const LOCALE_META: Record<Locale, { label: string; flag: string; htmlLang: string }> = {
  pt: { label: "Português", flag: "🇧🇷", htmlLang: "pt-BR" },
  en: { label: "English", flag: "🇺🇸", htmlLang: "en" },
  es: { label: "Español", flag: "🇪🇸", htmlLang: "es" },
  it: { label: "Italiano", flag: "🇮🇹", htmlLang: "it" },
  ja: { label: "日本語", flag: "🇯🇵", htmlLang: "ja" },
}

export const LOCALE_STORAGE_KEY = "volley_tech_locale"

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value)
}
