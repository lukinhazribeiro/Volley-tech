/**
 * Scout Action — coleta simplificada e inteligente.
 *
 * O painel tem apenas três botões por atleta (AÇÃO, PONTO, ERRO) e o sistema
 * cuida do resto: rodízio 5x1, regra do líbero e levantamento automático.
 *
 * Contagem por atleta (auto-contida, sem detalhamento por fundamento):
 *   PONTO → TP + TG  (ponto também é participação)
 *   AÇÃO  → TP        (participação sem ponto)
 *   ERRO  → TE
 *   T  = TP + TE
 *   TGP = fórmula única do Volley Tech (lib/tgp)
 *   IPTV (bruto) = TP / (TP + TE) × 100
 */

import { computeTGP } from "@/lib/tgp"
import type { PlayerFundamentals } from "@/lib/hub/stats"

export type ActionKind = "acao" | "ponto" | "erro"

/** Função tática reconhecida no 5x1. */
export type ActionRole = "Levantadora" | "Central" | "Ponteira" | "Oposta" | "Líbero"

export const ACTION_ROLES: ActionRole[] = ["Levantadora", "Central", "Ponteira", "Oposta", "Líbero"]

export interface ActionPlayer {
  number: number
  name: string
  role: ActionRole
}

export interface ActionEvent {
  id: string
  team: "A" | "B"
  playerNumber: number
  kind: ActionKind
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
  teamAName: string
  teamBName: string
  category: string
  teamAPlayers: ActionPlayer[]
  teamBPlayers: ActionPlayer[]
  events: ActionEvent[]
  sets: ActionSetScore[]
  createdAt: string
  completedAt: string
  winner: "A" | "B"
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
  /** TGP (0-100). */
  tgp: number
  /** IPTV bruto TP/(TP+TE) (0-100). */
  iptv: number
}

/** Calcula TP/TG/TE/T/TGP/IPTV de uma atleta a partir dos eventos. */
export function computePlayerMetrics(
  events: ActionEvent[],
  team: "A" | "B",
  playerNumber: number,
): PlayerMetrics {
  let acao = 0
  let ponto = 0
  let erro = 0
  for (const e of events) {
    if (e.team !== team || e.playerNumber !== playerNumber) continue
    if (e.kind === "ponto") ponto++
    else if (e.kind === "erro") erro++
    else acao++
  }
  const tp = acao + ponto
  const tg = ponto
  const te = erro
  const t = tp + te
  const tgp = t > 0 ? computeTGP({ tp, te, tg }) : 0
  const iptv = t > 0 ? Math.round((tp / t) * 100) : 0
  return { tp, tg, te, t, tgp, iptv }
}

/**
 * Fundamentos sintéticos para o Volley Hub.
 *
 * O Hub RECALCULA o IPTV a partir de `stats` (média ponderada por posição das
 * taxas de acerto de cada fundamento). Para que o IPTV bruto TP/(TP+TE) seja
 * reproduzido EXATAMENTE em qualquer posição, colocamos a MESMA taxa em todos
 * os cinco fundamentos: certo=TP, erro=TE. Assim `successRate` de cada
 * fundamento = TP/(TP+TE) e a média ponderada resulta no mesmo valor,
 * independentemente dos pesos da posição.
 *
 * O TGP não depende disso: é gravado diretamente no capítulo (fórmula única).
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
