"use client"

import { useEffect, useRef, useState } from "react"
import { Globe, Check, ChevronDown } from "lucide-react"
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config"
import { useLanguage } from "@/lib/i18n/provider"

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const current = LOCALE_META[locale]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface)] px-3 py-2 text-sm text-[var(--hub-text)] transition-colors hover:border-[var(--hub-accent)]"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language.choose")}
      >
        <Globe className="h-4 w-4 text-[var(--hub-muted)]" />
        <span className="hidden sm:inline">{current.flag}</span>
        <span>{current.label}</span>
        <ChevronDown className={`h-4 w-4 text-[var(--hub-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("language.choose")}
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] py-1 shadow-xl"
        >
          {LOCALES.map((code: Locale) => {
            const meta = LOCALE_META[code]
            const active = code === locale
            return (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setLocale(code)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--hub-surface)] ${
                    active ? "text-[var(--hub-accent)]" : "text-[var(--hub-text)]"
                  }`}
                >
                  <span className="text-base">{meta.flag}</span>
                  <span className="flex-1">{meta.label}</span>
                  {active && <Check className="h-4 w-4" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
