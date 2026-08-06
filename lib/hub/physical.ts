/**
 * Volley Hub — IPF (Índice de Performance Física).
 *
 * Histórico físico da atleta: cadastro de avaliações, evolução ao longo do
 * tempo e um índice físico geral (0-100) derivado das medidas registradas.
 *
 * Independente dos demais módulos: apenas lê/grava a tabela própria
 * hub_physical_assessments (protegida por RLS "owner-only").
 */

import { createClient } from "@/lib/supabase/client"
import { describeDbError } from "./data"

/** Uma avaliação física (linha de hub_physical_assessments). */
export interface PhysicalAssessment {
  id: string
  athlete_id: string
  assessment_date: string
  height_cm: number | null
  weight_kg: number | null
  vertical_jump_cm: number | null
  attack_reach_cm: number | null
  block_reach_cm: number | null
  sprint_20m_s: number | null
  agility_s: number | null
  endurance_score: number | null
  strength_score: number | null
  notes: string | null
  created_at: string
}

/** Campos numéricos editáveis de uma avaliação. */
export type PhysicalMetric =
  | "height_cm"
  | "weight_kg"
  | "vertical_jump_cm"
  | "attack_reach_cm"
  | "block_reach_cm"
  | "sprint_20m_s"
  | "agility_s"
  | "endurance_score"
  | "strength_score"

export interface MetricDef {
  key: PhysicalMetric
  label: string
  unit: string
  /** "higher" = maior é melhor; "lower" = menor é melhor. */
  direction: "higher" | "lower"
  /** Entra no cálculo do índice físico geral. */
  scored: boolean
  /** Faixa de referência para normalizar em 0-100 [pior, melhor]. */
  range?: [number, number]
}

/**
 * Definições das métricas. As faixas são referências gerais de voleibol
 * feminino de base/adulto; servem apenas para normalizar o índice (0-100).
 */
export const PHYSICAL_METRICS: MetricDef[] = [
  { key: "vertical_jump_cm", label: "Impulsão vertical", unit: "cm", direction: "higher", scored: true, range: [30, 75] },
  { key: "attack_reach_cm", label: "Alcance de ataque", unit: "cm", direction: "higher", scored: true, range: [260, 320] },
  { key: "block_reach_cm", label: "Alcance de bloqueio", unit: "cm", direction: "higher", scored: true, range: [250, 305] },
  { key: "sprint_20m_s", label: "Velocidade 20m", unit: "s", direction: "lower", scored: true, range: [4.4, 3.0] },
  { key: "agility_s", label: "Agilidade", unit: "s", direction: "lower", scored: true, range: [12, 8] },
  { key: "endurance_score", label: "Resistência", unit: "pts", direction: "higher", scored: true, range: [0, 100] },
  { key: "strength_score", label: "Força", unit: "pts", direction: "higher", scored: true, range: [0, 100] },
  { key: "height_cm", label: "Altura", unit: "cm", direction: "higher", scored: false },
  { key: "weight_kg", label: "Peso", unit: "kg", direction: "higher", scored: false },
]

/** Normaliza uma métrica em 0-100 usando sua faixa de referência e direção. */
function normalizeMetric(def: MetricDef, value: number): number {
  if (!def.range) return 0
  const [worst, best] = def.range
  const pct = ((value - worst) / (best - worst)) * 100
  return Math.max(0, Math.min(100, pct))
}

/**
 * IPF — Índice de Performance Física (0-100) de uma avaliação.
 * Média das métricas pontuáveis que foram preenchidas. Retorna null quando
 * nenhuma métrica pontuável está disponível.
 */
export function computeIPF(a: PhysicalAssessment): number | null {
  let sum = 0
  let count = 0
  for (const def of PHYSICAL_METRICS) {
    if (!def.scored) continue
    const value = a[def.key]
    if (value == null) continue
    sum += normalizeMetric(def, value)
    count++
  }
  if (count === 0) return null
  return Math.round(sum / count)
}

/** Média do IPF de todas as avaliações (para o IGD). Null se não houver dados. */
export function averageIPF(assessments: PhysicalAssessment[]): number | null {
  const indices = assessments.map(computeIPF).filter((x): x is number => x != null)
  if (indices.length === 0) return null
  return Math.round(indices.reduce((a, b) => a + b, 0) / indices.length)
}

/** Série temporal do IPF (para o gráfico de evolução). */
export function ipfSeries(assessments: PhysicalAssessment[]): Array<{ date: string; ipf: number }> {
  return [...assessments]
    .sort((a, b) => a.assessment_date.localeCompare(b.assessment_date))
    .map((a) => ({ date: a.assessment_date, ipf: computeIPF(a) }))
    .filter((p): p is { date: string; ipf: number } => p.ipf != null)
}

// ----------------------- CRUD -----------------------

export async function listAssessments(athleteId: string): Promise<PhysicalAssessment[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("hub_physical_assessments")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("assessment_date", { ascending: true })
  return (data ?? []) as PhysicalAssessment[]
}

export type NewAssessment = {
  athlete_id: string
  assessment_date: string
} & Partial<Record<PhysicalMetric, number | null>> & { notes?: string | null }

export async function createAssessment(input: NewAssessment): Promise<PhysicalAssessment> {
  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id
  if (!userId) throw new Error("Sessão não encontrada. Faça login para usar o Volley Tech.")

  const { data, error } = await supabase
    .from("hub_physical_assessments")
    .insert({ owner_id: userId, ...input })
    .select("*")
    .single()
  if (error) throw describeDbError(error, "Falha ao salvar a avaliação física.")
  return data as PhysicalAssessment
}

export async function deleteAssessment(id: string): Promise<void> {
  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id
  if (!userId) throw new Error("Sessão não encontrada. Faça login para usar o Volley Tech.")
  const { error } = await supabase
    .from("hub_physical_assessments")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId)
  if (error) throw describeDbError(error, "Falha ao excluir a avaliação física.")
}
