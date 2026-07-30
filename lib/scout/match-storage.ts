import type { Set } from "./set-manager"
import type { MatchAction } from "./match-parser"

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
}

const STORAGE_KEY = "volleyball_matches_history"

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMatches))
    console.log("[v0] Match saved successfully:", storedMatch.id)
    return storedMatch
  } catch (error) {
    console.error("[v0] Error saving match:", error)
    throw error
  }
}

const IN_PROGRESS_KEY = "volleyball_match_in_progress"

/**
 * Autosave da partida em andamento: grava TODO o estado (ações, sets, set
 * atual e extras de rally) a cada mudança, para que nada seja perdido em caso
 * de recarregar a página ou fechar o navegador sem querer.
 */
export function saveInProgressMatch(snapshot: unknown): void {
  try {
    if (!isStorageAvailable()) return
    localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify(snapshot))
  } catch (error) {
    console.error("[v0] Error autosaving in-progress match:", error)
  }
}

export function getInProgressMatch<T = unknown>(): T | null {
  try {
    if (!isStorageAvailable()) return null
    const data = localStorage.getItem(IN_PROGRESS_KEY)
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
    localStorage.removeItem(IN_PROGRESS_KEY)
  } catch (error) {
    console.error("[v0] Error clearing in-progress match:", error)
  }
}

export function getMatches(): StoredMatch[] {
  try {
    if (!isStorageAvailable()) {
      return []
    }
    const data = localStorage.getItem(STORAGE_KEY)
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
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
