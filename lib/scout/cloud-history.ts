// Histórico de jogos do Scout Volleibol na nuvem (Supabase), atrelado à CONTA.
//
// Espelha lib/video-scout/history.ts, guardando o StoredMatch (com sets, ações
// e duração) no campo `match` (jsonb). Fica disponível em qualquer dispositivo
// logado na mesma conta e sincroniza em tempo real.

import { createClient } from "@/lib/supabase/client"
import type { StoredMatch } from "./match-storage"
import { getMatches as getLocalMatches } from "./match-storage"

const TABLE = "sv_match_history"

interface HistoryRow {
  id: string
  match: StoredMatch
  saved_at: string
}

/** Placar em sets a partir dos sets vencidos por cada lado. */
function setScore(match: StoredMatch): { a: number; b: number } {
  let a = 0
  let b = 0
  for (const s of match.sets ?? []) {
    if (s.winner === "A") a++
    else if (s.winner === "B") b++
  }
  return { a, b }
}

/**
 * Datas viram string ao passar por JSON; ao reidratar da nuvem, reconstrói
 * `createdAt`/`completedAt` como Date para manter o formato do StoredMatch.
 */
function reviveMatch(raw: StoredMatch, id: string): StoredMatch {
  return {
    ...raw,
    id,
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    completedAt: raw.completedAt ? new Date(raw.completedAt) : new Date(),
  }
}

/** Lê o histórico de jogos da conta (mais recentes primeiro). */
export async function loadVoleiHistory(): Promise<StoredMatch[]> {
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
  return data.map((r) => {
    const row = r as HistoryRow
    return reviveMatch(row.match, row.id)
  })
}

/** Salva uma cópia do jogo no histórico da conta e devolve a lista atualizada. */
export async function saveVoleiToCloud(match: StoredMatch): Promise<StoredMatch[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return loadVoleiHistory()

  const score = setScore(match)
  await supabase.from(TABLE).insert({
    user_id: user.id,
    team_a_name: match.teamAName || "Equipe A",
    team_b_name: match.teamBName || "Adversário",
    score_a: score.a,
    score_b: score.b,
    total_acoes: match.actions?.length ?? 0,
    match: JSON.parse(JSON.stringify(match)) as StoredMatch,
  })
  return loadVoleiHistory()
}

/** Remove um jogo do histórico da conta. */
export async function deleteVoleiFromCloud(id: string): Promise<StoredMatch[]> {
  const supabase = createClient()
  await supabase.from(TABLE).delete().eq("id", id)
  return loadVoleiHistory()
}

/** Reage a mudanças no histórico (em qualquer dispositivo da conta). */
export function subscribeToVoleiHistory(onChange: () => void): () => void {
  const supabase = createClient()
  const channel = supabase
    .channel("sv_match_history_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => onChange())
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

const MIGRATED_KEY = "volleyball_matches_cloud_migrated_v1"

/**
 * Migra (uma única vez por dispositivo) os jogos do localStorage antigo para a
 * conta na nuvem. Retorna true se migrou algo.
 */
export async function migrateLocalVoleiHistory(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (window.localStorage.getItem(MIGRATED_KEY)) return false

  const local = getLocalMatches()
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
    const score = setScore(m)
    return {
      user_id: user.id,
      team_a_name: m.teamAName || "Equipe A",
      team_b_name: m.teamBName || "Adversário",
      score_a: score.a,
      score_b: score.b,
      total_acoes: m.actions?.length ?? 0,
      match: m,
      saved_at: new Date(m.completedAt || m.createdAt || Date.now()).toISOString(),
    }
  })
  const { error } = await supabase.from(TABLE).insert(rows)
  if (error) return false

  window.localStorage.setItem(MIGRATED_KEY, "1")
  return true
}
