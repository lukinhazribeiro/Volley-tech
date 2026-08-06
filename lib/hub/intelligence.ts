/**
 * Volley Hub — inteligência esportiva.
 *
 * Índice de Performance Técnica do Voleibol (IPTV) e Avaliação Inteligente.
 * Tudo é derivado dos dados de scout; nenhum módulo externo é alterado.
 */

import {
  FUNDAMENTALS,
  FUNDAMENTAL_LABELS,
  successRate,
  type Fundamental,
  type PlayerFundamentals,
} from "./stats"

/** Peso padrão de cada fundamento no índice técnico (usado quando a posição é desconhecida). */
const IPTV_WEIGHTS: Record<Fundamental, number> = {
  ataque: 0.25,
  recepcao: 0.2,
  defesa: 0.2,
  bloqueio: 0.15,
  saque: 0.2,
}

/** Funções táticas reconhecidas para a avaliação por posição. */
export type PositionRole = "libero" | "central" | "ponteira" | "oposta" | "levantadora" | "padrao"

/**
 * Pesos dos fundamentos POR POSIÇÃO. Cada função é avaliada apenas pelas
 * responsabilidades que realmente lhe cabem — os demais fundamentos recebem
 * peso zero e não interferem no índice.
 *
 *  - Líbero:     recepção + defesa (ataque e bloqueio não contam)
 *  - Central:    bloqueio + ataque de meio + saque
 *  - Ponteira:   recepção + ataque + defesa + saque
 *  - Oposta:     ataque + bloqueio + saque
 *  - Levantadora: tratada à parte (avaliada pela distribuição do jogo)
 */
const POSITION_WEIGHTS: Record<PositionRole, Record<Fundamental, number>> = {
  libero: { recepcao: 0.55, defesa: 0.45, ataque: 0, bloqueio: 0, saque: 0 },
  central: { bloqueio: 0.45, ataque: 0.35, saque: 0.2, recepcao: 0, defesa: 0 },
  ponteira: { recepcao: 0.3, ataque: 0.35, defesa: 0.2, saque: 0.15, bloqueio: 0 },
  oposta: { ataque: 0.55, bloqueio: 0.25, saque: 0.2, recepcao: 0, defesa: 0 },
  levantadora: { ataque: 0, recepcao: 0, defesa: 0, bloqueio: 0, saque: 0 },
  padrao: IPTV_WEIGHTS,
}

/** Normaliza o texto da posição (com/sem acento, masc./fem.) numa função tática. */
export function resolveRole(position: string | null | undefined): PositionRole {
  const p = (position ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
  if (!p) return "padrao"
  if (p.includes("libero")) return "libero"
  if (p.includes("central") || p.includes("meio")) return "central"
  if (p.includes("opost")) return "oposta"
  if (p.includes("levant") || p.includes("setter") || p.includes("armad")) return "levantadora"
  if (p.includes("ponteir") || p.includes("ponta") || p.includes("lateral")) return "ponteira"
  return "padrao"
}

/**
 * IPTV — Índice de Performance Técnica do Voleibol (0-100), avaliado de acordo
 * com a POSIÇÃO da atleta. Considera apenas os fundamentos relevantes à função
 * e que tenham volume registrado.
 *
 * A levantadora, quando há dados de distribuição, é avaliada pela QUALIDADE da
 * distribuição (não pela quantidade de levantamentos) — ver `computeSetterIndex`.
 */
export function computeIPTV(
  f: PlayerFundamentals,
  position?: string | null,
  setter?: SetterDistribution | null,
): number {
  const role = resolveRole(position)

  if (role === "levantadora") {
    // Prioriza a avaliação por distribuição; se ainda não houver dados de
    // distribuição, cai no índice técnico padrão para não zerar a atleta.
    const idx = setter ? computeSetterIndex(setter) : null
    if (idx != null) return idx
    return weightedIndex(f, IPTV_WEIGHTS)
  }

  return weightedIndex(f, POSITION_WEIGHTS[role])
}

/** Média ponderada dos percentuais de acerto, ignorando fundamentos sem volume ou peso zero. */
function weightedIndex(f: PlayerFundamentals, weights: Record<Fundamental, number>): number {
  let sum = 0
  let weight = 0
  for (const key of FUNDAMENTALS) {
    if (weights[key] > 0 && f[key].total > 0) {
      sum += successRate(f[key]) * weights[key]
      weight += weights[key]
    }
  }
  if (weight === 0) return 0
  return Math.round(sum / weight)
}

/**
 * Distribuição de jogo da levantadora. Cada campo é a quantidade de bolas
 * distribuídas para cada função/alvo, além da eficiência ofensiva gerada.
 * Os dados vêm do Scout View IA (que já registra o alvo do levantamento);
 * o Hub apenas os lê.
 */
export interface SetterDistribution {
  central: number
  ponteira: number
  oposta: number
  pipe: number
  /** Pontos gerados pelas jogadas distribuídas (para eficiência ofensiva). */
  pointsGenerated: number
  /** Total de ataques resultantes das distribuições. */
  attacksGenerated: number
}

export const SETTER_TARGET_LABELS: Record<"central" | "ponteira" | "oposta" | "pipe", string> = {
  central: "Central",
  ponteira: "Ponteiras",
  oposta: "Oposta",
  pipe: "PIPE",
}

/**
 * Índice de qualidade de DISTRIBUIÇÃO da levantadora (0-100).
 * Combina:
 *   - Equilíbrio da distribuição entre os alvos (entropia normalizada);
 *   - Eficiência ofensiva gerada (pontos ÷ ataques distribuídos).
 * Retorna null quando não há volume suficiente para avaliar.
 */
export function computeSetterIndex(d: SetterDistribution): number | null {
  const targets = [d.central, d.ponteira, d.oposta, d.pipe]
  const totalSets = targets.reduce((a, b) => a + b, 0)
  if (totalSets <= 0) return null

  // 1) Equilíbrio: entropia de Shannon normalizada (0 = tudo num alvo, 1 = perfeito).
  let entropy = 0
  for (const t of targets) {
    if (t <= 0) continue
    const p = t / totalSets
    entropy -= p * Math.log(p)
  }
  const balance = entropy / Math.log(targets.length) // 0..1

  // 2) Eficiência ofensiva gerada pelas distribuições (0..1).
  const efficiency = d.attacksGenerated > 0 ? d.pointsGenerated / d.attacksGenerated : 0

  // Peso maior para a eficiência (qualidade) do que para o equilíbrio.
  const score = efficiency * 0.6 + balance * 0.4
  return Math.round(Math.min(1, Math.max(0, score)) * 100)
}

/** Frequência relativa (%) de utilização de cada alvo pela levantadora. */
export function setterUsage(d: SetterDistribution): Record<"central" | "ponteira" | "oposta" | "pipe", number> {
  const total = d.central + d.ponteira + d.oposta + d.pipe
  if (total <= 0) return { central: 0, ponteira: 0, oposta: 0, pipe: 0 }
  return {
    central: Math.round((d.central / total) * 100),
    ponteira: Math.round((d.ponteira / total) * 100),
    oposta: Math.round((d.oposta / total) * 100),
    pipe: Math.round((d.pipe / total) * 100),
  }
}

/** Percentuais por fundamento (0-100), úteis para a Evolução. */
export function percentuais(f: PlayerFundamentals): Record<Fundamental, number> {
  return {
    ataque: successRate(f.ataque),
    recepcao: successRate(f.recepcao),
    defesa: successRate(f.defesa),
    bloqueio: successRate(f.bloqueio),
    saque: successRate(f.saque),
  }
}

/** Expectativa média por posição (base para a Avaliação Inteligente). */
const POSITION_BASELINE: Record<string, Partial<Record<Fundamental, number>>> = {
  Ponteiro: { ataque: 55, recepcao: 60, defesa: 55, bloqueio: 45, saque: 55 },
  Oposto: { ataque: 60, recepcao: 40, defesa: 45, bloqueio: 50, saque: 55 },
  Central: { ataque: 60, recepcao: 30, defesa: 40, bloqueio: 60, saque: 55 },
  Levantador: { ataque: 40, recepcao: 45, defesa: 55, bloqueio: 45, saque: 55 },
  Líbero: { ataque: 0, recepcao: 70, defesa: 70, bloqueio: 0, saque: 0 },
  Padrão: { ataque: 50, recepcao: 50, defesa: 50, bloqueio: 50, saque: 50 },
}

function baselineFor(position: string): Partial<Record<Fundamental, number>> {
  const key = Object.keys(POSITION_BASELINE).find((k) =>
    position?.toLowerCase().includes(k.toLowerCase()),
  )
  return POSITION_BASELINE[key ?? "Padrão"]
}

/**
 * Gera automaticamente um texto de Avaliação Inteligente considerando a
 * posição da atleta, a evolução entre o histórico anterior e o atual, e os
 * fundamentos abaixo da média da posição.
 */
export function generateEvaluation(params: {
  athleteName: string
  position: string
  current: PlayerFundamentals
  previous?: PlayerFundamentals
}): string {
  const { athleteName, position, current, previous } = params
  const cur = percentuais(current)
  const prev = previous ? percentuais(previous) : null
  const baseline = baselineFor(position)

  const evolved: string[] = []
  const dropped: string[] = []
  const below: string[] = []

  for (const key of FUNDAMENTALS) {
    if (current[key].total === 0) continue
    const label = FUNDAMENTAL_LABELS[key].toLowerCase()
    if (prev && previous![key].total > 0) {
      const diff = cur[key] - prev[key]
      if (diff >= 5) evolved.push(label)
      else if (diff <= -5) dropped.push(label)
    }
    const base = baseline[key]
    if (typeof base === "number" && base > 0 && cur[key] < base - 5) {
      below.push(label)
    }
  }

  const firstName = athleteName.split(" ")[0] || "A atleta"
  const parts: string[] = []

  if (evolved.length > 0) {
    parts.push(
      `A atleta apresentou evolução ${listPt(evolved)} nesta competição.`,
    )
  } else if (!prev) {
    const best = FUNDAMENTALS.filter((k) => current[k].total > 0).sort(
      (a, b) => cur[b] - cur[a],
    )[0]
    if (best) {
      parts.push(
        `Nesta competição, ${firstName} teve como destaque técnico ${FUNDAMENTAL_LABELS[best].toLowerCase()} (${cur[best]}% de aproveitamento).`,
      )
    } else {
      parts.push(`Ainda não há dados suficientes para avaliar ${firstName} nesta competição.`)
    }
  } else {
    parts.push("Os fundamentos permaneceram estáveis em relação ao histórico anterior.")
  }

  if (dropped.length > 0) {
    parts.push(`Houve queda ${listPt(dropped)}, que merece acompanhamento.`)
  }

  if (below.length > 0) {
    parts.push(
      `${cap(listPt(below))} permaneceu abaixo da média esperada para a posição de ${position || "sua função"} e deverá receber maior atenção nos treinamentos.`,
    )
  } else if (position) {
    parts.push(`No geral, o desempenho está alinhado ao esperado para a posição de ${position}.`)
  }

  return parts.join(" ")
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Junta itens em português: "a, b e c". */
function listPt(items: string[]): string {
  if (items.length === 0) return ""
  if (items.length === 1) return `no ${items[0]}`
  const last = items[items.length - 1]
  return `no ${items.slice(0, -1).join(", ")} e no ${last}`
}
