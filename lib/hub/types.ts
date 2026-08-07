/**
 * Volley Hub — modelos de dados e formato portátil .VHA.
 */

import type { PlayerFundamentals } from "./stats"

/** Atleta consolidado no Hub (linha da tabela hub_athletes). */
export interface HubAthlete {
  id: string
  full_name: string
  team: string | null
  category: string | null
  position: string | null
  /** País da atleta (padrão "Brasil"). Base de comparação futura do VIB. */
  country: string | null
  /** Vínculo fixo com a atleta correspondente no módulo de Gestão (atletas.id). */
  gestao_atleta_id: number | null
  created_at: string
}

/** Capítulo de histórico (uma competição/scout) — hub_history_entries. */
export interface HubHistoryEntry {
  id: string
  athlete_id: string | null
  source: string
  team: string | null
  category: string | null
  competition: string | null
  season: string | null
  match_date: string | null
  player_number: number | null
  position: string | null
  stats: PlayerFundamentals
  /** Último TGP do capítulo: pontos da atleta ÷ pontos da equipe (0-100). Não entra no IPTV. */
  tgp: number | null
  raw: Record<string, unknown>
  fingerprint: string | null
  created_at: string
}

/** Registro de importação — hub_imports. */
export interface HubImport {
  id: string
  kind: string
  label: string | null
  entries_count: number
  created_at: string
}

/**
 * Um registro candidato à importação, já normalizado a partir de um scout.
 * É o que a associação de atletas recebe antes de virar HubHistoryEntry.
 */
export interface ImportCandidate {
  fullName: string
  team: string
  category: string
  position: string
  playerNumber: number
  competition: string
  season: string
  matchDate: string | null
  stats: PlayerFundamentals
  /** Último TGP do capítulo: pontos da atleta ÷ pontos da equipe (0-100). */
  tgp: number | null
  fingerprint: string
  raw: Record<string, unknown>
}

/** Resultado da tentativa de associação de um candidato a um atleta. */
export interface MatchResult {
  candidate: ImportCandidate
  /** "exact": vínculo automático; "ambiguous": pedir confirmação; "new": criar novo. */
  status: "exact" | "ambiguous" | "new"
  athleteId?: string
  suggestions: HubAthlete[]
}

// ======================= Formato .VHA =======================

export const VHA_MAGIC = "VHA"
export const VHA_VERSION = 1
export const VHA_EXTENSION = ".vha"

/**
 * Volley History Archive — histórico ESPORTIVO portátil de uma atleta.
 * NUNCA contém dados financeiros ou administrativos.
 */
export interface VHAFile {
  magic: typeof VHA_MAGIC
  version: number
  exportedAt: string
  athlete: {
    fullName: string
    team: string | null
    category: string | null
    position: string | null
  }
  /** Capítulos da carreira (competições/scouts). */
  history: Array<{
    source: string
    team: string | null
    category: string | null
    competition: string | null
    season: string | null
    matchDate: string | null
    playerNumber: number | null
    position: string | null
    stats: PlayerFundamentals
    fingerprint: string | null
  }>
  /** Evolução consolidada (percentuais por fundamento ao longo do tempo). */
  evolution: Array<{
    label: string
    season: string | null
    competition: string | null
    percentuais: Record<string, number>
  }>
  /** Avaliações inteligentes já geradas (texto). */
  evaluations: Array<{ label: string; text: string; createdAt: string }>
  /** Linha do tempo (capítulos ordenados). */
  timeline: Array<{ season: string | null; team: string | null; category: string | null; competition: string | null }>
  /** IPTV (índice técnico) por capítulo. */
  iptv: Array<{ label: string; index: number }>
}

export function isVHAFile(data: unknown): data is VHAFile {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as VHAFile).magic === VHA_MAGIC &&
    typeof (data as VHAFile).version === "number" &&
    Array.isArray((data as VHAFile).history)
  )
}
