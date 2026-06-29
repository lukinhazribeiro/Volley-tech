import type { MatchAction } from "@/lib/scout/match-parser"

export interface PlayerStats {
  number: number
  position: string
  name: string
  reception: { A: number; B: number; C: number; erro: number }
  serve: { certo: number; erro: number; ace: number }
  attack: { ponto: number; certo: number; erro: number; O: number; P: number; M: number; FS: number }
  block: { O: number; P: number; M: number; FS: number }
  defense: { D: number; V: number; R: number }
  tp: number
  te: number
  tgp: number
}

export interface CalculatePlayerStatsOptions {
  selectedSet?: "all" | number
  playerNames?: Record<string, Record<number, string>>
  playerPositions?: Record<string, Record<number, string>>
}

function emptyStats(number: number, position: string, name: string): PlayerStats {
  return {
    number,
    position,
    name,
    reception: { A: 0, B: 0, C: 0, erro: 0 },
    serve: { certo: 0, erro: 0, ace: 0 },
    attack: { ponto: 0, certo: 0, erro: 0, O: 0, P: 0, M: 0, FS: 0 },
    block: { O: 0, P: 0, M: 0, FS: 0 },
    defense: { D: 0, V: 0, R: 0 },
    tp: 0,
    te: 0,
    tgp: 0,
  }
}

/**
 * Calcula as estatísticas por jogador de uma equipe.
 *
 * Regras de pontuação (TP/TE/TGP):
 * - TP (Total de Participações): soma de TODAS as ações do jogador, EXCETO os erros
 *   (recepção A/B/C + saque certo/ace + ataque ponto/certo + bloqueios + defesas).
 * - TE (Total de Erros): recepção errada + saque errado + ataque/levantamento errado.
 * - TGP: participação do atleta em relação ao placar da PRÓPRIA equipe (TP / pontos da equipe).
 */
export function calculatePlayerStats(
  actions: MatchAction[],
  team: "A" | "B",
  opts: CalculatePlayerStatsOptions = {},
): PlayerStats[] {
  const { selectedSet = "all", playerNames = { A: {}, B: {} }, playerPositions = { A: {}, B: {} } } = opts

  const playerStats: Record<number, PlayerStats> = {}
  const processedReceptionIds = new Set<string>()

  const filteredActions =
    selectedSet === "all" ? actions : actions.filter((action) => action.setNumber === selectedSet)

  const countPointsFor = (t: "A" | "B"): number => {
    let pts = 0
    for (const action of filteredActions) {
      const servingTeam = action.servingTeam
      const attackingTeam = action.attackingTeam

      if (action.serveQuality === "ka" && servingTeam === t) pts++
      if (action.serveQuality === "-" && servingTeam !== t) pts++
      if (action.passingQuality === "D" && attackingTeam === t) pts++
      if (action.resultComplemento === "#" && attackingTeam === t) pts++
      if (action.resultComplemento === "!" && attackingTeam !== t) pts++
      if (action.resultComplemento === "+" && attackingTeam !== t) pts++
      if (action.resultComplemento === "%" && attackingTeam !== t) pts++
      if (action.passingQuality === "R" && (action.pointType as string) === "point" && action.pointScoredBy === t)
        pts++
    }
    return pts
  }

  const teamTotalPoints = countPointsFor(team)

  for (const action of filteredActions) {
    const receivingTeam = action.servingTeam === "A" ? "B" : "A"

    // Recepção
    if (
      action.passingPlayer &&
      action.passingPlayer > 0 &&
      receivingTeam === team &&
      action.serveQuality &&
      !processedReceptionIds.has(action.id)
    ) {
      processedReceptionIds.add(action.id)

      if (!playerStats[action.passingPlayer]) {
        playerStats[action.passingPlayer] = emptyStats(
          action.passingPlayer,
          playerPositions[team]?.[action.passingPlayer] || "",
          playerNames[team]?.[action.passingPlayer] || "",
        )
      }

      if (action.passingQuality === "A") playerStats[action.passingPlayer].reception.A++
      else if (action.passingQuality === "B") playerStats[action.passingPlayer].reception.B++
      else if (action.passingQuality === "C") playerStats[action.passingPlayer].reception.C++
      else if (action.passingQuality === "D") playerStats[action.passingPlayer].reception.erro++
      else if (action.passingQuality === "R") playerStats[action.passingPlayer].reception.erro++
    }

    // Saque
    if (action.servingTeam === team && action.servingPlayer) {
      if (!playerStats[action.servingPlayer]) {
        playerStats[action.servingPlayer] = emptyStats(
          action.servingPlayer,
          playerPositions[team]?.[action.servingPlayer] || "",
          playerNames[team]?.[action.servingPlayer] || "",
        )
      }

      if (action.serveQuality === "+") playerStats[action.servingPlayer].serve.certo++
      else if (action.serveQuality === "-") playerStats[action.servingPlayer].serve.erro++
      else if (action.serveQuality === "ka") playerStats[action.servingPlayer].serve.ace++
    }

    // Ataque
    if (action.actionPlayer && action.actionPlayer > 0 && action.attackingTeam === team) {
      if (!playerStats[action.actionPlayer]) {
        playerStats[action.actionPlayer] = emptyStats(
          action.actionPlayer,
          playerPositions[team]?.[action.actionPlayer] || "",
          playerNames[team]?.[action.actionPlayer] || "",
        )
      }

      if (action.attackPosition === "O") playerStats[action.actionPlayer].attack.O++
      else if (action.attackPosition === "P") playerStats[action.actionPlayer].attack.P++
      else if (action.attackPosition === "M") playerStats[action.actionPlayer].attack.M++
      else if (action.attackPosition === "F" || action.attackPosition === "S")
        playerStats[action.actionPlayer].attack.FS++

      if (action.resultComplemento === "D" || action.resultComplemento === "V") {
        playerStats[action.actionPlayer].attack.certo++
      }

      if (action.resultComplemento === "#") {
        playerStats[action.actionPlayer].attack.ponto++
      } else if (action.resultComplemento === "!") {
        playerStats[action.actionPlayer].attack.erro++
      } else if (action.resultComplemento === "+") {
        playerStats[action.actionPlayer].attack.erro++
      } else if (action.resultComplemento === "%") {
        playerStats[action.actionPlayer].attack.erro++
      }
    }

    // Bloqueio
    if (action.blockingPlayer && action.blockingPlayer > 0) {
      const blockingTeam = action.attackingTeam === "A" ? "B" : "A"
      if (blockingTeam === team) {
        if (!playerStats[action.blockingPlayer]) {
          playerStats[action.blockingPlayer] = emptyStats(
            action.blockingPlayer,
            playerPositions[team]?.[action.blockingPlayer] || "",
            playerNames[team]?.[action.blockingPlayer] || "",
          )
        }

        if (action.attackPosition === "O") playerStats[action.blockingPlayer].block.O++
        else if (action.attackPosition === "P") playerStats[action.blockingPlayer].block.P++
        else if (action.attackPosition === "M") playerStats[action.blockingPlayer].block.M++
        else if (action.attackPosition === "F" || action.attackPosition === "S")
          playerStats[action.blockingPlayer].block.FS++
      }
    }

    // Defesa
    if (action.defensivePlayer && action.defensivePlayer > 0) {
      const defenseTeam =
        action.resultComplemento === "REC"
          ? (action.attackingTeam as "A" | "B")
          : action.attackingTeam === "A"
            ? "B"
            : "A"
      if (defenseTeam === team) {
        if (!playerStats[action.defensivePlayer]) {
          playerStats[action.defensivePlayer] = emptyStats(
            action.defensivePlayer,
            playerPositions[defenseTeam]?.[action.defensivePlayer] || "",
            playerNames[defenseTeam]?.[action.defensivePlayer] || "",
          )
        }
        if (action.resultComplemento === "V") playerStats[action.defensivePlayer].defense.V++
        else if (action.resultComplemento === "REC") playerStats[action.defensivePlayer].defense.R++
        else playerStats[action.defensivePlayer].defense.D++
      }
    }
  }

  const result = Object.values(playerStats).map((stat) => {
    const totalReceptionCorrect = stat.reception.A + stat.reception.B + stat.reception.C
    const totalServeCorrect = stat.serve.certo + stat.serve.ace
    const totalAttackCorrect = stat.attack.ponto + stat.attack.certo
    const totalBlock = stat.block.O + stat.block.P + stat.block.M + stat.block.FS
    const totalDefense = stat.defense.D + stat.defense.V + stat.defense.R

    stat.tp = totalReceptionCorrect + totalServeCorrect + totalAttackCorrect + totalBlock + totalDefense
    stat.te = stat.reception.erro + stat.serve.erro + stat.attack.erro
    stat.tgp = stat.tp > 0 && teamTotalPoints > 0 ? Math.round((stat.tp / teamTotalPoints) * 100) : 0

    return stat
  })

  return result.sort((a, b) => a.number - b.number)
}
