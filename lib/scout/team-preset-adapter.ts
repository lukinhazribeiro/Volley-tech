/**
 * Adaptador entre o elenco simples do Scout Volleyball ({number,name,role}) e o
 * TeamConfig usado pela biblioteca de equipes na nuvem (compartilhada com o
 * Scout View e o Scout Action). Assim uma equipe salva em qualquer módulo pode
 * ser reaproveitada aqui, e vice-versa.
 */

import { createTeam, applyTeamPatch, type TeamConfig } from "@/lib/video-scout/match"
import type { Player as VsPlayer, PlayerRole as VsRole } from "@/lib/video-scout/types"
import { POSICAO_ORDER } from "@/lib/video-scout/types"
import type { TeamPreset } from "@/lib/video-scout/team-presets"
import { presetToTeam } from "@/lib/video-scout/team-presets"
import type { Player as SvPlayer } from "@/components/scout/team-roster-management"

// As funções têm exatamente os mesmos identificadores nos dois módulos.
function toVsRole(role: SvPlayer["role"]): VsRole {
  return (role ?? null) as VsRole
}

/** Converte o elenco do Scout Volleyball em um TeamConfig salvável na nuvem. */
export function rosterToTeam(name: string, players: SvPlayer[]): TeamConfig {
  const base = createTeam("casa", name || "Equipe")
  const vsPlayers: VsPlayer[] = players.map((p, i) => ({
    id: `sv_${p.number}_${i}`,
    number: p.number,
    name: p.name,
    team: "casa",
    posicao: null,
    role: toVsRole(p.role),
  }))
  // Coloca os 6 primeiros em quadra numa formação válida (só para a biblioteca
  // ter uma formação; o Scout Volleyball não usa a formação em si).
  const formation = { ...base.formation }
  for (const pos of POSICAO_ORDER) formation[pos] = null
  vsPlayers.slice(0, 6).forEach((p, i) => {
    formation[POSICAO_ORDER[i]] = p.id
  })
  const libero = vsPlayers.find((p) => p.role === "libero")
  return applyTeamPatch(base, {
    name: name || "Equipe",
    players: vsPlayers,
    formation,
    liberoId: libero?.id ?? null,
  })
}

/** Converte um TeamConfig / preset da biblioteca no elenco do Scout Volleyball. */
export function teamToRoster(team: TeamConfig): SvPlayer[] {
  return team.players
    .map((p) => ({
      number: p.number,
      name: p.name,
      role: (p.role ?? undefined) as SvPlayer["role"],
    }))
    .sort((a, b) => a.number - b.number)
}

/** Atalho: preset da nuvem → elenco do Scout Volleyball. */
export function presetToRoster(preset: TeamPreset): SvPlayer[] {
  return teamToRoster(presetToTeam(preset, "casa"))
}
