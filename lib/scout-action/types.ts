/**
 * Scout Action — coleta simplificada e inteligente (duas equipes).
 *
 * O painel tem apenas três botões (AÇÃO, PONTO, ERRO) e um seletor de equipe
 * A/B. O sistema cuida do resto: rodízio 5x1, regra do líbero e levantamento
 * automático — reutilizando o MESMO motor do Scout View (lib/video-scout).
 *
 * Contagem por atleta (auto-contida, sem detalhamento por fundamento):
 *   PONTO → TP + TG  (ponto também é participação)
 *   AÇÃO  → TP        (participação sem ponto)
 *   ERRO  → TE
 *   T  = TP + TE
 *   TGP = fórmula única do Volley Tech (lib/tgp) — a MESMA da planilha e da Hub.
 *   IPTV (bruto) = TP / (TP + TE) × 100
 */

import { computeTGP } from "@/lib/tgp"
import type { PlayerFundamentals } from "@/lib/hub/stats"
import { ROLE_LABEL, type PlayerRole } from "@/lib/video-scout/types"
import type { TeamConfig } from "@/lib/video-scout/match"

/** Lado no Scout Action (A = casa, B = adversário). */
export type ActionSide = "A" | "B"

export type ActionKind = "acao" | "ponto" | "erro"

/** Equipe guardada no jogo (sem o campo side, que é posicional A/B). */
export type StoredTeam = Omit<TeamConfig, "side">

export interface ActionEvent {
  id: string
  side: ActionSide
  /** Id do atleta no elenco (roster id do TeamConfig). */
  playerId: string
  /** Número da camisa no momento (para exibição/relatório). */
  playerNumber: number
  kind: ActionKind
  /** Índice do set (0-based). */
  setIndex: number
  /** true quando o levantamento foi creditado automaticamente à levantadora. */
  auto?: boolean
  createdAt: number
}

export interface ActionSetScore {
  scoreA: number
  scoreB: number
}

export interface ScoutActionMatch {
  id: string
  category: string
  competition: string
  teamA: StoredTeam
  teamB: StoredTeam
  events: ActionEvent[]
  /** Placar de cada set encerrado. */
  setScores: ActionSetScore[]
  /** Sets vencidos por A / B. */
  setsA: number
  setsB: number
  createdAt: string
  completedAt: string | null
  winner: ActionSide | null
}

/** Alias curto usado pela UI/relatórios. */
export type ActionMatch = ScoutActionMatch

/** Rótulo de posição em português a partir da função do 5x1. */
export function roleLabelPt(role: PlayerRole): string {
  return role ? ROLE_LABEL[role] : ""
}

export interface PlayerMetrics {
  /** Total de ações positivas (participação): ações + pontos. */
  tp: number
  /** Total Great: pontos feitos pela atleta. */
  tg: number
  /** Total de erros. */
  te: number
  /** Total de ações = TP + TE. */
  t: number
  /** TGP (0-100) — computeTGP, igual à planilha e à Hub. */
  tgp: number
  /** IPTV bruto TP/(TP+TE) (0-100). */
  iptv: number
}

export interface PlayerMatchStat extends PlayerMetrics {
  id: string
  number: number
  name: string
  role: PlayerRole
  /** Rótulo de posição (para a Hub/planilha). */
  position: string
}

/** Calcula TP/TG/TE/T/TGP/IPTV de uma atleta a partir dos eventos. */
export function computePlayerMetrics(
  events: ActionEvent[],
  side: ActionSide,
  playerId: string,
): PlayerMetrics {
  let acao = 0
  let ponto = 0
  let erro = 0
  for (const e of events) {
    if (e.side !== side || e.playerId !== playerId) continue
    if (e.kind === "ponto") ponto++
    else if (e.kind === "erro") erro++
    else acao++
  }
  // Regra do sistema: TG (ponto) entra em TP; só TE fica fora de TP.
  const tp = acao + ponto
  const tg = ponto
  const te = erro
  const t = tp + te
  const tgp = t > 0 ? computeTGP({ tp, te, tg }) : 0
  const iptv = t > 0 ? Math.round((tp / t) * 100) : 0
  return { tp, tg, te, t, tgp, iptv }
}

function teamFor(match: ActionMatch, side: ActionSide): StoredTeam {
  return side === "A" ? match.teamA : match.teamB
}

/** Estatísticas por atleta de UMA equipe (A ou B). */
export function computeMatchStats(match: ActionMatch, side: ActionSide): PlayerMatchStat[] {
  const team = teamFor(match, side)
  return team.players.map((p) => ({
    id: p.id,
    number: p.number,
    name: p.name,
    role: p.role ?? null,
    position: roleLabelPt(p.role ?? null),
    ...computePlayerMetrics(match.events, side, p.id),
  }))
}

/** Totais consolidados de uma equipe (soma de TP/TG/TE + TGP/IPTV). */
export function matchTotals(match: ActionMatch, side: ActionSide): PlayerMetrics {
  let tp = 0
  let tg = 0
  let te = 0
  for (const s of computeMatchStats(match, side)) {
    tp += s.tp
    tg += s.tg
    te += s.te
  }
  const t = tp + te
  return {
    tp,
    tg,
    te,
    t,
    tgp: t > 0 ? computeTGP({ tp, te, tg }) : 0,
    iptv: t > 0 ? Math.round((tp / t) * 100) : 0,
  }
}

/**
 * Fundamentos sintéticos para o Volley Hub.
 *
 * O Hub RECALCULA o IPTV a partir de `stats` (média ponderada por posição das
 * taxas de acerto de cada fundamento). Para que o IPTV bruto TP/(TP+TE) seja
 * reproduzido EXATAMENTE em qualquer posição, colocamos a MESMA taxa em todos
 * os cinco fundamentos: certo=TP, erro=TE. Assim `successRate` de cada
 * fundamento = TP/(TP+TE) e a média ponderada resulta no mesmo valor.
 *
 * O TGP não depende disso: é gravado diretamente no capítulo (computeTGP), o
 * mesmo número que a planilha exibe.
 */
export function toSyntheticFundamentals(tp: number, te: number): PlayerFundamentals {
  const bucket = () => ({ certo: tp, erro: te, ponto: 0, total: tp + te })
  return {
    ataque: bucket(),
    recepcao: bucket(),
    defesa: bucket(),
    bloqueio: bucket(),
    saque: bucket(),
  }
}
