// Store da Summary Game persistido no Supabase, escopado por conta (RLS por auth.uid()).
// Substitui o antigo armazenamento em localStorage: agora os dados salvam na conta
// e sincronizam entre aparelhos, sem misturar dados de contas diferentes.

import { createClient } from "@/lib/supabase/client"

export type RosterPlayer = {
  number: number
  name: string
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
    .from("summary_teams")
    .select("id, name, players, created_at, updated_at")
    .order("name", { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    players: (r.players as RosterPlayer[]) ?? [],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }))
}

export async function getTeam(id: string): Promise<SavedTeam | undefined> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("summary_teams")
    .select("id, name, players, created_at, updated_at")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  if (!data) return undefined
  return {
    id: data.id as string,
    name: data.name as string,
    players: (data.players as RosterPlayer[]) ?? [],
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  }
}

export async function saveTeam(input: { name: string; players: RosterPlayer[] }): Promise<SavedTeam> {
  const supabase = createClient()
  const userId = await requireUserId()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("summary_teams")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      players: normalizePlayers(input.players),
      updated_at: now,
    })
    .select("id, name, players, created_at, updated_at")
    .single()
  if (error) throw error
  return {
    id: data.id as string,
    name: data.name as string,
    players: (data.players as RosterPlayer[]) ?? [],
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  }
}

export async function updateTeam(id: string, input: { name: string; players: RosterPlayer[] }): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("summary_teams")
    .update({
      name: input.name.trim(),
      players: normalizePlayers(input.players),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (error) throw error
}

export async function deleteTeam(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("summary_teams").delete().eq("id", id)
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
