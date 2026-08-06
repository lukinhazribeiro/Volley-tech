/**
 * Volley Hub — IGD (Índice Geral de Desenvolvimento).
 *
 * Principal índice individual da atleta. É recalculado automaticamente sempre
 * que muda qualquer uma das três parcelas (novo scout ou nova avaliação física):
 *
 *   IGD = média(IPTV) + média(IPF) + Último TGP
 *
 * As parcelas ausentes são simplesmente ignoradas na média (o índice usa apenas
 * o que existe), para nunca penalizar uma atleta por falta de dados.
 */

import { buildChapters } from "./aggregate"
import { computeIPF, averageIPF, type PhysicalAssessment } from "./physical"
import type { HubAthlete, HubHistoryEntry } from "./types"

export interface IGDParts {
  /** Média do IPTV nos capítulos técnicos (0-100) ou null. */
  iptv: number | null
  /** Média do IPF nas avaliações físicas (0-100) ou null. */
  ipf: number | null
  /** Último TGP registrado (0-100) ou null. */
  tgp: number | null
  /** Índice geral (0-100) ou null quando não há nenhuma parcela. */
  igd: number | null
}

/** Média do IPTV dos capítulos (já calculado por posição em buildChapters). */
export function averageIPTV(entries: HubHistoryEntry[]): number | null {
  const chapters = buildChapters(entries)
  const indices = chapters.map((c) => c.iptv).filter((x) => x > 0)
  if (indices.length === 0) return null
  return Math.round(indices.reduce((a, b) => a + b, 0) / indices.length)
}

/** Último TGP registrado (capítulo cronologicamente mais recente com o dado). */
export function lastTGP(entries: HubHistoryEntry[]): number | null {
  // listEntriesForAthlete devolve em ordem crescente; o último com tgp é o mais recente.
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].tgp != null) return entries[i].tgp
  }
  return null
}

/**
 * Calcula o IGD e suas parcelas a partir do histórico técnico e das avaliações
 * físicas de uma atleta. A média usa apenas as parcelas disponíveis.
 */
export function computeIGD(
  entries: HubHistoryEntry[],
  assessments: PhysicalAssessment[],
): IGDParts {
  const iptv = averageIPTV(entries)
  const ipf = averageIPF(assessments)
  const tgp = lastTGP(entries)

  const available = [iptv, ipf, tgp].filter((x): x is number => x != null)
  const igd = available.length > 0 ? Math.round(available.reduce((a, b) => a + b, 0) / available.length) : null

  return { iptv, ipf, tgp, igd }
}

/** Rótulo qualitativo do IGD, para leitura rápida. */
export function igdLabel(igd: number | null): string {
  if (igd == null) return "Sem dados"
  if (igd >= 80) return "Excelente"
  if (igd >= 65) return "Muito bom"
  if (igd >= 50) return "Bom"
  if (igd >= 35) return "Em desenvolvimento"
  return "Inicial"
}

export { computeIPF }
export type { HubAthlete, PhysicalAssessment }
