"use client"

// Rota TEMPORÁRIA de verificação visual do painel do Scout Action (sem auth).
// Será removida após o screenshot.

import { ActionDataEntry } from "@/components/scout-action/action-data-entry"
import { createTeam, applyTeamPatch } from "@/lib/video-scout/match"
import { POSICAO_ORDER } from "@/lib/video-scout/types"

function demoTeam(side: "casa" | "adversario", name: string, base: number) {
  const t = createTeam(side, name)
  const roles = ["levantador", "central", "ponteiro", "oposto", "central", "ponteiro"] as const
  const players = t.players.map((p, i) => ({
    ...p,
    name: `Atleta ${base + i + 1}`,
    role: i < 6 ? roles[i] : p.role,
  }))
  const formation = { ...t.formation }
  POSICAO_ORDER.forEach((pos, i) => (formation[pos] = players[i]?.id ?? null))
  return applyTeamPatch(t, { players, formation, liberoId: players[6]?.id ?? null })
}

export default function Page() {
  return (
    <ActionDataEntry
      config={{
        category: "Sub-17",
        competition: "Estadual",
        teamA: demoTeam("casa", "Vôlei Norte", 0),
        teamB: demoTeam("adversario", "Sul FC", 20),
        firstServer: "A",
      }}
      onFinish={() => {}}
      onExit={() => {}}
    />
  )
}
