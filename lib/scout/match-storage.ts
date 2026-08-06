import type { Set } from "./set-manager"
import type { MatchAction } from "./match-parser"
import { getStoredUser } from "@/lib/auth"

/** Atleta do elenco (número + nome), persistido para associação no Volley Hub. */
export interface StoredPlayer {
  number: number
  name: string
  role?: string
}

export interface StoredMatch {
  id: string
  teamAName: string
  teamBName: string
  category: string
  sets: Set[]
  actions: MatchAction[]
  totalDuration: number // em segundos
  createdAt: Date
  completedAt: Date
  winner: "A" | "B"
  /**
   * Elencos com os NOMES das atletas. Opcionais e não-destrutivos: partidas
   * antigas continuam válidas sem esses campos. O Volley Hub usa esses nomes
   * para associar atletas na importação de histórico.
   */
  teamAPlayers?: StoredPlayer[]
  teamBPlayers?: StoredPlayer[]
}

const STORAGE_KEY_BASE = "volleyball_matches_history"

/**
 * Identifica a conta logada na hub para escopar os dados. Cada usuário só
 * enxerga e salva os próprios jogos ("save game" por conta). Se ninguém estiver
 * logado, usa um bucket anônimo local.
 */
function currentUserScope(): string {
  const user = getStoredUser()
  return user?.id || user?.email || "anon"
}

/** Chave do histórico de partidas escopada por conta logada. */
function storageKey(): string {
  return `${STORAGE_KEY_BASE}::${currentUserScope()}`
}

function isStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined") return false
    return typeof localStorage !== "undefined"
  } catch {
    return false
  }
}

export function saveMatch(match: Omit<StoredMatch, "id">): StoredMatch {
  const storedMatch: StoredMatch = {
    ...match,
    id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }

  try {
    if (!isStorageAvailable()) {
      console.warn("[v0] localStorage not available, match not persisted")
      return storedMatch
    }
    const existingMatches = getMatches()
    const updatedMatches = [storedMatch, ...existingMatches]
    localStorage.setItem(storageKey(), JSON.stringify(updatedMatches))
    console.log("[v0] Match saved successfully:", storedMatch.id)
    return storedMatch
  } catch (error) {
    console.error("[v0] Error saving match:", error)
    throw error
  }
}

const IN_PROGRESS_KEY_BASE = "volleyball_match_in_progress"

/** Chave da partida em andamento escopada por conta logada. */
function inProgressKey(): string {
  return `${IN_PROGRESS_KEY_BASE}::${currentUserScope()}`
}

/**
 * Autosave da partida em andamento: grava TODO o estado (ações, sets, set
 * atual e extras de rally) a cada mudança, para que nada seja perdido em caso
 * de recarregar a página ou fechar o navegador sem querer.
 */
export function saveInProgressMatch(snapshot: unknown): void {
  try {
    if (!isStorageAvailable()) return
    localStorage.setItem(inProgressKey(), JSON.stringify(snapshot))
  } catch (error) {
    console.error("[v0] Error autosaving in-progress match:", error)
  }
}

export function getInProgressMatch<T = unknown>(): T | null {
  try {
    if (!isStorageAvailable()) return null
    const data = localStorage.getItem(inProgressKey())
    if (!data) return null
    return JSON.parse(data) as T
  } catch (error) {
    console.error("[v0] Error reading in-progress match:", error)
    return null
  }
}

export function clearInProgressMatch(): void {
  try {
    if (!isStorageAvailable()) return
    localStorage.removeItem(inProgressKey())
  } catch (error) {
    console.error("[v0] Error clearing in-progress match:", error)
  }
}

export function getMatches(): StoredMatch[] {
  try {
    if (!isStorageAvailable()) {
      return []
    }
    const data = localStorage.getItem(storageKey())
    if (!data) return []
    return JSON.parse(data)
  } catch (error) {
    console.error("[v0] Error retrieving matches:", error)
    return []
  }
}

export function getMatchById(id: string): StoredMatch | null {
  const matches = getMatches()
  return matches.find((m) => m.id === id) || null
}

export function deleteMatch(id: string): void {
  try {
    if (!isStorageAvailable()) return
    const matches = getMatches()
    const filtered = matches.filter((m) => m.id !== id)
    localStorage.setItem(storageKey(), JSON.stringify(filtered))
    console.log("[v0] Match deleted:", id)
  } catch (error) {
    console.error("[v0] Error deleting match:", error)
  }
}

export function getMatchesByCategory(category: string): StoredMatch[] {
  return getMatches().filter((m) => m.category === category)
}

export function getMatchStatistics(matches: StoredMatch[] = getMatches()) {
  const totalMatches = matches.length
  const totalGames = matches.reduce((acc, m) => acc + m.sets.length, 0)
  const averageSetsPerMatch = totalMatches > 0 ? (totalGames / totalMatches).toFixed(1) : "0"

  return {
    totalMatches,
    totalGames,
    averageSetsPerMatch,
  }
}
