/**
 * Rodízio 5x1 do Scout Action — automático com ajuste manual.
 *
 * Convenção de posições (índice 0..5 = posições 1..6 da quadra):
 *   1 (fundo dir./saque) · 2 (frente dir.) · 3 (frente meio) ·
 *   4 (frente esq.)      · 5 (fundo esq.)  · 6 (fundo meio)
 *
 * Regras aplicadas:
 *   - Rodízio no side-out: quem vence o rally SEM ter sacado gira uma posição
 *     e passa a sacar (rotação horária: quem está na posição 2 vai à 1).
 *   - Regra do líbero: joga só no fundo, no lugar do seu central; nunca saca
 *     (na posição 1 quem fica é o central, para sacar).
 *   - 5x1: uma única levantadora, sempre em quadra (base do levantamento
 *     automático).
 */

import type { ActionPlayer } from "./types"

export interface TeamLineup {
  /** Números nas 6 posições da quadra (índice 0 = posição 1). 0 = vazio. */
  positions: number[]
  setterNumber: number | null
  liberoNumber: number | null
  /** Central que o líbero substitui no fundo. */
  liberoReplaces: number | null
}

export interface CourtSlot {
  position: number
  number: number
  isLibero: boolean
  isSetter: boolean
  isServer: boolean
  row: "frente" | "fundo"
}

export function opponent(team: "A" | "B"): "A" | "B" {
  return team === "A" ? "B" : "A"
}

/** Gira a escalação uma posição no sentido horário (pos.2 → pos.1). */
export function rotate(positions: number[]): number[] {
  return positions.map((_, i) => positions[(i + 1) % 6])
}

/** Monta uma escalação inicial coerente a partir do elenco. */
export function buildInitialLineup(players: ActionPlayer[]): TeamLineup {
  const setter = players.find((p) => p.role === "Levantadora") ?? null
  const libero = players.find((p) => p.role === "Líbero") ?? null
  const central = players.find((p) => p.role === "Central") ?? null
  const starters = players.filter((p) => p.role !== "Líbero").slice(0, 6)
  const positions = starters.map((p) => p.number)
  while (positions.length < 6) positions.push(0)
  return {
    positions,
    setterNumber: setter?.number ?? null,
    liberoNumber: libero?.number ?? null,
    liberoReplaces: central?.number ?? null,
  }
}

/**
 * Resolve a escalação exibida em quadra aplicando a regra do líbero:
 * o líbero aparece no lugar do central quando este está no fundo (posições 5 e
 * 6); na posição 1 (saque) permanece o central.
 */
export function courtSlots(lineup: TeamLineup): CourtSlot[] {
  return lineup.positions.map((num, i) => {
    const position = i + 1
    const isFront = position >= 2 && position <= 4
    let displayNumber = num
    let isLibero = false
    if (
      lineup.liberoNumber != null &&
      lineup.liberoReplaces === num &&
      !isFront &&
      position !== 1 // na posição 1 quem fica é o central (para sacar)
    ) {
      displayNumber = lineup.liberoNumber
      isLibero = true
    }
    return {
      position,
      number: displayNumber,
      isLibero,
      isSetter: displayNumber === lineup.setterNumber,
      isServer: position === 1,
      row: isFront ? "frente" : "fundo",
    }
  })
}

/** Levantadora em quadra (no 5x1 é sempre a mesma). Base do levantamento automático. */
export function onCourtSetter(lineup: TeamLineup): number | null {
  return lineup.setterNumber
}

/** Troca o jogador de uma posição (ajuste manual). */
export function setPlayerAtPosition(lineup: TeamLineup, position: number, number: number): TeamLineup {
  const positions = [...lineup.positions]
  positions[position - 1] = number
  return { ...lineup, positions }
}
