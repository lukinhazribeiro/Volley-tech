/**
 * Volley Hub — extração de estatísticas.
 *
 * O Hub é INDEPENDENTE: ele lê as ações de um scout (MatchAction[]) e produz
 * um resumo por atleta dos 5 fundamentos. Não altera nada no Scout Volleyball
 * nem depende dos componentes dele — apenas interpreta os dados.
 */

import type { MatchAction } from "@/lib/scout/match-parser"

export const FUNDAMENTALS = ["ataque", "recepcao", "defesa", "bloqueio", "saque"] as const
export type Fundamental = (typeof FUNDAMENTALS)[number]

export const FUNDAMENTAL_LABELS: Record<Fundamental, string> = {
  ataque: "Ataque",
  recepcao: "Recepção",
  defesa: "Defesa",
  bloqueio: "Bloqueio",
  saque: "Saque",
}

/** Contagem certo/erro (+ ponto/ace quando aplicável) de um fundamento. */
export interface FundamentalCount {
  certo: number
  erro: number
  ponto: number
  total: number
}

export interface PlayerFundamentals {
  ataque: FundamentalCount
  recepcao: FundamentalCount
  defesa: FundamentalCount
  bloqueio: FundamentalCount
  saque: FundamentalCount
}

export interface PlayerStatSummary {
  number: number
  name: string
  position: string
  fundamentals: PlayerFundamentals
}

function empty(): FundamentalCount {
  return { certo: 0, erro: 0, ponto: 0, total: 0 }
}

function emptyFundamentals(): PlayerFundamentals {
  return {
    ataque: empty(),
    recepcao: empty(),
    defesa: empty(),
    bloqueio: empty(),
    saque: empty(),
  }
}

/** Percentual de acerto (0-100) de um fundamento. */
export function successRate(c: FundamentalCount): number {
  if (c.total <= 0) return 0
  return Math.round(((c.certo + c.ponto) / c.total) * 100)
}

/**
 * Pontos marcados por uma atleta a partir dos fundamentos:
 * ataque convertido + ace de saque + ponto de bloqueio.
 * (Base do TGP — participação nos pontos da equipe.)
 */
export function scoredPoints(f: PlayerFundamentals): number {
  return f.ataque.ponto + f.saque.ponto + f.bloqueio.certo
}

/**
 * Extrai o resumo por atleta de UM time (A ou B) a partir das ações do scout.
 * A lógica de contagem espelha a planilha oficial do Scout, mas o Hub mantém
 * sua própria implementação para não criar dependência entre módulos.
 */
export function extractTeamPlayerStats(
  actions: MatchAction[],
  team: "A" | "B",
  playerNames: Record<number, string> = {},
): PlayerStatSummary[] {
  const stats: Record<number, PlayerStatSummary> = {}

  const ensure = (num: number): PlayerStatSummary => {
    if (!stats[num]) {
      stats[num] = {
        number: num,
        name: playerNames[num] || "",
        position: "",
        fundamentals: emptyFundamentals(),
      }
    }
    return stats[num]
  }

  const processedReception = new Set<string>()

  for (const action of actions) {
    const receivingTeam = action.servingTeam === "A" ? "B" : "A"

    // ---- Recepção (passe) ---- binário: certo / erro
    if (
      action.passingPlayer &&
      action.passingPlayer > 0 &&
      receivingTeam === team &&
      action.serveZone &&
      !processedReception.has(action.id)
    ) {
      processedReception.add(action.id)
      const p = ensure(action.passingPlayer).fundamentals.recepcao
      const positive = ["A", "B", "C"].includes(action.passingQuality as string)
      if (positive) p.certo++
      else p.erro++
      p.total++
    }

    // ---- Saque ---- só a ação real de saque (com serveZone) ou terminal
    if (action.servingTeam === team && action.servingPlayer) {
      const isServe =
        action.serveQuality === "ka" ||
        action.serveQuality === "-" ||
        (action.serveQuality === "+" && !!action.serveZone)
      if (isServe) {
        const s = ensure(action.servingPlayer).fundamentals.saque
        if (action.serveQuality === "ka") {
          s.ponto++
        } else if (action.serveQuality === "-") {
          s.erro++
        } else {
          s.certo++
        }
        s.total++
      }
    }

    // ---- Ataque ---- (mesmos códigos da planilha oficial)
    //   "#" = ponto | "!","+","%" = erro | "D","V" = ataque certo (defendido)
    if (action.actionPlayer && action.actionPlayer > 0 && action.attackingTeam === team) {
      const comp = action.resultComplemento
      const a = ensure(action.actionPlayer).fundamentals.ataque
      if (comp === "#") {
        a.ponto++
        a.total++
      } else if (comp === "!" || comp === "+" || comp === "%") {
        a.erro++
        a.total++
      } else if (comp === "D" || comp === "V") {
        a.certo++
        a.total++
      }
    }

    // ---- Bloqueio ----
    if (action.blockingPlayer && action.blockingPlayer > 0) {
      const b = ensure(action.blockingPlayer).fundamentals.bloqueio
      b.certo++
      b.total++
    }

    // ---- Defesa ---- usa defensiveTeam quando disponível
    if (action.defensivePlayer && action.defensivePlayer > 0) {
      const defenseTeam: "A" | "B" =
        action.defensiveTeam ??
        (action.resultComplemento === "REC"
          ? (action.attackingTeam as "A" | "B")
          : action.attackingTeam === "A"
            ? "B"
            : "A")
      if (defenseTeam === team) {
        const d = ensure(action.defensivePlayer).fundamentals.defesa
        d.certo++
        d.total++
      }
    }
  }

  return Object.values(stats).filter((p) => p.name || p.number)
}

/** Agrega vários resumos de fundamentos (várias partidas) num só. */
export function aggregateFundamentals(list: PlayerFundamentals[]): PlayerFundamentals {
  const acc = emptyFundamentals()
  for (const f of list) {
    for (const key of FUNDAMENTALS) {
      acc[key].certo += f[key].certo
      acc[key].erro += f[key].erro
      acc[key].ponto += f[key].ponto
      acc[key].total += f[key].total
    }
  }
  return acc
}

export type Trend = "up" | "stable" | "down"

/** Compara dois percentuais e retorna o indicador de evolução. */
export function trendFrom(previous: number, current: number): Trend {
  const diff = current - previous
  if (diff >= 5) return "up"
  if (diff <= -5) return "down"
  return "stable"
}
