// Modelos de equipe salvos na nuvem (Supabase), atrelados à conta do usuário.
// Ficam disponíveis em qualquer dispositivo e sincronizam em tempo real entre
// sessões abertas ao mesmo tempo. Guardam elenco, funções, líbero e levantador
// de uma equipe para reaproveitar em partidas futuras sem reconfigurar tudo.

import { createClient } from "@/lib/supabase/client"
import type { Player, Posicao, TeamSide } from "./types"
import { POSICAO_ORDER } from "./types"
import type { TeamConfig } from "./match"

export interface TeamPreset {
  id: string
  savedAt: number
  name: string
  /** Cópia isolada da configuração da equipe (sem o lado Casa/Adversário). */
  team: Omit<TeamConfig, "side">
}

interface PresetRow {
  id: string
  name: string
  team: Omit<TeamConfig, "side">
  saved_at: string
}

function rowToPreset(row: PresetRow): TeamPreset {
  return {
    id: row.id,
    name: row.name,
    team: row.team,
    savedAt: new Date(row.saved_at).getTime(),
  }
}

/** Lê os modelos salvos na conta (mais recentes primeiro). */
export async function loadPresets(): Promise<TeamPreset[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("vs_team_presets")
    .select("id, name, team, saved_at")
    .order("saved_at", { ascending: false })

  if (error || !data) return []
  return data.map((r) => rowToPreset(r as PresetRow))
}

/** Salva a equipe atual como um novo modelo e retorna a lista atualizada. */
export async function savePreset(name: string, team: TeamConfig): Promise<TeamPreset[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return loadPresets()

  const { side: _side, ...rest } = team
  await supabase.from("vs_team_presets").insert({
    user_id: user.id,
    name: (name.trim() || team.name).trim(),
    team: JSON.parse(JSON.stringify(rest)) as Omit<TeamConfig, "side">,
  })
  return loadPresets()
}

/** Atualiza um modelo já existente (edição na biblioteca). */
export async function updatePreset(id: string, team: TeamConfig): Promise<TeamPreset[]> {
  const supabase = createClient()
  const { side: _side, ...rest } = team
  await supabase
    .from("vs_team_presets")
    .update({
      name: (team.name || "Equipe").trim(),
      team: JSON.parse(JSON.stringify(rest)) as Omit<TeamConfig, "side">,
      saved_at: new Date().toISOString(),
    })
    .eq("id", id)
  return loadPresets()
}

/** Remove um modelo salvo. */
export async function deletePreset(id: string): Promise<TeamPreset[]> {
  const supabase = createClient()
  await supabase.from("vs_team_presets").delete().eq("id", id)
  return loadPresets()
}

/** Reage a mudanças (em qualquer dispositivo) chamando o callback. */
export function subscribeToPresets(onChange: () => void): () => void {
  const supabase = createClient()
  const channel = supabase
    .channel("vs_team_presets_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "vs_team_presets" }, () => onChange())
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

const LEGACY_KEY = "volleytech_team_presets_v1"
const MIGRATED_KEY = "volleytech_team_presets_migrated_v1"

/**
 * Migra (uma única vez por dispositivo) as equipes salvas no localStorage antigo
 * para a conta na nuvem. Retorna true se migrou algo.
 */
export async function migrateLocalPresets(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (window.localStorage.getItem(MIGRATED_KEY)) return false

  const raw = window.localStorage.getItem(LEGACY_KEY)
  if (!raw) {
    window.localStorage.setItem(MIGRATED_KEY, "1")
    return false
  }

  let legacy: TeamPreset[] = []
  try {
    const parsed = JSON.parse(raw)
    legacy = Array.isArray(parsed) ? parsed : []
  } catch {
    legacy = []
  }
  if (legacy.length === 0) {
    window.localStorage.setItem(MIGRATED_KEY, "1")
    return false
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const rows = legacy.map((p) => ({
    user_id: user.id,
    name: p.name,
    team: p.team,
    saved_at: new Date(p.savedAt || Date.now()).toISOString(),
  }))
  const { error } = await supabase.from("vs_team_presets").insert(rows)
  if (error) return false

  window.localStorage.setItem(MIGRATED_KEY, "1")
  window.localStorage.removeItem(LEGACY_KEY)
  return true
}

/**
 * Constrói uma TeamConfig a partir de um modelo, gerando NOVOS ids para os
 * atletas (evita colisão com a outra equipe em quadra) e remapeando a formação,
 * o líbero e os revezamentos para os novos ids. Aplica ao lado informado.
 */
export function presetToTeam(preset: TeamPreset, side: TeamSide): TeamConfig {
  const src = preset.team
  const idMap = new Map<string, string>()
  const players: Player[] = src.players.map((p, i) => {
    const newId = `pl_${Date.now().toString(36)}_${side}_${i}`
    idMap.set(p.id, newId)
    return { ...p, id: newId, team: side }
  })

  const formation = {} as Record<Posicao, string | null>
  for (const pos of POSICAO_ORDER) {
    const oldId = src.formation[pos]
    formation[pos] = oldId ? (idMap.get(oldId) ?? null) : null
  }

  return {
    side,
    name: src.name,
    players,
    formation,
    liberoId: src.liberoId ? (idMap.get(src.liberoId) ?? null) : null,
    liberoReplaces: src.liberoReplaces.map((id) => idMap.get(id)).filter((id): id is string => Boolean(id)),
    setterPosicao: src.setterPosicao,
  }
}
