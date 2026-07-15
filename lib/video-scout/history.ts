// Histórico de partidas salvas na nuvem (Supabase), atrelado à conta do usuário.
// Cada partida é guardada de forma isolada, disponível em qualquer dispositivo e
// sincronizada em tempo real entre sessões abertas simultaneamente.

import { createClient } from "@/lib/supabase/client"
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

interface HistoryRow {
  id: string
  team_a_name: string
  team_b_name: string
  score_a: number
  score_b: number
  total_acoes: number
  match: MatchState
  saved_at: string
}

function rowToEntry(row: HistoryRow): MatchHistoryEntry {
  return {
    id: row.id,
    teamAName: row.team_a_name,
    teamBName: row.team_b_name,
    scoreA: row.score_a,
    scoreB: row.score_b,
    totalAcoes: row.total_acoes,
    match: row.match,
    savedAt: new Date(row.saved_at).getTime(),
  }
}

/** Lê o histórico da conta (ordenado do mais recente para o mais antigo). */
export async function loadHistory(): Promise<MatchHistoryEntry[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("vs_match_history")
    .select("id, team_a_name, team_b_name, score_a, score_b, total_acoes, match, saved_at")
    .order("saved_at", { ascending: false })
    .limit(50)

  if (error || !data) return []
  return data.map((r) => rowToEntry(r as HistoryRow))
}

/** Salva uma cópia da partida no histórico e retorna a lista atualizada. */
export async function saveToHistory(match: MatchState): Promise<MatchHistoryEntry[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return loadHistory()

  await supabase.from("vs_match_history").insert({
    user_id: user.id,
    team_a_name: match.teamA.name,
    team_b_name: match.teamB.name,
    score_a: match.scoreA,
    score_b: match.scoreB,
    total_acoes: match.actions.length,
    // Clona para desacoplar totalmente da partida em andamento.
    match: JSON.parse(JSON.stringify(match)) as MatchState,
  })
  return loadHistory()
}

/** Remove uma partida do histórico. */
export async function deleteFromHistory(id: string): Promise<MatchHistoryEntry[]> {
  const supabase = createClient()
  await supabase.from("vs_match_history").delete().eq("id", id)
  return loadHistory()
}

/** Reage a mudanças (em qualquer dispositivo) chamando o callback. */
export function subscribeToHistory(onChange: () => void): () => void {
  const supabase = createClient()
  const channel = supabase
    .channel("vs_match_history_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "vs_match_history" }, () => onChange())
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

const LEGACY_KEY = "volleytech_match_history_v1"
const MIGRATED_KEY = "volleytech_match_history_migrated_v1"

/**
 * Migra (uma única vez por dispositivo) o histórico do localStorage antigo para
 * a conta na nuvem. Retorna true se migrou algo.
 */
export async function migrateLocalHistory(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (window.localStorage.getItem(MIGRATED_KEY)) return false

  const raw = window.localStorage.getItem(LEGACY_KEY)
  if (!raw) {
    window.localStorage.setItem(MIGRATED_KEY, "1")
    return false
  }

  let legacy: MatchHistoryEntry[] = []
  try {
    const parsed = JSON.parse(raw)
    legacy = Array.isArray(parsed) ? parsed : []
  } catch {
    legacy = []
  }
  if (legacy.length === 0) {
    window.localStorage.setItem(MIGRATED_KEY, "1")
    return false
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const rows = legacy.map((e) => ({
    user_id: user.id,
    team_a_name: e.teamAName,
    team_b_name: e.teamBName,
    score_a: e.scoreA,
    score_b: e.scoreB,
    total_acoes: e.totalAcoes,
    match: e.match,
    saved_at: new Date(e.savedAt || Date.now()).toISOString(),
  }))
  const { error } = await supabase.from("vs_match_history").insert(rows)
  if (error) return false

  window.localStorage.setItem(MIGRATED_KEY, "1")
  window.localStorage.removeItem(LEGACY_KEY)
  return true
}

/** Indica se a partida tem registros que valem a pena salvar. */
export function hasData(match: MatchState): boolean {
  return match.actions.length > 0 || match.scoreA > 0 || match.scoreB > 0
}
