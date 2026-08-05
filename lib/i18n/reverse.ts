import { DICTIONARIES } from "./dictionaries"
import type { Locale } from "./config"

/**
 * Índice reverso: para cada idioma, mapeia o texto em português (normalizado)
 * -> texto já traduzido à mão no dicionário. Assim, a camada de tradução
 * automática reaproveita as traduções de alta qualidade que já escrevemos,
 * antes de recorrer ao cache do banco ou à IA.
 */
export function normalizeSource(s: string): string {
  return s.replace(/\s+/g, " ").trim()
}

const reverseByLocale = new Map<Locale, Map<string, string>>()

function buildReverse(locale: Locale): Map<string, string> {
  const cached = reverseByLocale.get(locale)
  if (cached) return cached

  const pt = DICTIONARIES.pt
  const target = DICTIONARIES[locale]
  const map = new Map<string, string>()
  for (const key of Object.keys(pt)) {
    const ptText = pt[key]
    const translated = target[key]
    if (ptText && translated) {
      map.set(normalizeSource(ptText).toLowerCase(), translated)
    }
  }
  reverseByLocale.set(locale, map)
  return map
}

/** Retorna a tradução manual do dicionário, se existir, para um texto PT. */
export function lookupDictionary(locale: Locale, source: string): string | undefined {
  if (locale === "pt") return source
  const map = buildReverse(locale)
  return map.get(normalizeSource(source).toLowerCase())
}
