/**
 * Volley Hub — leitura dos scouts do Scout View IA (análise por vídeo).
 *
 * O Hub é INDEPENDENTE: apenas LÊ o histórico salvo pelo Scout View IA
 * (tabela vs_match_history no Supabase) e o converte em candidatos de
 * importação, sem alterar nada no módulo de origem.
 */

import { createClient } from "@/lib/supabase/client"
import type { MatchState } from "@/lib/video-scout/match"
import { computeSummary } from "@/lib/video-scout/stats"
import type { Fundamento, Player, ScoutAction, TeamSide } from "@/lib/video-scout/types"
import type { FundamentalCount, PlayerFundamentals } from "./stats"
import type { ImportCandidate } from "./types"

interface HistoryRow {
  id: string
  team_a_name: string
  team_b_name: string
  score_a: number
  score_b: number
  match: MatchState
  saved_at: string
}

function emptyCount(): FundamentalCount {
  return { certo: 0, erro: 0, ponto: 0, total: 0 }
}

/**
 * Converte um jogador do Scout View IA (que tem os 6 fundamentos, incluindo
 * levantamento) para o formato de 5 fundamentos do Hub. Levantamento é
 * agregado como parte do desempenho geral e não vira um fundamento próprio.
 */
function toHubFundamentals(
  porFundamento: Record<Fundamento, { total: number; pontos: number; erros: number }>,
): PlayerFundamentals {
  const map = (f: Fundamento): FundamentalCount => {
    const src = porFundamento[f]
    const erro = src.erros
    const ponto = src.pontos
    const certo = Math.max(0, src.total - ponto - erro)
    return { certo, erro, ponto, total: src.total }
  }
  return {
    ataque: map("ataque"),
    recepcao: map("recepcao"),
    defesa: map("defesa"),
    bloqueio: map("bloqueio"),
    saque: map("saque"),
  }
}

const ROLE_TO_POSITION: Record<string, string> = {
  levantador: "Levantador",
  central: "Central",
  oposto: "Oposto",
  ponteiro: "Ponteiro",
  libero: "Líbero",
}

/** Lê o histórico do Scout View IA da conta logada. */
async function loadScoutViewHistory(): Promise<HistoryRow[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("vs_match_history")
    .select("id, team_a_name, team_b_name, score_a, score_b, match, saved_at")
    .order("saved_at", { ascending: false })
    .limit(100)

  if (error || !data) return []
  return data as HistoryRow[]
}

/**
 * Constrói candidatos de importação a partir dos scouts do Scout View IA.
 * Uma entrada por atleta identificada (com nome) por partida analisada.
 */
export async function buildCandidatesFromScoutView(): Promise<ImportCandidate[]> {
  const rows = await loadScoutViewHistory()
  const candidates: ImportCandidate[] = []

  for (const row of rows) {
    const match = row.match
    if (!match?.actions?.length) continue

    const season = new Date(row.saved_at).getFullYear().toString()
    const matchDate = new Date(row.saved_at).toISOString().slice(0, 10)
    const competition = `${row.team_a_name} x ${row.team_b_name}`

    const sides: Array<{ side: TeamSide; teamName: string; players: Player[] }> = [
      { side: "casa", teamName: match.teamA?.name || row.team_a_name, players: match.teamA?.players ?? [] },
      { side: "adversario", teamName: match.teamB?.name || row.team_b_name, players: match.teamB?.players ?? [] },
    ]

    for (const { side, teamName, players } of sides) {
      if (!players.length) continue
      // Estatísticas só das ações deste lado, com os jogadores deste lado.
      const sideActions: ScoutAction[] = match.actions.filter((a) => a.team === side)
      const summary = computeSummary(sideActions, players)

      for (const ps of summary.jogadores) {
        const fullName = ps.player.name?.trim()
        if (!fullName) continue // só associa atletas com nome
        candidates.push({
          fullName,
          team: teamName,
          category: "", // Scout View IA não guarda categoria
          position: ps.player.role ? ROLE_TO_POSITION[ps.player.role] ?? "" : "",
          playerNumber: ps.player.number,
          competition,
          season,
          matchDate,
          stats: toHubFundamentals(ps.porFundamento),
          fingerprint: `sv:${row.id}:${side}:${ps.player.number}`,
          raw: { source: "scout_view", historyId: row.id, side, number: ps.player.number },
        })
      }
    }
  }

  return candidates
}

export { emptyCount }
