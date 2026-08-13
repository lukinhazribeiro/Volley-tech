/**
 * Persistência local do Scout Action, escopada por conta logada (cada usuário
 * só enxerga os próprios jogos). Segue o mesmo padrão do Scout Volleyball.
 */

import { getStoredUser } from "@/lib/auth"
import type { ScoutActionMatch } from "./types"

const STORAGE_KEY_BASE = "scout_action_history"
const IN_PROGRESS_KEY_BASE = "scout_action_in_progress"

function currentUserScope(): string {
  const user = getStoredUser()
  return user?.id || user?.email || "anon"
}

function storageKey(): string {
  return `${STORAGE_KEY_BASE}::${currentUserScope()}`
}

function inProgressKey(): string {
  return `${IN_PROGRESS_KEY_BASE}::${currentUserScope()}`
}

function isStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined") return false
    return typeof localStorage !== "undefined"
  } catch {
    return false
  }
}

export function saveActionMatch(match: Omit<ScoutActionMatch, "id">): ScoutActionMatch {
  const stored: ScoutActionMatch = {
    ...match,
    id: `saction_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
  }
  try {
    if (!isStorageAvailable()) return stored
    const existing = getActionMatches()
    localStorage.setItem(storageKey(), JSON.stringify([stored, ...existing]))
    return stored
  } catch (error) {
    console.error("[v0] Error saving scout action match:", error)
    throw error
  }
}

export function getActionMatches(): ScoutActionMatch[] {
  try {
    if (!isStorageAvailable()) return []
    const data = localStorage.getItem(storageKey())
    if (!data) return []
    return JSON.parse(data) as ScoutActionMatch[]
  } catch (error) {
    console.error("[v0] Error retrieving scout action matches:", error)
    return []
  }
}

export function getActionMatchById(id: string): ScoutActionMatch | null {
  return getActionMatches().find((m) => m.id === id) ?? null
}

export function deleteActionMatch(id: string): void {
  try {
    if (!isStorageAvailable()) return
    const filtered = getActionMatches().filter((m) => m.id !== id)
    localStorage.setItem(storageKey(), JSON.stringify(filtered))
  } catch (error) {
    console.error("[v0] Error deleting scout action match:", error)
  }
}

export function saveInProgressActionMatch(snapshot: unknown): void {
  try {
    if (!isStorageAvailable()) return
    localStorage.setItem(inProgressKey(), JSON.stringify(snapshot))
  } catch (error) {
    console.error("[v0] Error autosaving scout action match:", error)
  }
}

export function getInProgressActionMatch<T = unknown>(): T | null {
  try {
    if (!isStorageAvailable()) return null
    const data = localStorage.getItem(inProgressKey())
    if (!data) return null
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

export function clearInProgressActionMatch(): void {
  try {
    if (!isStorageAvailable()) return
    localStorage.removeItem(inProgressKey())
  } catch (error) {
    console.error("[v0] Error clearing scout action match:", error)
  }
}
