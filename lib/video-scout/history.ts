// Histórico de partidas salvas localmente (localStorage).
// Cada partida é guardada de forma isolada, para que uma nova partida nunca
// se misture com outra já registrada.

import type { MatchState } from "./match"

export interface MatchHistoryEntry {
  id: string
  savedAt: number
  teamAName: string
  teamBName: string
  scoreA: number
  scoreB: number
  totalAcoes: number
  /** Estado completo da partida, para reabrir e ver o relatório. */
  match: MatchState
}

const KEY = "volleytech_match_history_v1"

/** Lê o histórico do localStorage (ordenado do mais recente para o mais antigo). */
export function loadHistory(): MatchHistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as MatchHistoryEntry[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function persist(list: MatchHistoryEntry[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)))
  } catch {
    // Ignora estouro de cota silenciosamente.
  }
}

/** Salva uma cópia da partida no histórico e retorna a lista atualizada. */
export function saveToHistory(match: MatchState): MatchHistoryEntry[] {
  const entry: MatchHistoryEntry = {
    id: `m_${Date.now().toString(36)}`,
    savedAt: Date.now(),
    teamAName: match.teamA.name,
    teamBName: match.teamB.name,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    totalAcoes: match.actions.length,
    // Clona para desacoplar totalmente da partida em andamento.
    match: JSON.parse(JSON.stringify(match)) as MatchState,
  }
  const next = [entry, ...loadHistory()]
  persist(next)
  return next
}

/** Remove uma partida do histórico. */
export function deleteFromHistory(id: string): MatchHistoryEntry[] {
  const next = loadHistory().filter((e) => e.id !== id)
  persist(next)
  return next
}

/** Indica se a partida tem registros que valem a pena salvar. */
export function hasData(match: MatchState): boolean {
  return match.actions.length > 0 || match.scoreA > 0 || match.scoreB > 0
}
