// Store da Summary Game persistido no Supabase, escopado por conta (RLS por auth.uid()).
// Substitui o antigo armazenamento em localStorage: agora os dados salvam na conta
// e sincronizam entre aparelhos, sem misturar dados de contas diferentes.

import { createClient } from "@/lib/supabase/client"
import type { Player, Posicao } from "@/lib/video-scout/types"
import { POSICAO_ORDER } from "@/lib/video-scout/types"
import type { TeamConfig } from "@/lib/video-scout/match"

export type RosterPlayer = {
  number: number
  name: string
}

/**
 * As equipes do Summary agora vivem na MESMA biblioteca compartilhada dos scouts
 * (tabela vs_team_presets). O Summary só edita número+nome, mas guardamos o
 * elenco no formato rico (com função/posição/líbero/levantador) para que a mesma
 * equipe apareça e seja reaproveitada nos Scouts (Volleyball, View e Action).
 */
type StoredTeam = Omit<TeamConfig, "side">

let __pid = 0
function genPlayerId(): string {
  __pid += 1
  return `pl_${Date.now().toString(36)}_${__pid}`
}

/** Constrói um elenco rico a partir de uma lista simples de número+nome. */
function buildStoredTeam(name: string, roster: RosterPlayer[]): StoredTeam {
  const players: Player[] = roster.map((p) => ({
    id: genPlayerId(),
    number: p.number,
    name: p.name,
    team: "casa",
    posicao: null,
    role: null,
  }))
  const formation = {} as Record<Posicao, string | null>
  POSICAO_ORDER.forEach((pos, i) => {
    formation[pos] = players[i]?.id ?? null
  })
  return { name: name.trim() || "Equipe", players, formation, liberoId: null, liberoReplaces: [], setterPosicao: "P1" }
}

/**
 * Atualiza um elenco existente com uma nova lista de número+nome, PRESERVANDO a
 * função/posição/líbero de quem continua (casado pelo número). Atletas novos
 * entram sem função; quem saiu é removido da formação e do líbero.
 */
function mergeStoredTeam(existing: StoredTeam, name: string, roster: RosterPlayer[]): StoredTeam {
  const byNumber = new Map<number, Player>()
  for (const p of existing.players) byNumber.set(p.number, p)

  const players: Player[] = roster.map((r) => {
    const prev = byNumber.get(r.number)
    return prev
      ? { ...prev, name: r.name, number: r.number }
      : { id: genPlayerId(), number: r.number, name: r.name, team: "casa", posicao: null, role: null }
  })

  const validIds = new Set(players.map((p) => p.id))
  const formation = {} as Record<Posicao, string | null>
  for (const pos of POSICAO_ORDER) {
    const id = existing.formation?.[pos] ?? null
    formation[pos] = id && validIds.has(id) ? id : null
  }
  const liberoId = existing.liberoId && validIds.has(existing.liberoId) ? existing.liberoId : null
  const liberoReplaces = (existing.liberoReplaces ?? []).filter((id) => validIds.has(id))

  return {
    name: name.trim() || existing.name || "Equipe",
    players,
    formation,
    liberoId,
    liberoReplaces,
    setterPosicao: existing.setterPosicao ?? "P1",
  }
}

/** Extrai a lista simples número+nome (ordenada por número) de um elenco rico. */
function storedToRoster(team: StoredTeam | null | undefined): RosterPlayer[] {
  if (!team?.players) return []
  return team.players
    .map((p) => ({ number: Number(p.number) || 0, name: (p.name || "").trim() }))
    .filter((p) => p.name !== "" && p.number > 0)
    .sort((a, b) => a.number - b.number)
}

export type SavedTeam = {
  id: string
  name: string
  players: RosterPlayer[]
  createdAt: string
  updatedAt: string
}

export type Competition = {
  id: string
  name: string
  category: string
  season: string
  teamIds: string[]
  createdAt: string
}

// Registro de súmula salva. `data` guarda o objeto completo do jogo (times, sets, etc.).
export type SavedMatchRecord = {
  id: string
  competitionId: string | null
  championshipName: string
  winnerName: string
  scoreline: string
  date: string
  data: Record<string, unknown>
}

async function requireUserId(): Promise<string> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Sessão expirada. Faça login novamente para salvar seus dados.")
  return user.id
}

function normalizePlayers(players: RosterPlayer[]): RosterPlayer[] {
  return players
    .map((p) => ({ number: Number(p.number) || 0, name: (p.name || "").trim() }))
    .filter((p) => p.name !== "" && p.number > 0)
}

/* ------------------------------- Equipes ------------------------------- */

export async function getTeams(): Promise<SavedTeam[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("vs_team_presets")
    .select("id, name, team, saved_at")
    .order("name", { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    players: storedToRoster(r.team as StoredTeam),
    createdAt: r.saved_at as string,
    updatedAt: r.saved_at as string,
  }))
}

export async function getTeam(id: string): Promise<SavedTeam | undefined> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("vs_team_presets")
    .select("id, name, team, saved_at")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  if (!data) return undefined
  return {
    id: data.id as string,
    name: data.name as string,
    players: storedToRoster(data.team as StoredTeam),
    createdAt: data.saved_at as string,
    updatedAt: data.saved_at as string,
  }
}

export async function saveTeam(input: { name: string; players: RosterPlayer[] }): Promise<SavedTeam> {
  const supabase = createClient()
  const userId = await requireUserId()
  const now = new Date().toISOString()
  const stored = buildStoredTeam(input.name, normalizePlayers(input.players))
  const { data, error } = await supabase
    .from("vs_team_presets")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      team: JSON.parse(JSON.stringify(stored)) as StoredTeam,
      saved_at: now,
    })
    .select("id, name, team, saved_at")
    .single()
  if (error) throw error
  return {
    id: data.id as string,
    name: data.name as string,
    players: storedToRoster(data.team as StoredTeam),
    createdAt: data.saved_at as string,
    updatedAt: data.saved_at as string,
  }
}

export async function updateTeam(id: string, input: { name: string; players: RosterPlayer[] }): Promise<void> {
  const supabase = createClient()
  // Lê o elenco rico atual para preservar função/posição/líbero de quem continua.
  const { data: current, error: readErr } = await supabase
    .from("vs_team_presets")
    .select("team")
    .eq("id", id)
    .maybeSingle()
  if (readErr) throw readErr
  const existing = (current?.team as StoredTeam) ?? buildStoredTeam(input.name, [])
  const merged = mergeStoredTeam(existing, input.name, normalizePlayers(input.players))
  const { error } = await supabase
    .from("vs_team_presets")
    .update({
      name: input.name.trim(),
      team: JSON.parse(JSON.stringify(merged)) as StoredTeam,
      saved_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (error) throw error
}

export async function deleteTeam(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("vs_team_presets").delete().eq("id", id)
  if (error) throw error
}

// Clona uma equipe gerando uma cópia totalmente independente (novo id e novos atletas).
export async function cloneTeam(id: string, newName: string): Promise<SavedTeam | undefined> {
  const original = await getTeam(id)
  if (!original) return undefined
  return saveTeam({
    name: newName.trim() || `${original.name} (cópia)`,
    players: original.players.map((p) => ({ ...p })),
  })
}

/* ----------------------------- Competições ----------------------------- */

export async function getCompetitions(): Promise<Competition[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("summary_competitions")
    .select("id, name, category, season, team_ids, created_at")
    .order("name", { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    category: (r.category as string) ?? "",
    season: (r.season as string) ?? "",
    teamIds: (r.team_ids as string[]) ?? [],
    createdAt: r.created_at as string,
  }))
}

export async function saveCompetition(input: {
  name: string
  category: string
  season: string
  teamIds?: string[]
}): Promise<Competition> {
  const supabase = createClient()
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from("summary_competitions")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      category: input.category.trim(),
      season: input.season.trim(),
      team_ids: input.teamIds ?? [],
    })
    .select("id, name, category, season, team_ids, created_at")
    .single()
  if (error) throw error
  return {
    id: data.id as string,
    name: data.name as string,
    category: (data.category as string) ?? "",
    season: (data.season as string) ?? "",
    teamIds: (data.team_ids as string[]) ?? [],
    createdAt: data.created_at as string,
  }
}

export async function updateCompetition(
  id: string,
  input: { name: string; category: string; season: string; teamIds?: string[] },
): Promise<void> {
  const supabase = createClient()
  const patch: Record<string, unknown> = {
    name: input.name.trim(),
    category: input.category.trim(),
    season: input.season.trim(),
  }
  if (input.teamIds !== undefined) patch.team_ids = input.teamIds
  const { error } = await supabase.from("summary_competitions").update(patch).eq("id", id)
  if (error) throw error
}

export async function deleteCompetition(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("summary_competitions").delete().eq("id", id)
  if (error) throw error
}

/* ------------------------------- Súmulas ------------------------------- */

export async function getMatches(): Promise<SavedMatchRecord[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("summary_matches")
    .select("id, competition_id, championship_name, winner_name, scoreline, data, played_at")
    .order("played_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id as string,
    competitionId: (r.competition_id as string | null) ?? null,
    championshipName: (r.championship_name as string) ?? "",
    winnerName: (r.winner_name as string) ?? "",
    scoreline: (r.scoreline as string) ?? "",
    date: r.played_at as string,
    data: (r.data as Record<string, unknown>) ?? {},
  }))
}

export async function saveMatch(input: {
  competitionId?: string | null
  championshipName: string
  winnerName: string
  scoreline: string
  data: Record<string, unknown>
}): Promise<SavedMatchRecord> {
  const supabase = createClient()
  const userId = await requireUserId()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("summary_matches")
    .insert({
      user_id: userId,
      competition_id: input.competitionId ?? null,
      championship_name: input.championshipName,
      winner_name: input.winnerName,
      scoreline: input.scoreline,
      data: input.data,
      played_at: now,
    })
    .select("id, competition_id, championship_name, winner_name, scoreline, data, played_at")
    .single()
  if (error) throw error
  return {
    id: data.id as string,
    competitionId: (data.competition_id as string | null) ?? null,
    championshipName: (data.championship_name as string) ?? "",
    winnerName: (data.winner_name as string) ?? "",
    scoreline: (data.scoreline as string) ?? "",
    date: data.played_at as string,
    data: (data.data as Record<string, unknown>) ?? {},
  }
}

export async function deleteMatch(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("summary_matches").delete().eq("id", id)
  if (error) throw error
}
