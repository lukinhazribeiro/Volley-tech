/**
 * Volley Hub — camada de dados (Supabase) e associação de atletas.
 *
 * Independente dos demais módulos: apenas LÊ scouts locais e grava o histórico
 * consolidado do Hub. Nunca modifica os dados de origem.
 */

import { createClient } from "@/lib/supabase/client"
import { getMatches, type StoredMatch, type StoredPlayer } from "@/lib/scout/match-storage"
import { loadHistory as loadVideoHistory, type MatchHistoryEntry } from "@/lib/video-scout/history"
import type { MatchState } from "@/lib/video-scout/match"
import type { Fundamento, Resultado } from "@/lib/video-scout/types"
import {
  extractTeamPlayerStats,
  positiveActions,
  errorActions,
  greatActions,
  type PlayerFundamentals,
} from "./stats"
import { computeTGP } from "@/lib/tgp"
import type { HubAthlete, HubHistoryEntry, HubImport, ImportCandidate, MatchResult } from "./types"

function norm(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

/**
 * Erros do Supabase (PostgrestError) são objetos simples, não instâncias de
 * Error — por isso a UI mostrava mensagem genérica. Este helper extrai a
 * mensagem real (com código/dica do Postgres) para exibir ao usuário.
 */
export function describeDbError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error
  if (error && typeof error === "object") {
    const e = error as { message?: string; details?: string; hint?: string; code?: string }
    const parts = [e.message, e.details, e.hint].filter(Boolean)
    const msg = parts.length ? parts.join(" — ") : fallback
    return new Error(e.code ? `${msg} (código ${e.code})` : msg)
  }
  return new Error(fallback)
}

// ----------------------- Leitura de scouts locais -----------------------

/**
 * Converte as partidas salvas no Scout Volleyball (localStorage) em candidatos
 * de importação, um por atleta identificada (com nome) por partida.
 */
export function buildCandidatesFromLocalMatches(matches: StoredMatch[] = getMatches()): ImportCandidate[] {
  const candidates: ImportCandidate[] = []

  for (const match of matches) {
    const season = new Date(match.createdAt).getFullYear().toString()
    const competition = `${match.teamAName} x ${match.teamBName}`

    const teams: Array<{ team: "A" | "B"; name: string; players?: StoredPlayer[] }> = [
      { team: "A", name: match.teamAName, players: match.teamAPlayers },
      { team: "B", name: match.teamBName, players: match.teamBPlayers },
    ]

    for (const { team, name, players } of teams) {
      if (!players || players.length === 0) continue
      const namesByNumber: Record<number, string> = {}
      for (const p of players) if (p.name?.trim()) namesByNumber[p.number] = p.name.trim()

      const summaries = extractTeamPlayerStats(match.actions, team, namesByNumber)
      for (const s of summaries) {
        const fullName = s.name?.trim()
        if (!fullName) continue // só associa atletas com nome
        // TGP definitivo (fórmula única, auto-contida por atleta).
        const tp = positiveActions(s.fundamentals)
        const te = errorActions(s.fundamentals)
        const tg = greatActions(s.fundamentals)
        const tgp = tp + te > 0 ? computeTGP({ tp, te, tg }) : null
        candidates.push({
          fullName,
          team: name,
          category: match.category,
          position: s.position || "",
          playerNumber: s.number,
          competition,
          season,
          matchDate: new Date(match.completedAt).toISOString().slice(0, 10),
          stats: s.fundamentals,
          tgp,
          fingerprint: `${match.id}:${team}:${s.number}`,
          raw: { matchId: match.id, team, number: s.number },
        })
      }
    }
  }

  return candidates
}

// ----------------------- Leitura do Scout View IA -----------------------

/** Só os 5 fundamentos do Hub têm equivalência direta (levantamento é ignorado). */
const VIDEO_FUNDAMENTO_MAP: Partial<Record<Fundamento, keyof PlayerFundamentals>> = {
  saque: "saque",
  recepcao: "recepcao",
  ataque: "ataque",
  bloqueio: "bloqueio",
  defesa: "defesa",
}

function emptyFund(): PlayerFundamentals {
  const c = () => ({ certo: 0, erro: 0, ponto: 0, total: 0 })
  return { ataque: c(), recepcao: c(), defesa: c(), bloqueio: c(), saque: c() }
}

function applyVideoResult(f: PlayerFundamentals, key: keyof PlayerFundamentals, resultado: Resultado) {
  const bucket = f[key]
  bucket.total++
  if (resultado === "ponto") bucket.ponto++
  else if (resultado === "erro") bucket.erro++
  else bucket.certo++ // continuidade = ação positiva mantida em jogo
}

/**
 * Converte o histórico do Scout View IA (partidas por vídeo, guardadas na nuvem)
 * em candidatos de importação — um por atleta com nome. Lê apenas; nunca altera
 * os dados do módulo de vídeo.
 */
export function buildCandidatesFromVideoMatches(entries: MatchHistoryEntry[]): ImportCandidate[] {
  const candidates: ImportCandidate[] = []

  for (const entry of entries) {
    const match: MatchState = entry.match
    if (!match?.teamA || !match?.teamB) continue

    const season = new Date(entry.savedAt).getFullYear().toString()
    const competition = `${entry.teamAName} x ${entry.teamBName}`
    const matchDate = new Date(entry.savedAt).toISOString().slice(0, 10)

    const sides = [
      { cfg: match.teamA, side: "casa" as const },
      { cfg: match.teamB, side: "adversario" as const },
    ]

    for (const { cfg, side } of sides) {
      // Fundamentos por jogador deste lado (calculados uma vez).
      const perPlayer: Array<{ player: (typeof cfg.players)[number]; fundamentals: PlayerFundamentals }> = []
      for (const player of cfg.players) {
        const fullName = player.name?.trim()
        if (!fullName) continue

        const fundamentals = emptyFund()
        let hasData = false
        for (const action of match.actions) {
          if (action.playerId !== player.id) continue
          const key = VIDEO_FUNDAMENTO_MAP[action.fundamento]
          if (!key) continue
          applyVideoResult(fundamentals, key, action.resultado)
          hasData = true
        }
        if (!hasData) continue
        perPlayer.push({ player, fundamentals })
      }

      for (const { player, fundamentals } of perPlayer) {
        // TGP definitivo (fórmula única, auto-contida por atleta).
        const tp = positiveActions(fundamentals)
        const te = errorActions(fundamentals)
        const tg = greatActions(fundamentals)
        const tgp = tp + te > 0 ? computeTGP({ tp, te, tg }) : null
        candidates.push({
          fullName: player.name!.trim(),
          team: cfg.name,
          category: "",
          position: player.role ? player.role : "",
          playerNumber: player.number,
          competition,
          season,
          matchDate,
          stats: fundamentals,
          tgp,
          fingerprint: `vs:${entry.id}:${side}:${player.number}`,
          raw: { source: "scout_video", historyId: entry.id, side, number: player.number },
        })
      }
    }
  }

  return candidates
}

/** Lê o histórico do Scout View IA (nuvem) e retorna candidatos de importação. */
export async function loadVideoScoutCandidates(): Promise<ImportCandidate[]> {
  const history = await loadVideoHistory()
  return buildCandidatesFromVideoMatches(history)
}

// ----------------------- Seleção de jogos para importar -----------------------

export interface ImportableMatch {
  id: string
  title: string
  subtitle: string
  /** true quando há nomes de atletas para associar. */
  hasRoster: boolean
}

/** Lista as partidas do Scout Volleyball (localStorage) disponíveis para importar. */
export function listLocalImportMatches(): { matches: StoredMatch[]; items: ImportableMatch[] } {
  const matches = getMatches()
  const items = matches.map((m) => {
    const rosterCount = (m.teamAPlayers?.length ?? 0) + (m.teamBPlayers?.length ?? 0)
    return {
      id: m.id,
      title: `${m.teamAName} x ${m.teamBName}`,
      subtitle: `${m.category || "Sem categoria"} · ${new Date(m.completedAt).toLocaleDateString("pt-BR")}`,
      hasRoster: rosterCount > 0,
    }
  })
  return { matches, items }
}

/** Lista as partidas do Scout View IA (nuvem) disponíveis para importar. */
export async function listVideoImportMatches(): Promise<{
  entries: MatchHistoryEntry[]
  items: ImportableMatch[]
}> {
  const entries = await loadVideoHistory()
  const items = entries.map((e) => {
    const named =
      (e.match?.teamA?.players?.filter((p) => p.name?.trim()).length ?? 0) +
      (e.match?.teamB?.players?.filter((p) => p.name?.trim()).length ?? 0)
    return {
      id: e.id,
      title: `${e.teamAName} x ${e.teamBName}`,
      subtitle: `${new Date(e.savedAt).toLocaleDateString("pt-BR")} · ${e.totalAcoes} ações`,
      hasRoster: named > 0,
    }
  })
  return { entries, items }
}

// ----------------------- Associação de atletas -----------------------

/**
 * Tenta associar cada candidato a um atleta existente usando nome+equipe+
 * categoria e as associações já aprendidas (aliases).
 *   - correspondência exata (ou alias já gravado) => vínculo automático
 *   - nome igual mas equipe/categoria diferente     => ambíguo (confirmar)
 *   - nada encontrado                               => novo atleta
 */
export async function matchCandidates(candidates: ImportCandidate[]): Promise<MatchResult[]> {
  const supabase = createClient()
  const [{ data: athletes }, { data: aliases }] = await Promise.all([
    supabase.from("hub_athletes").select("*"),
    supabase.from("hub_athlete_aliases").select("*"),
  ])

  const allAthletes = (athletes ?? []) as HubAthlete[]
  const allAliases = (aliases ?? []) as Array<{
    athlete_id: string
    full_name: string
    team: string | null
    category: string | null
  }>

  return candidates.map((candidate) => {
    // 1) alias aprendido por nome (independente de equipe/categoria) — o mesmo
    //    nome sempre aponta para a mesma atleta, somando os dados.
    const alias = allAliases.find((a) => norm(a.full_name) === norm(candidate.fullName))
    if (alias) {
      return { candidate, status: "exact" as const, athleteId: alias.athlete_id, suggestions: [] }
    }

    // 2) atletas existentes com o mesmo nome (normalizado, sem acento/caixa).
    const sameName = allAthletes.filter((a) => norm(a.full_name) === norm(candidate.fullName))
    if (sameName.length === 1) {
      // Exatamente uma atleta com esse nome => vincula e soma os dados.
      return { candidate, status: "exact" as const, athleteId: sameName[0].id, suggestions: [] }
    }
    if (sameName.length > 1) {
      // Mais de uma atleta com o mesmo nome => deixa o usuário escolher.
      return { candidate, status: "ambiguous" as const, suggestions: sameName }
    }

    // 3) nenhuma atleta com esse nome => nova.
    return { candidate, status: "new" as const, suggestions: [] }
  })
}

/**
 * Agrupa candidatos (um por jogador por jogo) em um por atleta, usando o nome
 * normalizado. Assim, importar vários jogos do mesmo jogador cria UMA atleta
 * com vários capítulos — nunca duplicatas.
 */
export function groupCandidatesByAthlete(
  candidates: ImportCandidate[],
): Array<{ representative: ImportCandidate; entries: ImportCandidate[] }> {
  const groups = new Map<string, { representative: ImportCandidate; entries: ImportCandidate[] }>()
  for (const c of candidates) {
    const key = norm(c.fullName)
    if (!key) continue
    const existing = groups.get(key)
    if (existing) {
      existing.entries.push(c)
      // Completa dados faltantes no representante (ex.: vídeo sem categoria).
      const r = existing.representative
      if (!r.team && c.team) r.team = c.team
      if (!r.category && c.category) r.category = c.category
      if (!r.position && c.position) r.position = c.position
    } else {
      groups.set(key, { representative: { ...c }, entries: [c] })
    }
  }
  return Array.from(groups.values())
}

// ----------------------- Gravação -----------------------

/** Cria um atleta no Hub e retorna o id. */
export async function createAthlete(input: {
  fullName: string
  team: string
  category: string
  position: string
}): Promise<string> {
  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id
  if (!userId) throw new Error("Sessão não encontrada. Faça login para usar o Volley Tech.")

  const { data, error } = await supabase
    .from("hub_athletes")
    .insert({
      owner_id: userId,
      full_name: input.fullName,
      team: input.team || null,
      category: input.category || null,
      position: input.position || null,
    })
    .select("id")
    .single()
  if (error) throw describeDbError(error, "Falha ao criar a atleta.")
  return data!.id as string
}

/**
 * Exclui uma atleta do Hub, junto com seus capítulos de histórico e aliases.
 * Não afeta os dados de origem nos módulos de Scout.
 */
export async function deleteAthlete(athleteId: string): Promise<void> {
  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id
  if (!userId) throw new Error("Sessão não encontrada. Faça login para usar o Volley Tech.")

  console.log("[v0] deleteAthlete:", athleteId)

  // Remove primeiro os registros dependentes (garantia extra além do cascade).
  const del1 = await supabase.from("hub_history_entries").delete().eq("owner_id", userId).eq("athlete_id", athleteId)
  if (del1.error) throw describeDbError(del1.error, "Falha ao remover os capítulos da atleta.")

  const del2 = await supabase.from("hub_athlete_aliases").delete().eq("owner_id", userId).eq("athlete_id", athleteId)
  if (del2.error) throw describeDbError(del2.error, "Falha ao remover as associações da atleta.")

  const { error } = await supabase.from("hub_athletes").delete().eq("id", athleteId).eq("owner_id", userId)
  if (error) {
    console.log("[v0] deleteAthlete ERRO:", JSON.stringify(error))
    throw describeDbError(error, "Falha ao excluir a atleta.")
  }
}

/** Grava a associação aprendida para nunca repetir o processo. */
export async function saveAlias(input: {
  athleteId: string
  fullName: string
  team: string
  category: string
}): Promise<void> {
  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id
  if (!userId) return

  await supabase.from("hub_athlete_aliases").upsert(
    {
      owner_id: userId,
      athlete_id: input.athleteId,
      full_name: input.fullName,
      team: input.team || null,
      category: input.category || null,
    },
    { onConflict: "owner_id,full_name,team,category" },
  )
}

/**
 * Insere capítulos de histórico. NUNCA sobrescreve: reimportações do mesmo
 * scout na mesma atleta são ignoradas via fingerprint (índice único).
 */
export async function insertHistoryEntries(
  entries: Array<{ athleteId: string; candidate: ImportCandidate; source?: string }>,
): Promise<number> {
  if (entries.length === 0) return 0
  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id
  if (!userId) throw new Error("Sessão não encontrada. Faça login para usar o Volley Tech.")

  // Deduplicação feita na aplicação (não dependemos de índice único parcial, que
  // o PostgREST não consegue inferir num upsert): buscamos os fingerprints já
  // existentes das atletas envolvidas e ignoramos o que já foi importado.
  const athleteIds = Array.from(new Set(entries.map((e) => e.athleteId)))
  const { data: existing } = await supabase
    .from("hub_history_entries")
    .select("athlete_id, fingerprint")
    .eq("owner_id", userId)
    .in("athlete_id", athleteIds)

  const seen = new Set(
    (existing ?? [])
      .filter((r) => r.fingerprint)
      .map((r) => `${r.athlete_id}:${r.fingerprint}`),
  )

  const rows = entries
    .filter(({ athleteId, candidate }) => {
      if (!candidate.fingerprint) return true // sem fingerprint => sempre insere
      const key = `${athleteId}:${candidate.fingerprint}`
      if (seen.has(key)) return false // já existe no banco ou já no lote atual
      seen.add(key)
      return true
    })
    .map(({ athleteId, candidate, source }) => ({
      owner_id: userId,
      athlete_id: athleteId,
      source: source ?? "scout_local",
      team: candidate.team || null,
      category: candidate.category || null,
      competition: candidate.competition || null,
      season: candidate.season || null,
      match_date: candidate.matchDate,
      player_number: candidate.playerNumber,
      position: candidate.position || null,
      stats: candidate.stats,
      tgp: candidate.tgp,
      raw: candidate.raw,
      fingerprint: candidate.fingerprint,
    }))

  if (rows.length === 0) return 0

  console.log("[v0] insertHistoryEntries: inserindo", rows.length, "linha(s)", rows[0])
  const { data, error } = await supabase.from("hub_history_entries").insert(rows).select("id")
  if (error) {
    console.log("[v0] insertHistoryEntries ERRO:", JSON.stringify(error))
    throw describeDbError(error, "Falha ao salvar os capítulos no histórico.")
  }
  return data?.length ?? 0
}

/** Registra uma importação no log (Dashboard). */
export async function logImport(kind: string, label: string, count: number): Promise<void> {
  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id
  if (!userId) return
  // Log do Dashboard: nunca deve derrubar uma importação bem-sucedida.
  const { error } = await supabase.from("hub_imports").insert({
    owner_id: userId,
    kind,
    label,
    entries_count: count,
  })
  if (error) console.log("[v0] logImport falhou (ignorado):", JSON.stringify(error))
}

// ----------------------- Consultas -----------------------

export async function listAthletes(): Promise<HubAthlete[]> {
  const supabase = createClient()
  const { data } = await supabase.from("hub_athletes").select("*").order("full_name")
  return (data ?? []) as HubAthlete[]
}

export async function getAthlete(id: string): Promise<HubAthlete | null> {
  const supabase = createClient()
  const { data } = await supabase.from("hub_athletes").select("*").eq("id", id).maybeSingle()
  return (data as HubAthlete) ?? null
}

/**
 * Vincula (fixa) uma atleta do Hub a uma atleta da Gestão pelo ID desta última.
 * A partir daí o vínculo é permanente até ser desfeito — novos scouts da mesma
 * atleta do Hub continuam ligados automaticamente.
 */
export async function linkAthleteToGestao(athleteId: string, gestaoAtletaId: number): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("hub_athletes")
    .update({ gestao_atleta_id: gestaoAtletaId })
    .eq("id", athleteId)
  if (error) throw describeDbError(error, "Não foi possível vincular a atleta à Gestão.")
}

/** Desfaz o vínculo Hub↔Gestão de uma atleta (reversível). */
export async function unlinkAthleteFromGestao(athleteId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("hub_athletes")
    .update({ gestao_atleta_id: null })
    .eq("id", athleteId)
  if (error) throw describeDbError(error, "Não foi possível desfazer o vínculo.")
}

export async function listEntriesForAthlete(athleteId: string): Promise<HubHistoryEntry[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("hub_history_entries")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("season", { ascending: true })
    .order("match_date", { ascending: true })
  return (data ?? []) as HubHistoryEntry[]
}

export async function listAllEntries(): Promise<HubHistoryEntry[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("hub_history_entries")
    .select("*")
    .order("created_at", { ascending: false })
  return (data ?? []) as HubHistoryEntry[]
}

export async function listEntriesForTeam(team: string): Promise<HubHistoryEntry[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("hub_history_entries")
    .select("*")
    .eq("team", team)
    .order("season", { ascending: true })
    .order("match_date", { ascending: true })
  return (data ?? []) as HubHistoryEntry[]
}

export async function listImports(limit = 10): Promise<HubImport[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("hub_imports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as HubImport[]
}

/** Lista as equipes distintas com contagem de atletas/capítulos. */
export async function listTeams(): Promise<Array<{ team: string; athletes: number; entries: number }>> {
  const entries = await listAllEntries()
  const map = new Map<string, { athletes: Set<string>; entries: number }>()
  for (const e of entries) {
    const key = e.team || "Sem equipe"
    if (!map.has(key)) map.set(key, { athletes: new Set(), entries: 0 })
    const v = map.get(key)!
    if (e.athlete_id) v.athletes.add(e.athlete_id)
    v.entries++
  }
  return Array.from(map.entries()).map(([team, v]) => ({
    team,
    athletes: v.athletes.size,
    entries: v.entries,
  }))
}

export type { PlayerFundamentals }
