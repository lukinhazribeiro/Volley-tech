/**
 * Motor ao vivo do Scout Action.
 *
 * Reaproveita o motor do Scout View (lib/video-scout/match) para rodízio 5x1,
 * regra do líbero e levantador em quadra, mas com um modelo de evento simples
 * (AÇÃO / PONTO / ERRO) e coleta das DUAS equipes (A e B).
 *
 * Regras de pontuação:
 *   - PONTO da equipe S  → S marca ponto.
 *   - ERRO da equipe S   → a OUTRA equipe marca ponto.
 *   - AÇÃO               → jogada positiva que não encerra o rally (sem ponto).
 * Rodízio por sideout: quem marca sem estar sacando recupera o saque e gira.
 * Levantamento automático: credita +1 participação (TP) à levantadora em quadra
 * SOMENTE quando a mesma equipe faz duas ações seguidas (recepção/defesa →
 * ataque), pois é entre elas que a levantadora toca a bola — nunca após cada
 * ação isolada.
 */

import {
  effectiveFormation,
  findPlayer,
  onCourtPlayerId,
  rotateTeamClockwise,
  type TeamConfig,
} from "@/lib/video-scout/match"
import { POSICAO_ORDER, type Player, type Posicao } from "@/lib/video-scout/types"
import type { ActionEvent, ActionKind, ActionSetScore, ActionSide, StoredTeam } from "./types"

export interface LiveState {
  teamA: TeamConfig
  teamB: TeamConfig
  scoreA: number
  scoreB: number
  /** Índice do set atual (0-based). */
  setIndex: number
  /** Equipe que está sacando (define a rotação por sideout). */
  servingTeam: ActionSide | null
  events: ActionEvent[]
  /** Placar dos sets já encerrados. */
  setScores: ActionSetScore[]
}

let seq = 0
function uid(prefix: string): string {
  seq += 1
  return `${prefix}_${Date.now().toString(36)}_${seq}`
}

function other(side: ActionSide): ActionSide {
  return side === "A" ? "B" : "A"
}

function teamOf(state: LiveState, side: ActionSide): TeamConfig {
  return side === "A" ? state.teamA : state.teamB
}

/** Cria o estado inicial de uma partida com as duas equipes e o primeiro sacador. */
export function createLiveMatch(
  teamA: TeamConfig,
  teamB: TeamConfig,
  firstServer: ActionSide,
): LiveState {
  return {
    teamA,
    teamB,
    scoreA: 0,
    scoreB: 0,
    setIndex: 0,
    servingTeam: firstServer,
    events: [],
    setScores: [],
  }
}

export interface CourtCell {
  posicao: Posicao
  player: Player | null
  isLibero: boolean
  isSetter: boolean
  isServing: boolean
}

/** Formação efetiva em quadra de uma equipe (com líbero e levantadora marcados). */
export function courtCells(state: LiveState, side: ActionSide): CourtCell[] {
  const team = teamOf(state, side)
  const isServing = state.servingTeam === null ? side === "A" : state.servingTeam === side
  const eff = effectiveFormation(team, isServing)
  return POSICAO_ORDER.map((pos) => {
    const cell = eff[pos]
    return {
      posicao: pos,
      player: findPlayer(team, cell.playerId),
      isLibero: cell.isLibero,
      isSetter: pos === team.setterPosicao && !cell.isLibero,
      isServing,
    }
  })
}

/** Registra uma ação (AÇÃO/PONTO/ERRO) na posição informada da equipe. */
export function recordLive(
  state: LiveState,
  side: ActionSide,
  posicao: Posicao,
  kind: ActionKind,
): LiveState {
  const team = teamOf(state, side)
  const isServing = state.servingTeam === null ? true : state.servingTeam === side
  const playerId = onCourtPlayerId(team, posicao, isServing)
  if (!playerId) return state
  const player = findPlayer(team, playerId)

  const events: ActionEvent[] = [
    ...state.events,
    {
      id: uid("ev"),
      side,
      playerId,
      playerNumber: player?.number ?? 0,
      kind,
      setIndex: state.setIndex,
      createdAt: Date.now(),
    },
  ]

  // Levantamento automático: o levantamento só ocorre quando a MESMA equipe
  // faz duas ações seguidas (ex.: recepção/defesa → ataque) — é entre essas
  // duas ações que a levantadora toca a bola. Portanto só credita +1 à
  // levantadora quando a ação real anterior foi da mesma equipe, no mesmo set,
  // e não encerrou o rally (erro). Também não conta se a própria ação é dela.
  if (kind !== "erro") {
    // Última ação REAL (ignora levantamentos automáticos já creditados).
    const prev = [...state.events].reverse().find((e) => !e.auto)
    const consecutiveSameTeam =
      prev != null && prev.side === side && prev.setIndex === state.setIndex && prev.kind !== "erro"
    if (consecutiveSameTeam) {
      const setterId = onCourtPlayerId(team, team.setterPosicao, isServing)
      if (setterId && setterId !== playerId) {
        const setter = findPlayer(team, setterId)
        events.push({
          id: uid("ev"),
          side,
          playerId: setterId,
          playerNumber: setter?.number ?? 0,
          kind: "acao",
          setIndex: state.setIndex,
          auto: true,
          createdAt: Date.now(),
        })
      }
    }
  }

  // Quem marca o ponto? PONTO = a própria equipe; ERRO = a adversária; AÇÃO = ninguém.
  const scorer: ActionSide | null = kind === "ponto" ? side : kind === "erro" ? other(side) : null

  let { teamA, teamB, scoreA, scoreB, servingTeam } = state
  if (scorer) {
    if (scorer === "A") scoreA += 1
    else scoreB += 1
    // Sideout: quem pontua sem estar sacando gira e recupera o saque.
    if (servingTeam !== null && servingTeam !== scorer) {
      if (scorer === "A") teamA = rotateTeamClockwise(teamA)
      else teamB = rotateTeamClockwise(teamB)
    }
    servingTeam = scorer
  }

  return { ...state, teamA, teamB, scoreA, scoreB, servingTeam, events }
}

/** Encerra o set atual e prepara o próximo (mantém elenco/formação). */
export function closeSet(state: LiveState, nextServer: ActionSide): LiveState {
  return {
    ...state,
    setScores: [...state.setScores, { scoreA: state.scoreA, scoreB: state.scoreB }],
    setIndex: state.setIndex + 1,
    scoreA: 0,
    scoreB: 0,
    servingTeam: nextServer,
  }
}

/** Sets vencidos por cada equipe (considera set em andamento se `includeCurrent`). */
export function setsWon(state: LiveState): { a: number; b: number } {
  let a = 0
  let b = 0
  for (const s of state.setScores) {
    if (s.scoreA > s.scoreB) a++
    else if (s.scoreB > s.scoreA) b++
  }
  return { a, b }
}

/**
 * Substitui um atleta em quadra por um reserva do elenco.
 *
 * Troca `outId` (que está numa posição da formação) por `inId` (reserva). O
 * reserva assume a mesma posição de quadra e a função do atleta que saiu, para
 * que rodízio, líbero e auto-levantamento continuem coerentes. Não afeta os
 * eventos já registrados (estatísticas de quem saiu permanecem).
 */
export function substitutePlayer(
  state: LiveState,
  side: ActionSide,
  outId: string,
  inId: string,
): LiveState {
  const team = teamOf(state, side)
  if (outId === inId) return state

  // Posição de quadra ocupada por quem sai (se estiver na formação).
  let pos: Posicao | null = null
  for (const p of POSICAO_ORDER) {
    if (team.formation[p] === outId) {
      pos = p
      break
    }
  }

  const outPlayer = findPlayer(team, outId)
  const players = team.players.map((p) =>
    // O reserva herda a função de quem saiu (mantém o esquema 5x1).
    p.id === inId ? { ...p, role: p.role ?? outPlayer?.role ?? null } : p,
  )

  const formation = { ...team.formation }
  if (pos) formation[pos] = inId

  // Se quem saiu era o líbero, o reserva vira o novo líbero.
  const liberoId = team.liberoId === outId ? inId : team.liberoId
  const liberoReplaces = team.liberoReplaces.map((r) => (r === outId ? inId : r))

  const nextTeam: TeamConfig = { ...team, players, formation, liberoId, liberoReplaces }
  return side === "A" ? { ...state, teamA: nextTeam } : { ...state, teamB: nextTeam }
}

/** Converte o TeamConfig ao vivo para o formato guardado (sem o campo side). */
export function toStoredTeam(team: TeamConfig): StoredTeam {
  const { side: _side, ...rest } = team
  return JSON.parse(JSON.stringify(rest)) as StoredTeam
}
