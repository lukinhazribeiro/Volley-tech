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
