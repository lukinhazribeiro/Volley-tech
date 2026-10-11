export interface MatchAction {
  id: string
  timestamp: number
  servingTeam: "A" | "B"
  servingPlayer: number
  serveQuality: "+" | "-" | "ka"
  serveZone?: "7.5" | "8.6" | "9.1"
  /** Qualidade da recepção/passe; E é erro de passe. D/V/R são somente defesa. */
  passingQuality?: "A" | "B" | "C" | "E"
  passingPlayer?: number
  attackingTeam: "A" | "B"
  attackPosition?: "O" | "M" | "P" | "F" | "S"
  resultComplemento?: "#" | "!" | "$" | "%" | "+" | "D" | "V" | "REC"
  actionPlayer?: number
  defensivePlayer?: number
  /** Equipe do atleta que defendeu (evita adivinhação na planilha). */
  defensiveTeam?: "A" | "B"
  /** Atleta que fez o levantamento que originou este ataque (levantador automático ou outro). */
  settingPlayer?: number
  blockingPlayer?: number
  blockingPosition?: "O" | "M" | "P" | "FS"
  transitionType?: "k1" | "k2" | "k3"
  pointScoredBy?: "A" | "B"
  pointType?: "serve" | "attack" | "block" | "error"
  setNumber?: number
  /**
   * Registro GERAL da equipe adversária (sem leitura por atleta). Quando true,
   * a ação entra apenas no resumo geral da adversária no relatório, e não na
   * planilha detalhada por jogador.
   */
  general?: boolean
}

export interface TeamStats {
  serves: {
    correct: number
    errors: number
    aces: number
    zones: {
      "7.5": number
      "8.6": number
      "9.1": number
    }
  }
  reception: {
    qualityA: number
    qualityB: number
    qualityC: number
    errors: number
  }
  distribution: {
    O: number
    M: number
    P: number
    F: number
    S: number
  }
  /** Pontos concedidos pelo adversário em erros próprios. */
  opponentErrors: number
  attacks: {
    successful: number
    errors: number
    blocked: number
    defended: number
  }
  transitions: {
    k1: number
    k2: number
    k3: number
  }
  blocks: {
    successful: number
    errors: number
    positions: {
      O: number
      M: number
      P: number
      FS: number
    }
  }
  points: number
}

export function normalizeMatchActions(actions: MatchAction[]): MatchAction[] {
  const seen = new Set<string>()
  return actions.flatMap((action) => {
    const normalized: MatchAction = { ...action }
    const oppositeTeam = action.attackingTeam === "A" ? "B" : "A"
    const runtimePassingQuality = action.passingQuality as string | undefined

    // Ações antigas gravadas como D/R só são passe quando possuem saque e
    // jogador receptor; D/V/R sem esses campos continuam sendo defesa.
    if (action.serveZone && action.passingPlayer && (runtimePassingQuality === "D" || runtimePassingQuality === "R")) {
      normalized.passingQuality = "E"
    }

    // Toda indicação de erro concede o ponto à outra equipe. Persistimos essa
    // leitura antes dos cálculos para que resumo, planilha e TGR usem a mesma regra.
    if (action.serveQuality === "-") {
      normalized.pointScoredBy = oppositeTeam
      normalized.pointType = "error"
    } else if (normalized.passingQuality === "E") {
      normalized.pointScoredBy = action.servingTeam
      normalized.pointType = "error"
    } else if (["!", "%", "$"].includes(action.resultComplemento ?? "")) {
      normalized.pointScoredBy = oppositeTeam
      normalized.pointType = "error"
    } else if (action.serveQuality === "ka") {
      normalized.pointScoredBy = action.servingTeam
      normalized.pointType = "serve"
    } else if (action.resultComplemento === "#") {
      normalized.pointScoredBy = action.attackingTeam
      normalized.pointType = "attack"
    }

    const signature = [
      action.servingTeam,
      action.servingPlayer,
      action.serveQuality,
      action.serveZone ?? "",
      action.passingPlayer ?? "",
      action.passingQuality ?? "",
      action.attackingTeam,
      action.attackPosition ?? "",
      action.resultComplemento ?? "",
      action.actionPlayer ?? "",
      action.defensivePlayer ?? "",
      action.blockingPlayer ?? "",
      action.settingPlayer ?? "",
      action.pointScoredBy ?? "",
      normalized.pointScoredBy ?? "",
      normalized.pointType ?? "",
    ].join("|")
    if (seen.has(signature)) return []
    seen.add(signature)
    return [normalized]
  })
}

export function calculateMatchStats(actions: MatchAction[]) {
  const statsA: TeamStats = createEmptyStats()
  const statsB: TeamStats = createEmptyStats()

  const uniqueActions = normalizeMatchActions(actions)
  for (const action of uniqueActions) {
    processAction(action, statsA, statsB)
  }

  return { statsA, statsB }
}

export function createEmptyStats(): TeamStats {
  return {
    serves: { correct: 0, errors: 0, aces: 0, zones: { "7.5": 0, "8.6": 0, "9.1": 0 } },
    reception: { qualityA: 0, qualityB: 0, qualityC: 0, errors: 0 },
    distribution: { O: 0, M: 0, P: 0, F: 0, S: 0 },
    opponentErrors: 0,
    attacks: { successful: 0, errors: 0, blocked: 0, defended: 0 },
    transitions: { k1: 0, k2: 0, k3: 0 },
    blocks: { successful: 0, errors: 0, positions: { O: 0, M: 0, P: 0, FS: 0 } },
    points: 0,
  }
}

export function calculateTeamStats(actions: MatchAction[], team: "A" | "B"): TeamStats {
  const stats = createEmptyStats()
  const opposingTeam = team === "A" ? "B" : "A"
  
  for (const action of normalizeMatchActions(actions)) {
    // Count serves for this team
    if (action.servingTeam === team) {
      if (action.serveQuality === "ka") {
        stats.serves.aces++
      } else if (action.serveQuality === "-") {
        stats.serves.errors++
      } else if (action.serveQuality === "+" && action.serveZone && action.servingPlayer > 0 && !action.attackPosition && !action.resultComplemento) {
        // Saque certo: o saque entrou em jogo e houve ação adversária.
        stats.serves.correct++
      }
      
      if (action.serveZone) {
        stats.serves.zones[action.serveZone]++
      }
    }
    
    // Count receptions for this team (when opposing team serves)
    if (action.servingTeam === opposingTeam && action.serveZone && action.passingPlayer > 0 && action.passingQuality) {
      if (action.passingQuality === "A") stats.reception.qualityA++
      else if (action.passingQuality === "B") stats.reception.qualityB++
      else if (action.passingQuality === "C") stats.reception.qualityC++
      else if (action.passingQuality === "E") stats.reception.errors++
    }
    
    // Count attacks for this team
    if (action.attackingTeam === team && action.attackPosition) {
      stats.distribution[action.attackPosition]++
      
      if (action.resultComplemento === "#") {
        stats.attacks.successful++
      } else if (action.resultComplemento === "!") {
        stats.attacks.errors++
      } else if (action.resultComplemento === "+") {
        stats.attacks.blocked++
      } else if (action.resultComplemento === "D") {
        stats.attacks.defended++
      }
    }
    
    if (action.pointScoredBy === team && action.transitionType) {
      const transitionType = action.transitionType.toLowerCase()
      if (transitionType === "k1") stats.transitions.k1++
      else if (transitionType === "k2") stats.transitions.k2++
      else if (transitionType === "k3") stats.transitions.k3++
    }
    
    // Count blocks for this team (when they block opposing team's attack)
    if (action.attackingTeam === opposingTeam && action.resultComplemento === "+") {
      stats.blocks.successful++
      if (action.blockingPosition) {
        stats.blocks.positions[action.blockingPosition]++
      }
    }
    
    // Count block errors for this team
    if (action.attackingTeam === opposingTeam && action.resultComplemento === "$") {
      stats.blocks.errors++
    }
    
    // Count points for this team
    if (action.pointScoredBy === team) {
      stats.points++
      if (action.pointType === "error" || action.serveQuality === "-" || action.passingQuality === "E" || action.resultComplemento === "!" || action.resultComplemento === "%") {
        stats.opponentErrors++
      }
    }
  }
  
  return stats
}

function processAction(action: MatchAction, statsA: TeamStats, statsB: TeamStats) {
  const servingStats = action.servingTeam === "A" ? statsA : statsB
  const receivingStats = action.servingTeam === "A" ? statsB : statsA

  if (action.serveQuality === "ka") {
    // Ace: serving team scores
    servingStats.serves.aces++
    servingStats.points++
    action.pointScoredBy = action.servingTeam
    return
  }

  if (action.serveQuality === "-") {
    // Serve error: receiving team scores
    servingStats.serves.errors++
    receivingStats.points++
    action.pointScoredBy = action.servingTeam === "A" ? "B" : "A"
    return
  }

  // Saque CERTO só é contado na ação REAL de saque em jogo (identificada por
  // ter serveZone). As demais ações do rally herdam serveQuality "+" por padrão
  // no emit e NÃO devem contar saque de novo (evita 1 saque virar 3).
  if (action.serveQuality === "+" && action.serveZone) {
    servingStats.serves.correct++
  }

  // Setting error: attacking team loses the point, defending team scores
  if (action.resultComplemento === "%") {
    const attackingStats = action.attackingTeam === "A" ? statsA : statsB
    const defendingStats = action.attackingTeam === "A" ? statsB : statsA
    attackingStats.attacks.errors++
    defendingStats.points++
    action.pointScoredBy = action.attackingTeam === "A" ? "B" : "A"
    return
  }

  // Pure attack actions may not have serveZone or passingQuality filled
  if (action.attackPosition && action.resultComplemento) {
    const attackingStats = action.attackingTeam === "A" ? statsA : statsB
    const defendingStats = action.attackingTeam === "A" ? statsB : statsA

    attackingStats.distribution[action.attackPosition]++

    if (action.resultComplemento === "#") {
      // Point to attacking team
      attackingStats.attacks.successful++
      attackingStats.points++
      action.pointScoredBy = action.attackingTeam
      return
    } else if (action.resultComplemento === "!") {
      // Attack error: defending team scores
      attackingStats.attacks.errors++
      defendingStats.points++
      action.pointScoredBy = action.attackingTeam === "A" ? "B" : "A"
      return
    } else if (action.resultComplemento === "$") {
      // Block by attacking team (impossible, but kept for completeness)
      attackingStats.blocks.successful++
      attackingStats.points++
      action.pointScoredBy = action.attackingTeam
      return
    } else if (action.resultComplemento === "+") {
      attackingStats.attacks.blocked++
      defendingStats.blocks.successful++
      defendingStats.points++
      // Block statistics are now tracked by blocker position
      if (action.blockingPosition) {
        defendingStats.blocks.positions[action.blockingPosition]++
      }
      action.pointScoredBy = action.attackingTeam === "A" ? "B" : "A"
      return
    } else if (action.resultComplemento === "D") {
      attackingStats.attacks.successful++
      return
    } else if (action.resultComplemento === "V") {
      // Volume: ataque sem ponto, a bola é defendida pela equipe adversária
      attackingStats.attacks.successful++
      return
    } else if (action.resultComplemento === "REC") {
      // Recuperação: ataque bloqueado pelo adversário, mas recuperado (defendido)
      // pela própria equipe atacante. Não há ponto - a jogada continua.
      attackingStats.attacks.blocked++
      defendingStats.blocks.successful++
      if (action.blockingPosition) {
        defendingStats.blocks.positions[action.blockingPosition]++
      }
      return
    }
  }

  // If we reach here, this is a serve action with reception data
  if (!action.serveZone || !action.passingQuality) {
    return
  }

  servingStats.serves.zones[action.serveZone]++

  if (action.passingQuality === "A") receivingStats.reception.qualityA++
  else if (action.passingQuality === "B") receivingStats.reception.qualityB++
  else if (action.passingQuality === "C") receivingStats.reception.qualityC++
  else if (action.passingQuality === "E") {
    // Reception error: serving team scores
    receivingStats.reception.errors++
    servingStats.points++
    action.pointScoredBy = action.servingTeam
    return
  }
}
