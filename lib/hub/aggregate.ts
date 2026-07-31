/**
 * Volley Hub — agregações de alto nível para Dashboard, IPTV e Linha do Tempo.
 */

import { aggregateFundamentals, trendFrom, type PlayerFundamentals, type Trend } from "./stats"
import { computeIPTV, percentuais } from "./intelligence"
import type { HubHistoryEntry } from "./types"

/** Ordena capítulos por temporada e data. */
export function sortChronologically(entries: HubHistoryEntry[]): HubHistoryEntry[] {
  return [...entries].sort((a, b) => {
    const sa = a.season ?? ""
    const sb = b.season ?? ""
    if (sa !== sb) return sa.localeCompare(sb)
    const da = a.match_date ?? ""
    const db = b.match_date ?? ""
    return da.localeCompare(db)
  })
}

/** Um capítulo da linha do tempo (agrupado por temporada + competição). */
export interface TimelineChapter {
  key: string
  season: string | null
  team: string | null
  category: string | null
  competition: string | null
  entries: HubHistoryEntry[]
  fundamentals: PlayerFundamentals
  iptv: number
}

/** Agrupa as entradas em capítulos (temporada + competição + equipe). */
export function buildChapters(entries: HubHistoryEntry[]): TimelineChapter[] {
  const groups = new Map<string, HubHistoryEntry[]>()
  for (const e of sortChronologically(entries)) {
    const key = `${e.season ?? "?"}|${e.competition ?? "?"}|${e.team ?? "?"}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(e)
  }
  return Array.from(groups.entries()).map(([key, list]) => {
    const fundamentals = aggregateFundamentals(list.map((e) => e.stats))
    return {
      key,
      season: list[0].season,
      team: list[0].team,
      category: list[0].category,
      competition: list[0].competition,
      entries: list,
      fundamentals,
      iptv: computeIPTV(fundamentals),
    }
  })
}

/** Evolução (percentuais por capítulo) para gráficos. */
export function evolutionSeries(chapters: TimelineChapter[]) {
  return chapters.map((c) => ({
    label: c.competition || c.season || "—",
    season: c.season,
    ...percentuais(c.fundamentals),
    iptv: c.iptv,
  }))
}

/**
 * Tendência geral entre o penúltimo e o último capítulo (para o Dashboard
 * "atletas em evolução").
 */
export function overallTrend(chapters: TimelineChapter[]): { trend: Trend; deltaIPTV: number } {
  if (chapters.length < 2) return { trend: "stable", deltaIPTV: 0 }
  const prev = chapters[chapters.length - 2].iptv
  const cur = chapters[chapters.length - 1].iptv
  return { trend: trendFrom(prev, cur), deltaIPTV: cur - prev }
}
