/**
 * Volley Hub — camada de dados (Supabase) e associação de atletas.
 *
 * Independente dos demais módulos: apenas LÊ scouts locais e grava o histórico
 * consolidado do Hub. Nunca modifica os dados de origem.
 */

import { createClient } from "@/lib/supabase/client"
import { getMatches, type StoredMatch, type StoredPlayer } from "@/lib/scout/match-storage"
import { extractTeamPlayerStats, type PlayerFundamentals } from "./stats"
import type { HubAthlete, HubHistoryEntry, HubImport, ImportCandidate, MatchResult } from "./types"

function norm(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

// ----------------------- Leitura de scouts locais -----------------------

/**
 * Converte as partidas salvas no Scout Volleyball (localStorage) em candidatos
 * de importação, um por atleta identificada (com nome) por partida.
 */
export function buildCandidatesFromLocalMatches(matches: StoredMatch[] = getMatches()): ImportCandidate[] {
  const candidates: ImportCandidate[] = []

  for (const match of matches) {
    const season = new Date(match.createdAt).getFullYear().toString()
    const competition = `${match.teamAName} x ${match.teamBName}`

    const teams: Array<{ team: "A" | "B"; name: string; players?: StoredPlayer[] }> = [
      { team: "A", name: match.teamAName, players: match.teamAPlayers },
      { team: "B", name: match.teamBName, players: match.teamBPlayers },
    ]

    for (const { team, name, players } of teams) {
      if (!players || players.length === 0) continue
      const namesByNumber: Record<number, string> = {}
      for (const p of players) if (p.name?.trim()) namesByNumber[p.number] = p.name.trim()

      const summaries = extractTeamPlayerStats(match.actions, team, namesByNumber)
      for (const s of summaries) {
        const fullName = s.name?.trim()
        if (!fullName) continue // só associa atletas com nome
        candidates.push({
          fullName,
          team: name,
          category: match.category,
          position: s.position || "",
          playerNumber: s.number,
          competition,
          season,
          matchDate: new Date(match.completedAt).toISOString().slice(0, 10),
          stats: s.fundamentals,
          fingerprint: `${match.id}:${team}:${s.number}`,
          raw: { matchId: match.id, team, number: s.number },
        })
      }
    }
  }

  return candidates
}

// ----------------------- Associação de atletas -----------------------

/**
 * Tenta associar cada candidato a um atleta existente usando nome+equipe+
 * categoria e as associações já aprendidas (aliases).
 *   - correspondência exata (ou alias já gravado) => vínculo automático
 *   - nome igual mas equipe/categoria diferente     => ambíguo (confirmar)
 *   - nada encontrado                               => novo atleta
 */
export async function matchCandidates(candidates: ImportCandidate[]): Promise<MatchResult[]> {
  const supabase = createClient()
  const [{ data: athletes }, { data: aliases }] = await Promise.all([
    supabase.from("hub_athletes").select("*"),
    supabase.from("hub_athlete_aliases").select("*"),
  ])

  const allAthletes = (athletes ?? []) as HubAthlete[]
  const allAliases = (aliases ?? []) as Array<{
    athlete_id: string
    full_name: string
    team: string | null
    category: string | null
  }>

  return candidates.map((candidate) => {
    // 1) alias aprendido (nome+equipe+categoria)
    const alias = allAliases.find(
      (a) =>
        norm(a.full_name) === norm(candidate.fullName) &&
        norm(a.team) === norm(candidate.team) &&
        norm(a.category) === norm(candidate.category),
    )
    if (alias) {
      return { candidate, status: "exact" as const, athleteId: alias.athlete_id, suggestions: [] }
    }

    // 2) correspondência exata por nome+equipe+categoria
    const exact = allAthletes.find(
      (a) =>
        norm(a.full_name) === norm(candidate.fullName) &&
        norm(a.team) === norm(candidate.team) &&
        norm(a.category) === norm(candidate.category),
    )
    if (exact) {
      return { candidate, status: "exact" as const, athleteId: exact.id, suggestions: [] }
    }

    // 3) mesmo nome mas equipe/categoria diferente => ambíguo
    const sameName = allAthletes.filter((a) => norm(a.full_name) === norm(candidate.fullName))
    if (sameName.length > 0) {
      return { candidate, status: "ambiguous" as const, suggestions: sameName }
    }

    // 4) novo atleta
    return { candidate, status: "new" as const, suggestions: [] }
  })
}

// ----------------------- Gravação -----------------------

/** Cria um atleta no Hub e retorna o id. */
export async function createAthlete(input: {
  fullName: string
  team: string
  category: string
  position: string
}): Promise<string> {
  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id
  if (!userId) throw new Error("Sessão não encontrada. Faça login para usar o Volley Hub.")

  const { data, error } = await supabase
    .from("hub_athletes")
    .insert({
      owner_id: userId,
      full_name: input.fullName,
      team: input.team || null,
      category: input.category || null,
      position: input.position || null,
    })
    .select("id")
    .single()
  if (error) throw error
  return data!.id as string
}

/** Grava a associação aprendida para nunca repetir o processo. */
export async function saveAlias(input: {
  athleteId: string
  fullName: string
  team: string
  category: string
}): Promise<void> {
  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id
  if (!userId) return

  await supabase.from("hub_athlete_aliases").upsert(
    {
      owner_id: userId,
      athlete_id: input.athleteId,
      full_name: input.fullName,
      team: input.team || null,
      category: input.category || null,
    },
    { onConflict: "owner_id,full_name,team,category" },
  )
}

/**
 * Insere capítulos de histórico. NUNCA sobrescreve: reimportações do mesmo
 * scout na mesma atleta são ignoradas via fingerprint (índice único).
 */
export async function insertHistoryEntries(
  entries: Array<{ athleteId: string; candidate: ImportCandidate; source?: string }>,
): Promise<number> {
  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id
  if (!userId) throw new Error("Sessão não encontrada.")

  const rows = entries.map(({ athleteId, candidate, source }) => ({
    owner_id: userId,
    athlete_id: athleteId,
    source: source ?? "scout_local",
    team: candidate.team || null,
    category: candidate.category || null,
    competition: candidate.competition || null,
    season: candidate.season || null,
    match_date: candidate.matchDate,
    player_number: candidate.playerNumber,
    position: candidate.position || null,
    stats: candidate.stats,
    raw: candidate.raw,
    fingerprint: candidate.fingerprint,
  }))

  const { data, error } = await supabase
    .from("hub_history_entries")
    .upsert(rows, { onConflict: "owner_id,athlete_id,fingerprint", ignoreDuplicates: true })
    .select("id")
  if (error) throw error
  return data?.length ?? 0
}

/** Registra uma importação no log (Dashboard). */
export async function logImport(kind: string, label: string, count: number): Promise<void> {
  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id
  if (!userId) return
  await supabase.from("hub_imports").insert({
    owner_id: userId,
    kind,
    label,
    entries_count: count,
  })
}

// ----------------------- Consultas -----------------------

export async function listAthletes(): Promise<HubAthlete[]> {
  const supabase = createClient()
  const { data } = await supabase.from("hub_athletes").select("*").order("full_name")
  return (data ?? []) as HubAthlete[]
}

export async function getAthlete(id: string): Promise<HubAthlete | null> {
  const supabase = createClient()
  const { data } = await supabase.from("hub_athletes").select("*").eq("id", id).maybeSingle()
  return (data as HubAthlete) ?? null
}

export async function listEntriesForAthlete(athleteId: string): Promise<HubHistoryEntry[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("hub_history_entries")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("season", { ascending: true })
    .order("match_date", { ascending: true })
  return (data ?? []) as HubHistoryEntry[]
}

export async function listAllEntries(): Promise<HubHistoryEntry[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("hub_history_entries")
    .select("*")
    .order("created_at", { ascending: false })
  return (data ?? []) as HubHistoryEntry[]
}

export async function listImports(limit = 10): Promise<HubImport[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("hub_imports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as HubImport[]
}

/** Lista as equipes distintas com contagem de atletas/capítulos. */
export async function listTeams(): Promise<Array<{ team: string; athletes: number; entries: number }>> {
  const entries = await listAllEntries()
  const map = new Map<string, { athletes: Set<string>; entries: number }>()
  for (const e of entries) {
    const key = e.team || "Sem equipe"
    if (!map.has(key)) map.set(key, { athletes: new Set(), entries: 0 })
    const v = map.get(key)!
    if (e.athlete_id) v.athletes.add(e.athlete_id)
    v.entries++
  }
  return Array.from(map.entries()).map(([team, v]) => ({
    team,
    athletes: v.athletes.size,
    entries: v.entries,
  }))
}

export type { PlayerFundamentals }
