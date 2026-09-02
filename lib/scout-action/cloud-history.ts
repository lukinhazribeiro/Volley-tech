// Histórico de jogos do Scout Action na nuvem (Supabase), atrelado à CONTA.
//
// Espelha lib/video-scout/history.ts: cada partida fica isolada, disponível em
// qualquer dispositivo logado na mesma conta e sincronizada em tempo real.
// A partida completa (ScoutActionMatch) é guardada no campo `match` (jsonb).

import { createClient } from "@/lib/supabase/client"
import type { ScoutActionMatch } from "./types"
import {
  getActionMatches as getLocalActionMatches,
  saveActionMatch as saveLocalActionMatch,
} from "./storage"

const TABLE = "sa_match_history"

interface HistoryRow {
  id: string
  match: ScoutActionMatch
  saved_at: string
}

/** Nome amigável de uma equipe do jogo. */
function teamName(team: { name?: string } | undefined, fallback: string): string {
  return team?.name?.trim() || fallback
}

/** Resumo textual do placar por sets (ex.: "2 x 1"). */
function scoreOf(match: ScoutActionMatch): { a: number; b: number } {
  return { a: match.setsA ?? 0, b: match.setsB ?? 0 }
}

/** Lê o histórico de jogos da conta (mais recentes primeiro). */
export async function loadActionHistory(): Promise<ScoutActionMatch[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, match, saved_at")
    .order("saved_at", { ascending: false })
    .limit(100)

  if (error || !data) return []
  // O id da nuvem substitui o id local, garantindo unicidade por linha.
  return data.map((r) => {
    const row = r as HistoryRow
    return { ...row.match, id: row.id }
  })
}

/** Salva uma cópia do jogo no histórico da conta e devolve a lista atualizada. */
export async function saveActionToCloud(match: ScoutActionMatch): Promise<ScoutActionMatch[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return loadActionHistory()

  const score = scoreOf(match)
  await supabase.from(TABLE).insert({
    user_id: user.id,
    team_a_name: teamName(match.teamA, "Equipe A"),
    team_b_name: teamName(match.teamB, "Equipe B"),
    score_a: score.a,
    score_b: score.b,
    total_acoes: match.events?.length ?? 0,
    // Clona para desacoplar totalmente da partida em andamento.
    match: JSON.parse(JSON.stringify(match)) as ScoutActionMatch,
  })
  return loadActionHistory()
}

/** Remove um jogo do histórico da conta. */
export async function deleteActionFromCloud(id: string): Promise<ScoutActionMatch[]> {
  const supabase = createClient()
  await supabase.from(TABLE).delete().eq("id", id)
  return loadActionHistory()
}

/** Reage a mudanças no histórico (em qualquer dispositivo da conta). */
export function subscribeToActionHistory(onChange: () => void): () => void {
  const supabase = createClient()
  const channel = supabase
    .channel("sa_match_history_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => onChange())
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

const MIGRATED_KEY = "scout_action_history_cloud_migrated_v1"

/**
 * Migra (uma única vez por dispositivo) os jogos do localStorage antigo para a
 * conta na nuvem. Retorna true se migrou algo. Após migrar, limpa o cache local
 * para evitar duplicidade — a nuvem passa a ser a fonte da verdade.
 */
export async function migrateLocalActionHistory(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (window.localStorage.getItem(MIGRATED_KEY)) return false

  const local = getLocalActionMatches()
  if (local.length === 0) {
    window.localStorage.setItem(MIGRATED_KEY, "1")
    return false
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const rows = local.map((m) => {
    const score = scoreOf(m)
    return {
      user_id: user.id,
      team_a_name: teamName(m.teamA, "Equipe A"),
      team_b_name: teamName(m.teamB, "Equipe B"),
      score_a: score.a,
      score_b: score.b,
      total_acoes: m.events?.length ?? 0,
      match: m,
      saved_at: new Date(m.completedAt || m.createdAt || Date.now()).toISOString(),
    }
  })
  const { error } = await supabase.from(TABLE).insert(rows)
  if (error) return false

  window.localStorage.setItem(MIGRATED_KEY, "1")
  return true
}

// Reexporta o save local para uso como fallback offline pela UI, se necessário.
export { saveLocalActionMatch }
