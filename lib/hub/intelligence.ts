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

/** Peso de cada fundamento no índice técnico (soma = 1). */
const IPTV_WEIGHTS: Record<Fundamental, number> = {
  ataque: 0.25,
  recepcao: 0.2,
  defesa: 0.2,
  bloqueio: 0.15,
  saque: 0.2,
}

/**
 * IPTV — Índice de Performance Técnica do Voleibol (0-100).
 * Média ponderada dos percentuais de acerto dos 5 fundamentos, considerando
 * apenas os fundamentos com volume registrado.
 */
export function computeIPTV(f: PlayerFundamentals): number {
  let sum = 0
  let weight = 0
  for (const key of FUNDAMENTALS) {
    if (f[key].total > 0) {
      sum += successRate(f[key]) * IPTV_WEIGHTS[key]
      weight += IPTV_WEIGHTS[key]
    }
  }
  if (weight === 0) return 0
  return Math.round(sum / weight)
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
