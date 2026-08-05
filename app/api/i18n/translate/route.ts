import { NextResponse } from "next/server"
import { createHash } from "crypto"
import { generateObject } from "ai"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { LOCALES, type Locale } from "@/lib/i18n/config"
import { lookupDictionary, normalizeSource } from "@/lib/i18n/reverse"

export const runtime = "nodejs"
export const maxDuration = 30

const LOCALE_NAMES: Record<Locale, string> = {
  pt: "Portuguese (Brazil)",
  en: "English",
  es: "Spanish",
  it: "Italian",
  ja: "Japanese",
}

function hash(s: string): string {
  return createHash("sha1").update(s).digest("hex")
}

const BodySchema = z.object({
  locale: z.string(),
  texts: z.array(z.string()).max(400),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  const locale = parsed.data.locale as Locale
  if (!LOCALES.includes(locale)) {
    return NextResponse.json({ error: "Idioma não suportado." }, { status: 400 })
  }

  // Português é o idioma-fonte: devolve o próprio texto.
  if (locale === "pt") {
    const map: Record<string, string> = {}
    for (const t of parsed.data.texts) map[t] = t
    return NextResponse.json({ translations: map })
  }

  // Normaliza e deduplica as frases recebidas.
  const uniqueSources = Array.from(
    new Set(parsed.data.texts.map((t) => normalizeSource(t)).filter((t) => t.length > 0)),
  )

  const result: Record<string, string> = {}
  const missing: string[] = []

  // 1) Dicionário manual (alta qualidade, sem custo).
  for (const src of uniqueSources) {
    const fromDict = lookupDictionary(locale, src)
    if (fromDict) result[src] = fromDict
    else missing.push(src)
  }

  const supabase = createAdminClient()

  // 2) Cache no banco (traduz cada frase uma única vez).
  if (missing.length > 0) {
    const hashes = missing.map((s) => hash(s))
    const { data: cached } = await supabase
      .from("i18n_cache")
      .select("source_hash, translated")
      .eq("locale", locale)
      .in("source_hash", hashes)

    const byHash = new Map((cached ?? []).map((r) => [r.source_hash as string, r.translated as string]))
    const stillMissing: string[] = []
    for (const src of missing) {
      const t = byHash.get(hash(src))
      if (t != null) result[src] = t
      else stillMissing.push(src)
    }
    missing.length = 0
    missing.push(...stillMissing)
  }

  // 3) IA (AI Gateway) apenas para o que restou; grava no cache.
  if (missing.length > 0) {
    try {
      const numbered = missing.map((s, i) => `${i + 1}. ${s}`).join("\n")
      const { object } = await generateObject({
        model: "google/gemini-2.5-flash-lite",
        schema: z.object({
          translations: z.array(
            z.object({
              index: z.number().describe("O número da frase (1-based) exatamente como foi enviado."),
              text: z.string().describe("A tradução da frase."),
            }),
          ),
        }),
        system:
          `You are a professional UI translator for a volleyball analytics web app called "Volley Tech". ` +
          `Translate each numbered line from Brazilian Portuguese to ${LOCALE_NAMES[locale]}. ` +
          `Rules: keep the meaning natural and concise for a UI; ` +
          `NEVER translate the brand names "Volley Tech", "Scout Volleyball", "Attack Position", "Summary Game", "Scout View IA", "IPTV"; ` +
          `preserve numbers, punctuation, %, and placeholders like {name} or :count unchanged; ` +
          `return exactly one translation per input line, matching its index.`,
        prompt: numbered,
      })

      const byIndex = new Map(object.translations.map((t) => [t.index, t.text]))
      const rowsToInsert: { locale: string; source_hash: string; source: string; translated: string }[] = []
      missing.forEach((src, i) => {
        const t = byIndex.get(i + 1)
        if (t != null && t.length > 0) {
          result[src] = t
          rowsToInsert.push({ locale, source_hash: hash(src), source: src, translated: t })
        } else {
          result[src] = src // fallback: mantém o original
        }
      })

      if (rowsToInsert.length > 0) {
        await supabase.from("i18n_cache").upsert(rowsToInsert, { onConflict: "locale,source_hash" })
      }
    } catch (e) {
      console.log("[v0] i18n translate IA falhou:", e instanceof Error ? e.message : String(e))
      // Fallback: devolve o texto original para não quebrar a tela.
      for (const src of missing) result[src] = src
    }
  }

  // Mapeia de volta para as chaves originais (antes da normalização).
  const translations: Record<string, string> = {}
  for (const original of parsed.data.texts) {
    const norm = normalizeSource(original)
    translations[original] = result[norm] ?? original
  }

  return NextResponse.json({ translations })
}
