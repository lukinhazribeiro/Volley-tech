/**
 * Volley Hub — IPF (Índice de Performance Física).
 *
 * Histórico físico da atleta organizado em CINCO pilares, cada um com seus
 * testes. Apenas lê/grava a tabela hub_physical_assessments (RLS owner-only).
 *
 *  - Força:       Wall Sit (s), Prancha (s)
 *  - Alcance:     Altura, Envergadura, Alcance de ataque, Alcance de bloqueio (cm)
 *  - Explosão:    Salto vertical, Salto de ataque, Salto horizontal (cm)
 *  - Resistência: Corrida de 6 min (m), Burpees em 2 min (reps)
 *  - Agilidade:   Teste T (s), Teste do Quadrado (s)  -> menor tempo = melhor
 */

import { createClient } from "@/lib/supabase/client"
import { describeDbError } from "./data"

export type Pillar = "forca" | "alcance" | "explosao" | "resistencia" | "agilidade"

/** Uma avaliação física (linha de hub_physical_assessments). */
export interface PhysicalAssessment {
  id: string
  athlete_id: string
  assessment_date: string
  // Força
  wall_sit_s: number | null
  plank_s: number | null
  // Alcance
  height_cm: number | null
  wingspan_cm: number | null
  attack_reach_cm: number | null
  block_reach_cm: number | null
  // Explosão
  vertical_jump_cm: number | null
  attack_jump_cm: number | null
  horizontal_jump_cm: number | null
  // Resistência
  run_6min_m: number | null
  burpees_2min: number | null
  // Agilidade
  t_test_s: number | null
  square_test_s: number | null
  notes: string | null
  created_at: string
}

/** Campos numéricos editáveis de uma avaliação (colunas de teste). */
export type PhysicalMetric =
  | "wall_sit_s"
  | "plank_s"
  | "height_cm"
  | "wingspan_cm"
  | "attack_reach_cm"
  | "block_reach_cm"
  | "vertical_jump_cm"
  | "attack_jump_cm"
  | "horizontal_jump_cm"
  | "run_6min_m"
  | "burpees_2min"
  | "t_test_s"
  | "square_test_s"

export interface MetricDef {
  key: PhysicalMetric
  label: string
  unit: string
  pillar: Pillar
  /** "higher" = maior é melhor; "lower" = menor é melhor (tempos de agilidade). */
  direction: "higher" | "lower"
  /** Faixa de referência para normalizar em 0-100 [pior, melhor]. */
  range: [number, number]
}

export interface PillarDef {
  key: Pillar
  label: string
  description: string
}

/** Os cinco pilares e suas descrições. */
export const PILLARS: PillarDef[] = [
  { key: "forca", label: "Força", description: "Avalia a força e a resistência muscular." },
  { key: "alcance", label: "Alcance", description: "Avalia o potencial físico acima da rede." },
  { key: "explosao", label: "Explosão", description: "Avalia a potência muscular." },
  { key: "resistencia", label: "Resistência", description: "Avalia a capacidade de manter o desempenho físico." },
  { key: "agilidade", label: "Agilidade", description: "Avalia velocidade e mudança de direção." },
]

/**
 * Definições dos testes. As faixas [pior, melhor] são referências gerais de
 * voleibol feminino (base/adulto) e servem apenas para normalizar em 0-100.
 */
export const PHYSICAL_METRICS: MetricDef[] = [
  // Força
  { key: "wall_sit_s", label: "Wall Sit", unit: "s", pillar: "forca", direction: "higher", range: [30, 120] },
  { key: "plank_s", label: "Prancha", unit: "s", pillar: "forca", direction: "higher", range: [30, 180] },
  // Alcance
  { key: "height_cm", label: "Altura", unit: "cm", pillar: "alcance", direction: "higher", range: [150, 200] },
  { key: "wingspan_cm", label: "Envergadura", unit: "cm", pillar: "alcance", direction: "higher", range: [150, 210] },
  { key: "attack_reach_cm", label: "Alcance de ataque", unit: "cm", pillar: "alcance", direction: "higher", range: [250, 320] },
  { key: "block_reach_cm", label: "Alcance de bloqueio", unit: "cm", pillar: "alcance", direction: "higher", range: [240, 305] },
  // Explosão
  { key: "vertical_jump_cm", label: "Salto vertical", unit: "cm", pillar: "explosao", direction: "higher", range: [25, 75] },
  { key: "attack_jump_cm", label: "Salto de ataque", unit: "cm", pillar: "explosao", direction: "higher", range: [30, 90] },
  { key: "horizontal_jump_cm", label: "Salto horizontal", unit: "cm", pillar: "explosao", direction: "higher", range: [150, 260] },
  // Resistência
  { key: "run_6min_m", label: "Corrida de 6 minutos", unit: "m", pillar: "resistencia", direction: "higher", range: [800, 1600] },
  { key: "burpees_2min", label: "Burpees em 2 minutos", unit: "reps", pillar: "resistencia", direction: "higher", range: [20, 70] },
  // Agilidade (menor é melhor)
  { key: "t_test_s", label: "Teste T", unit: "s", pillar: "agilidade", direction: "lower", range: [14, 9] },
  { key: "square_test_s", label: "Teste do Quadrado", unit: "s", pillar: "agilidade", direction: "lower", range: [22, 14] },
]

/** Testes de um pilar. */
export function metricsForPillar(pillar: Pillar): MetricDef[] {
  return PHYSICAL_METRICS.filter((m) => m.pillar === pillar)
}

/** Normaliza uma métrica em 0-100 usando sua faixa de referência e direção. */
function normalizeMetric(def: MetricDef, value: number): number {
  const [worst, best] = def.range
  const pct = ((value - worst) / (best - worst)) * 100
  return Math.max(0, Math.min(100, pct))
}

/** Score 0-100 de um pilar numa avaliação (média dos testes preenchidos). Null se vazio. */
export function pillarScore(pillar: Pillar, a: PhysicalAssessment): number | null {
  let sum = 0
  let count = 0
  for (const def of metricsForPillar(pillar)) {
    const value = a[def.key]
    if (value == null || Number.isNaN(value)) continue
    sum += normalizeMetric(def, value)
    count++
  }
  if (count === 0) return null
  return Math.round(sum / count)
}

/** Scores dos 5 pilares numa avaliação. */
export function pillarScores(a: PhysicalAssessment): Record<Pillar, number | null> {
  const out = {} as Record<Pillar, number | null>
  for (const p of PILLARS) out[p.key] = pillarScore(p.key, a)
  return out
}

/**
 * IPF — Índice de Performance Física (0-100) de uma avaliação.
 * Média dos PILARES avaliados (não dos testes crus), para que cada pilar tenha
 * peso igual independentemente de quantos testes possua. Null se nenhum pilar
 * tiver dados.
 */
export function computeIPF(a: PhysicalAssessment): number | null {
  const scores = PILLARS.map((p) => pillarScore(p.key, a)).filter((s): s is number => s != null)
  if (scores.length === 0) return null
  return Math.round(scores.reduce((x, y) => x + y, 0) / scores.length)
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
