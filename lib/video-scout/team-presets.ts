// Modelos de equipe salvos localmente (localStorage) para agilizar o setup.
// Guardam o elenco, funções, líbero e levantador de uma equipe para reaproveitar
// em partidas futuras, sem precisar reconfigurar tudo de novo.

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

const KEY = "volleytech_team_presets_v1"

/** Lê os modelos salvos (mais recentes primeiro). */
export function loadPresets(): TeamPreset[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as TeamPreset[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function persist(list: TeamPreset[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30)))
  } catch {
    // Ignora estouro de cota silenciosamente.
  }
}

/** Salva a equipe atual como um novo modelo e retorna a lista atualizada. */
export function savePreset(name: string, team: TeamConfig): TeamPreset[] {
  const { side: _side, ...rest } = team
  const entry: TeamPreset = {
    id: `tp_${Date.now().toString(36)}`,
    savedAt: Date.now(),
    name: name.trim() || team.name,
    team: JSON.parse(JSON.stringify(rest)) as Omit<TeamConfig, "side">,
  }
  const next = [entry, ...loadPresets()]
  persist(next)
  return next
}

/** Atualiza um modelo já existente (edição na biblioteca). */
export function updatePreset(id: string, team: TeamConfig): TeamPreset[] {
  const { side: _side, ...rest } = team
  const next = loadPresets().map((e) =>
    e.id === id
      ? {
          ...e,
          name: (team.name || e.name).trim(),
          savedAt: Date.now(),
          team: JSON.parse(JSON.stringify(rest)) as Omit<TeamConfig, "side">,
        }
      : e,
  )
  persist(next)
  return next
}

/** Remove um modelo salvo. */
export function deletePreset(id: string): TeamPreset[] {
  const next = loadPresets().filter((e) => e.id !== id)
  persist(next)
  return next
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
