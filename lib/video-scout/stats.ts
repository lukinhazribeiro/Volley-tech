import {
  BLOQUEIO_LABEL,
  DEFESA_LABEL,
  FUNDAMENTO_ORDER,
  LEVANTAMENTO_LABEL,
  type BloqueioPosicao,
  type DefesaTipo,
  type Fundamento,
  type LevantamentoAlvo,
  type Player,
  type ScoutAction,
} from "./types"

// Paleta de cores para os segmentos dos gráficos.
const COR = {
  verde: "#16a34a",
  azul: "#2563eb",
  vermelho: "#dc2626",
  laranja: "#f59e0b",
  teal: "#0d9488",
  violeta: "#7c3aed",
}

export interface BreakdownSegment {
  key: string
  label: string
  value: number
  color: string
}

export interface FundamentoBreakdown {
  fundamento: Fundamento
  total: number
  segments: BreakdownSegment[]
}

/**
 * Calcula o detalhamento de cada fundamento para os gráficos, com a
 * classificação pedida:
 * - Saque: certo, ponto, erro
 * - Recepção: certo, erro
 * - Levantamento: ponta, meio, oposto, fundo, segunda, erro
 * - Ataque: certo, ponto, erro
 * - Bloqueio: ponta, meio, oposto (pontos de bloqueio que eu faço)
 * - Defesa: defesa de ataque, passe de volume, recuperação de bloqueio
 */
export function computeBreakdowns(actions: ScoutAction[]): FundamentoBreakdown[] {
  const of = (f: Fundamento) => actions.filter((a) => a.fundamento === f)
  const result: FundamentoBreakdown[] = []

  // Saque: certo (em jogo), ponto (ace), erro.
  {
    const list = of("saque")
    result.push({
      fundamento: "saque",
      total: list.length,
      segments: [
        { key: "certo", label: "Certo", value: list.filter((a) => a.resultado === "continuidade").length, color: COR.azul },
        { key: "ponto", label: "Ponto", value: list.filter((a) => a.resultado === "ponto").length, color: COR.verde },
        { key: "erro", label: "Erro", value: list.filter((a) => a.resultado === "erro").length, color: COR.vermelho },
      ],
    })
  }

  // Recepção: certo, erro.
  {
    const list = of("recepcao")
    const erro = list.filter((a) => a.resultado === "erro").length
    result.push({
      fundamento: "recepcao",
      total: list.length,
      segments: [
        { key: "certo", label: "Certo", value: list.length - erro, color: COR.verde },
        { key: "erro", label: "Erro", value: erro, color: COR.vermelho },
      ],
    })
  }

  // Levantamento: por alvo.
  {
    const list = of("levantamento")
    const alvos: { k: LevantamentoAlvo; c: string }[] = [
      { k: "ponta", c: COR.verde },
      { k: "meio", c: COR.azul },
      { k: "oposto", c: COR.laranja },
      { k: "fundo", c: COR.teal },
      { k: "segunda", c: COR.violeta },
      { k: "erro", c: COR.vermelho },
    ]
    result.push({
      fundamento: "levantamento",
      total: list.length,
      segments: alvos.map(({ k, c }) => ({
        key: k,
        label: LEVANTAMENTO_LABEL[k],
        value: list.filter((a) =>
          k === "erro" ? a.detalhe === "erro" || a.resultado === "erro" : a.detalhe === k,
        ).length,
        color: c,
      })),
    })
  }

  // Ataque: certo, ponto, erro.
  {
    const list = of("ataque")
    result.push({
      fundamento: "ataque",
      total: list.length,
      segments: [
        { key: "certo", label: "Certo", value: list.filter((a) => a.resultado === "continuidade").length, color: COR.azul },
        { key: "ponto", label: "Ponto", value: list.filter((a) => a.resultado === "ponto").length, color: COR.verde },
        { key: "erro", label: "Erro", value: list.filter((a) => a.resultado === "erro").length, color: COR.vermelho },
      ],
    })
  }

  // Bloqueio: pontos de bloqueio por posição (ponta, meio, oposto).
  {
    const list = of("bloqueio")
    const pos: { k: BloqueioPosicao; c: string }[] = [
      { k: "ponta", c: COR.verde },
      { k: "meio", c: COR.azul },
      { k: "oposto", c: COR.laranja },
    ]
    const segments = pos.map(({ k, c }) => ({
      key: k,
      label: BLOQUEIO_LABEL[k],
      value: list.filter((a) => a.detalhe === k).length,
      color: c,
    }))
    result.push({
      fundamento: "bloqueio",
      total: segments.reduce((s, x) => s + x.value, 0),
      segments,
    })
  }

  // Defesa: por tipo.
  {
    const list = of("defesa")
    const tipos: { k: DefesaTipo; c: string }[] = [
      { k: "ataque", c: COR.verde },
      { k: "volume", c: COR.azul },
      { k: "recuperacao", c: COR.laranja },
    ]
    result.push({
      fundamento: "defesa",
      total: list.length,
      segments: tipos.map(({ k, c }) => ({
        key: k,
        label: DEFESA_LABEL[k],
        value: list.filter((a) => a.detalhe === k).length,
        color: c,
      })),
    })
  }

  return result
}

export interface FundamentoStat {
  fundamento: Fundamento
  total: number
  pontos: number
  erros: number
  /** Eficiência: (pontos - erros) / total, em %. */
  eficiencia: number
}

export interface PlayerStat {
  player: Player
  total: number
  pontos: number
  /** Ações positivas (perfeito/positivo) que não são ponto nem erro. */
  positivas: number
  erros: number
  porFundamento: Record<Fundamento, { total: number; pontos: number; erros: number }>
  /** Defesas separadas por tipo: defesa de ataque, passe de volume e recuperação. */
  defesaPorTipo: Record<DefesaTipo, number>
  eficienciaAtaque: number
  eficienciaSaque: number
  /** Aproveitamento de recepção (% de recepções sem erro). */
  recepcaoPositiva: number
}

export interface ScoutSummary {
  totalAcoes: number
  totalPontos: number
  totalErros: number
  porFundamento: FundamentoStat[]
  jogadores: PlayerStat[]
}

function emptyFundamentoMap() {
  const map = {} as Record<
    Fundamento,
    { total: number; pontos: number; erros: number }
  >
  for (const f of FUNDAMENTO_ORDER) {
    map[f] = { total: 0, pontos: 0, erros: 0 }
  }
  return map
}

function efficiency(pontos: number, erros: number, total: number): number {
  if (total === 0) return 0
  return Number((((pontos - erros) / total) * 100).toFixed(1))
}

export function computeSummary(
  actions: ScoutAction[],
  players: Player[],
): ScoutSummary {
  const fundamentoAgg = emptyFundamentoMap()
  const playerAgg = new Map<
    string,
    {
      total: number
      pontos: number
      positivas: number
      erros: number
      porFundamento: Record<Fundamento, { total: number; pontos: number; erros: number }>
      defesaPorTipo: Record<DefesaTipo, number>
    }
  >()

  for (const p of players) {
    playerAgg.set(p.id, {
      total: 0,
      pontos: 0,
      positivas: 0,
      erros: 0,
      porFundamento: emptyFundamentoMap(),
      defesaPorTipo: { ataque: 0, volume: 0, recuperacao: 0 },
    })
  }

  let totalPontos = 0
  let totalErros = 0

  for (const a of actions) {
    const isPonto = a.resultado === "ponto"
    const isErro = a.resultado === "erro"

    fundamentoAgg[a.fundamento].total += 1
    if (isPonto) {
      fundamentoAgg[a.fundamento].pontos += 1
      totalPontos += 1
    }
    if (isErro) {
      fundamentoAgg[a.fundamento].erros += 1
      totalErros += 1
    }

    if (a.playerId && playerAgg.has(a.playerId)) {
      const pa = playerAgg.get(a.playerId)!
      pa.total += 1
      pa.porFundamento[a.fundamento].total += 1
      if (a.fundamento === "defesa") {
        const tipo = (a.detalhe as DefesaTipo) ?? "volume"
        if (tipo === "ataque" || tipo === "volume" || tipo === "recuperacao") {
          pa.defesaPorTipo[tipo] += 1
        }
      }
      if (isPonto) {
        pa.pontos += 1
        pa.porFundamento[a.fundamento].pontos += 1
      } else if (isErro) {
        pa.erros += 1
        pa.porFundamento[a.fundamento].erros += 1
      } else {
        // Nem ponto nem erro = ação positiva (perfeito/positivo → continuidade).
        pa.positivas += 1
      }
    }
  }

  const porFundamento: FundamentoStat[] = FUNDAMENTO_ORDER.map((f) => ({
    fundamento: f,
    total: fundamentoAgg[f].total,
    pontos: fundamentoAgg[f].pontos,
    erros: fundamentoAgg[f].erros,
    eficiencia: efficiency(
      fundamentoAgg[f].pontos,
      fundamentoAgg[f].erros,
      fundamentoAgg[f].total,
    ),
  }))

  const jogadores: PlayerStat[] = players
    .map((player) => {
      const pa = playerAgg.get(player.id)!
      const atk = pa.porFundamento.ataque
      const saque = pa.porFundamento.saque
      const recep = pa.porFundamento.recepcao
      return {
        player,
        total: pa.total,
        pontos: pa.pontos,
        positivas: pa.positivas,
        erros: pa.erros,
        porFundamento: pa.porFundamento,
        defesaPorTipo: pa.defesaPorTipo,
        eficienciaAtaque: efficiency(atk.pontos, atk.erros, atk.total),
        eficienciaSaque: efficiency(saque.pontos, saque.erros, saque.total),
        recepcaoPositiva:
          recep.total === 0
            ? 0
            : Number((((recep.total - recep.erros) / recep.total) * 100).toFixed(1)),
      }
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.pontos - a.pontos || b.total - a.total)

  return {
    totalAcoes: actions.length,
    totalPontos,
    totalErros,
    porFundamento,
    jogadores,
  }
}
