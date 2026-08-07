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
 * Total de ações positivas de uma atleta (TP), exatamente como o Scout calcula:
 * recepção certa + (saque certo + ace) + (ataque ponto + certo) + bloqueios + defesas.
 * No modelo do Hub isso equivale à soma de (certo + ponto) de cada fundamento.
 *
 * É a base do TGP: TGP = TP da atleta ÷ TP total da equipe × 100 — o mesmo
 * percentual exibido na planilha e no relatório do Scout.
 */
export function positiveActions(f: PlayerFundamentals): number {
  let tp = 0
  for (const key of FUNDAMENTALS) {
    tp += f[key].certo + f[key].ponto
  }
  return tp
}

/** TE — total de erros da atleta (soma dos erros de todos os fundamentos). */
export function errorActions(f: PlayerFundamentals): number {
  let te = 0
  for (const key of FUNDAMENTALS) {
    te += f[key].erro
  }
  return te
}

/**
 * TG (Total Great) — pontos feitos pela atleta:
 * ataque convertido (ponto) + ace de saque (ponto) + pontos de bloqueio (certo).
 */
export function greatActions(f: PlayerFundamentals): number {
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
      // Recepção binária, idêntica à planilha: A/B = certo; o resto = erro.
      const positive = action.passingQuality === "A" || action.passingQuality === "B"
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

    // ---- Ataque ---- classificação ÚNICA, idêntica à planilha oficial.
    //   "#" = ponto | "!","+","%" = erro | "D","V" = certo (defendido/volume)
    //   "REC" com origem no bloqueio (blockingPlayer sem defensivePlayer) = certo
    //   (ataque bloqueado mas recuperado — conta uma vez; a recuperação da defesa
    //    traz defensivePlayer e é ignorada aqui para não duplicar).
    if (action.actionPlayer && action.actionPlayer > 0 && action.attackingTeam === team) {
      const comp = action.resultComplemento
      const a = ensure(action.actionPlayer).fundamentals.ataque
      let outcome: "certo" | "erro" | "ponto" | null = null
      if (comp === "#") outcome = "ponto"
      else if (comp === "!" || comp === "+" || comp === "%") outcome = "erro"
      else if (comp === "D" || comp === "V") outcome = "certo"
      else if (comp === "REC" && action.blockingPlayer && !action.defensivePlayer) outcome = "certo"
      if (outcome) {
        a[outcome]++
        a.total++
      }
    }

    // ---- Bloqueio ---- só do time que bloqueia (evita contaminar números iguais).
    if (action.blockingPlayer && action.blockingPlayer > 0) {
      const blockingTeam: "A" | "B" = action.attackingTeam === "A" ? "B" : "A"
      if (blockingTeam === team) {
        const b = ensure(action.blockingPlayer).fundamentals.bloqueio
        b.certo++
        b.total++
      }
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
