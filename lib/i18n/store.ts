"use client"

import { createClient } from "@/lib/supabase/client"
import { DEFAULT_LOCALE, isLocale, LOCALE_STORAGE_KEY, type Locale } from "./config"

/** Lê o idioma salvo neste dispositivo (usado imediatamente, sem esperar rede). */
export function readLocalLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    return isLocale(raw) ? raw : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

export function writeLocalLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // ignora indisponibilidade de storage
  }
}

/** Lê o idioma salvo na conta (Supabase). Retorna null se não houver sessão/registro. */
export async function fetchAccountLocale(): Promise<Locale | null> {
  try {
    const supabase = createClient()
    const { data: userRes } = await supabase.auth.getUser()
    const userId = userRes.user?.id
    if (!userId) return null
    const { data, error } = await supabase
      .from("user_preferences")
      .select("locale")
      .eq("user_id", userId)
      .maybeSingle()
    if (error) return null
    return isLocale(data?.locale) ? (data!.locale as Locale) : null
  } catch {
    return null
  }
}

/** Salva o idioma na conta (todas as máquinas). Silencioso em caso de erro. */
export async function saveAccountLocale(locale: Locale): Promise<void> {
  try {
    const supabase = createClient()
    const { data: userRes } = await supabase.auth.getUser()
    const userId = userRes.user?.id
    if (!userId) return
    await supabase
      .from("user_preferences")
      .upsert({ user_id: userId, locale, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
  } catch {
    // ignora — o idioma local já foi aplicado
  }
}
