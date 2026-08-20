/**
 * Volley Hub — camada de dados do VIB.
 *
 * Isolamento entre contas (regra crítica):
 * - ESCRITA: cada conta só grava/atualiza as PRÓPRIAS linhas em vib_samples e
 *   vib_history (RLS por owner_id).
 * - LEITURA COMPARATIVA: nunca lê linhas de outras contas diretamente. A única
 *   porta para a base cross-conta é a função agregada `vib_compare`, que roda
 *   como SECURITY DEFINER e devolve SOMENTE agregados (médias e cortes das 4
 *   faixas), jamais ids, nomes ou clubes.
 */

import { createClient } from "@/lib/supabase/client"
import { describeDbError } from "./data"
import {
  birthYearOf,
  positionToGroup,
  type PositionGroup,
  type VibClassification,
  type VibCompareResult,
} from "./vib"

async function currentUserId(): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase.auth.getUser()
  const id = data.user?.id
  if (!id) throw new Error("Sessão não encontrada. Faça login para usar o Volley Tech.")
  return id
}

/** Campos de identidade editáveis da atleta (perfil próprio, não da equipe). */
export interface AthleteIdentityInput {
  fullName?: string
  birthDate?: string | null
  sex?: string | null
  club?: string | null
  category?: string | null
  position?: string | null
  /** "sync" (identidade automática da Gestão) ou "manual". */
  identitySource?: "sync" | "manual"
}

/**
 * Atualiza a identidade da atleta. O histórico individual permanece vinculado
 * ao perfil mesmo que o clube/equipe mude (não recria a atleta).
 */
export async function updateAthleteIdentity(athleteId: string, input: AthleteIdentityInput): Promise<void> {
  const supabase = createClient()
  const userId = await currentUserId()

  const patch: Record<string, unknown> = {}
  if (input.fullName !== undefined) patch.full_name = input.fullName
  if (input.birthDate !== undefined) patch.birth_date = input.birthDate || null
  if (input.sex !== undefined) patch.sex = input.sex || null
  if (input.club !== undefined) patch.club = input.club || null
  if (input.category !== undefined) patch.category = input.category || null
  if (input.position !== undefined) patch.position = input.position || null
  if (input.identitySource !== undefined) patch.identity_source = input.identitySource
  if (Object.keys(patch).length === 0) return

  const { error } = await supabase
    .from("hub_athletes")
    .update(patch)
    .eq("id", athleteId)
    .eq("owner_id", userId)
  if (error) throw describeDbError(error, "Falha ao atualizar a identidade da atleta.")
}

/**
 * Sincroniza a amostra anônima da atleta na base do VIB (participação
 * automática). Grava apenas posição, ano de nascimento e IGD — nenhum dado
 * identificável. Sem IGD ou sem data de nascimento, remove a amostra.
 */
export async function syncVibSample(input: {
  athleteId: string
  position: string | null
  birthDate: string | null
  igd: number | null
  season?: string | null
}): Promise<void> {
  const supabase = createClient()
  const userId = await currentUserId()

  const birthYear = birthYearOf(input.birthDate)
  const group = positionToGroup(input.position)

  // Dados insuficientes para comparar: retira a atleta da base anônima.
  if (input.igd == null || birthYear == null || group === "outro") {
    const { error } = await supabase.from("vib_samples").delete().eq("owner_id", userId).eq("athlete_id", input.athleteId)
    if (error) throw describeDbError(error, "Falha ao atualizar a base estatística do VIB.")
    return
  }

  const { error } = await supabase.from("vib_samples").upsert(
    {
      owner_id: userId,
      athlete_id: input.athleteId,
      position_group: group,
      birth_year: birthYear,
      igd: input.igd,
      season: input.season ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "athlete_id" },
  )
  if (error) throw describeDbError(error, "Falha ao atualizar a base estatística do VIB.")
}

/**
 * Consulta a referência agregada do VIB para uma atleta.
 * Retorna null quando faltam dados essenciais (posição/idade/IGD).
 */
export async function compareVib(input: {
  position: string | null
  birthDate: string | null
  igd: number | null
}): Promise<VibCompareResult | null> {
  const birthYear = birthYearOf(input.birthDate)
  const group = positionToGroup(input.position)
  if (input.igd == null || birthYear == null || group === "outro") return null

  const supabase = createClient()
  const { data, error } = await supabase.rpc("vib_compare", {
    p_position_group: group,
    p_birth_year: birthYear,
    p_igd: input.igd,
  })
  if (error) throw describeDbError(error, "Falha ao calcular o VIB.")

  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null

  const num = (v: unknown): number | null => (v == null ? null : Math.round(Number(v)))
  return {
    sampleSize: Number(row.sample_size) || 0,
    band: Number(row.band) || 4,
    isExcellent: Boolean(row.is_excellent),
    bandAverages: [num(row.band1_avg), num(row.band2_avg), num(row.band3_avg), num(row.band4_avg)],
    bandMins: [num(row.band1_min), num(row.band2_min), num(row.band3_min), num(row.band4_min)],
  }
}

/** Uma linha do histórico do VIB da atleta (privada por conta). */
export interface VibHistoryRow {
  season: string
  classification: VibClassification
  band: number
  athleteIgd: number
  band1Avg: number | null
  sampleSize: number | null
}

/** Lê o histórico do VIB da atleta, em ordem crescente de temporada. */
export async function listVibHistory(athleteId: string): Promise<VibHistoryRow[]> {
  const supabase = createClient()
  const userId = await currentUserId()
  const { data, error } = await supabase
    .from("vib_history")
    .select("season, classification, band, athlete_igd, band1_avg, sample_size")
    .eq("owner_id", userId)
    .eq("athlete_id", athleteId)
    .order("season", { ascending: true })
  if (error) throw describeDbError(error, "Falha ao carregar o histórico do VIB.")

  return (data ?? []).map((r) => ({
    season: r.season as string,
    classification: r.classification as VibClassification,
    band: Number(r.band),
    athleteIgd: Math.round(Number(r.athlete_igd)),
    band1Avg: r.band1_avg == null ? null : Math.round(Number(r.band1_avg)),
    sampleSize: r.sample_size == null ? null : Number(r.sample_size),
  }))
}

/** Registra/atualiza a classificação do VIB da atleta para uma temporada. */
export async function saveVibHistory(input: {
  athleteId: string
  season: string
  classification: VibClassification
  band: number
  athleteIgd: number
  band1Avg: number | null
  sampleSize: number | null
}): Promise<void> {
  const supabase = createClient()
  const userId = await currentUserId()
  const { error } = await supabase.from("vib_history").upsert(
    {
      owner_id: userId,
      athlete_id: input.athleteId,
      season: input.season,
      classification: input.classification,
      band: input.band,
      athlete_igd: input.athleteIgd,
      band1_avg: input.band1Avg,
      sample_size: input.sampleSize,
    },
    { onConflict: "athlete_id,season" },
  )
  if (error) throw describeDbError(error, "Falha ao registrar o histórico do VIB.")
}

export type { PositionGroup }
