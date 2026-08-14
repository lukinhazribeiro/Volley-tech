import { createTeam, type TeamConfig } from "@/lib/video-scout/match"
import type { TeamSide } from "@/lib/video-scout/types"
import type { ActionSide } from "./types"

/** Configuração de uma partida do Scout Action (equipes + dados do jogo). */
export interface ActionMatchConfig {
  category: string
  competition: string
  teamA: TeamConfig
  teamB: TeamConfig
  firstServer: ActionSide
}

/** A = casa, B = adversário no modelo do motor. */
export const SIDE_MAP: Record<ActionSide, TeamSide> = { A: "casa", B: "adversario" }

/** Config inicial padrão: duas equipes vazias prontas para editar no painel. */
export function createDefaultConfig(): ActionMatchConfig {
  return {
    category: "",
    competition: "",
    teamA: createTeam("casa", "Equipe A"),
    teamB: createTeam("adversario", "Equipe B"),
    firstServer: "A",
  }
}
