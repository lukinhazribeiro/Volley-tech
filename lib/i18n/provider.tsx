"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "./config"
import { DICTIONARIES } from "./dictionaries"
import { fetchAccountLocale, readLocalLocale, saveAccountLocale, writeLocalLocale } from "./store"

interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  /** Traduz uma chave; cai no português e depois na própria chave se faltar. */
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  // 1) Aplica imediatamente o idioma do dispositivo. 2) Sincroniza com a conta.
  useEffect(() => {
    const local = readLocalLocale()
    setLocaleState(local)
    document.documentElement.lang = LOCALE_META[local].htmlLang

    let active = true
    fetchAccountLocale().then((accountLocale) => {
      if (active && accountLocale && accountLocale !== local) {
        setLocaleState(accountLocale)
        writeLocalLocale(accountLocale)
        document.documentElement.lang = LOCALE_META[accountLocale].htmlLang
      }
    })
    return () => {
      active = false
    }
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    writeLocalLocale(next)
    document.documentElement.lang = LOCALE_META[next].htmlLang
    void saveAccountLocale(next)
  }, [])

  const t = useCallback(
    (key: string) => {
      return DICTIONARIES[locale]?.[key] ?? DICTIONARIES[DEFAULT_LOCALE]?.[key] ?? key
    },
    [locale],
  )

  return <LanguageContext.Provider value={{ locale, setLocale, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    // Fallback seguro fora do provider (ex.: testes/SSR): usa português.
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key: string) => DICTIONARIES[DEFAULT_LOCALE]?.[key] ?? key,
    }
  }
  return ctx
}

/** Atalho para uso direto: `const t = useT()`. */
export function useT() {
  return useLanguage().t
}
