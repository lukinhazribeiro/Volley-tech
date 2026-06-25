// Store local (localStorage) para Equipes pré-cadastradas e Competições.
// Mantém o padrão offline da Summary Game (assim como summary_saved_matches).

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

const TEAMS_KEY = "summary_teams"
const COMPETITIONS_KEY = "summary_competitions"

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function write<T>(key: string, value: T[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

/* ------------------------------- Equipes ------------------------------- */

export function getTeams(): SavedTeam[] {
  return read<SavedTeam>(TEAMS_KEY).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}

export function getTeam(id: string): SavedTeam | undefined {
  return read<SavedTeam>(TEAMS_KEY).find((t) => t.id === id)
}

export function saveTeam(input: { name: string; players: RosterPlayer[] }): SavedTeam {
  const teams = read<SavedTeam>(TEAMS_KEY)
  const now = new Date().toISOString()
  const team: SavedTeam = {
    id: uid(),
    name: input.name.trim(),
    players: normalizePlayers(input.players),
    createdAt: now,
    updatedAt: now,
  }
  write(TEAMS_KEY, [...teams, team])
  return team
}

export function updateTeam(id: string, input: { name: string; players: RosterPlayer[] }): void {
  const teams = read<SavedTeam>(TEAMS_KEY)
  const next = teams.map((t) =>
    t.id === id
      ? { ...t, name: input.name.trim(), players: normalizePlayers(input.players), updatedAt: new Date().toISOString() }
      : t,
  )
  write(TEAMS_KEY, next)
}

export function deleteTeam(id: string): void {
  write(
    TEAMS_KEY,
    read<SavedTeam>(TEAMS_KEY).filter((t) => t.id !== id),
  )
}

// Clona uma equipe gerando uma cópia totalmente independente (novo id e novos atletas).
export function cloneTeam(id: string, newName: string): SavedTeam | undefined {
  const original = getTeam(id)
  if (!original) return undefined
  return saveTeam({
    name: newName.trim() || `${original.name} (cópia)`,
    players: original.players.map((p) => ({ ...p })),
  })
}

function normalizePlayers(players: RosterPlayer[]): RosterPlayer[] {
  return players
    .map((p) => ({ number: Number(p.number) || 0, name: (p.name || "").trim() }))
    .filter((p) => p.name !== "" && p.number > 0)
}

/* ----------------------------- Competições ----------------------------- */

export function getCompetitions(): Competition[] {
  return read<Competition>(COMPETITIONS_KEY).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}

export function saveCompetition(input: {
  name: string
  category: string
  season: string
  teamIds?: string[]
}): Competition {
  const list = read<Competition>(COMPETITIONS_KEY)
  const comp: Competition = {
    id: uid(),
    name: input.name.trim(),
    category: input.category.trim(),
    season: input.season.trim(),
    teamIds: input.teamIds ?? [],
    createdAt: new Date().toISOString(),
  }
  write(COMPETITIONS_KEY, [...list, comp])
  return comp
}

export function updateCompetition(
  id: string,
  input: { name: string; category: string; season: string; teamIds?: string[] },
): void {
  const list = read<Competition>(COMPETITIONS_KEY)
  const next = list.map((c) =>
    c.id === id
      ? {
          ...c,
          name: input.name.trim(),
          category: input.category.trim(),
          season: input.season.trim(),
          teamIds: input.teamIds ?? c.teamIds ?? [],
        }
      : c,
  )
  write(COMPETITIONS_KEY, next)
}

export function deleteCompetition(id: string): void {
  write(
    COMPETITIONS_KEY,
    read<Competition>(COMPETITIONS_KEY).filter((c) => c.id !== id),
  )
}
