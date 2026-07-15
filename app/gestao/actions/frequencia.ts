"use server"

import { db } from "@/lib/gestao/db"
import { atletas, categorias, presencas, turmas } from "@/lib/gestao/db/schema"
import { getGestaoUserId } from "@/lib/gestao/auth"
import { and, eq, sql } from "drizzle-orm"

const PRESENTE = sql`case when ${presencas.status} in ('presente','atrasado') then 1 else 0 end`

/**
 * Relatório de frequência MENSAL por turma. Para a competência (AAAA-MM) informada,
 * retorna cada turma com o total de presenças/faltas do mês, o percentual e o
 * detalhamento por atleta. Também traz a evolução dos últimos 6 meses por turma.
 */
export async function frequenciaMensalPorTurma(competencia: string) {
  const userId = await getGestaoUserId()
  // Resumo do mês por turma
  const resumo = await db
    .select({
      turmaId: turmas.id,
      turmaNome: turmas.nome,
      total: sql<number>`count(${presencas.id})`,
      presentes: sql<number>`coalesce(sum(${PRESENTE}), 0)`,
    })
    .from(turmas)
    .leftJoin(
      presencas,
      sql`${presencas.turmaId} = ${turmas.id} and to_char(${presencas.data}, 'YYYY-MM') = ${competencia}`,
    )
    .where(and(eq(turmas.ativo, true), eq(turmas.userId, userId)))
    .groupBy(turmas.id, turmas.nome)
    .orderBy(turmas.nome)

  // Detalhe por atleta dentro de cada turma no mês
  const detalhe = await db
    .select({
      turmaId: presencas.turmaId,
      atletaId: atletas.id,
      atletaNome: atletas.nome,
      total: sql<number>`count(${presencas.id})`,
      presentes: sql<number>`coalesce(sum(${PRESENTE}), 0)`,
    })
    .from(presencas)
    .innerJoin(atletas, eq(atletas.id, presencas.atletaId))
    .where(and(sql`to_char(${presencas.data}, 'YYYY-MM') = ${competencia}`, eq(presencas.userId, userId)))
    .groupBy(presencas.turmaId, atletas.id, atletas.nome)
    .orderBy(atletas.nome)

  // Evolução dos últimos 6 meses por turma
  const evolucao = await db
    .select({
      turmaId: presencas.turmaId,
      competencia: sql<string>`to_char(${presencas.data}, 'YYYY-MM')`,
      total: sql<number>`count(${presencas.id})`,
      presentes: sql<number>`coalesce(sum(${PRESENTE}), 0)`,
    })
    .from(presencas)
    .where(
      and(
        sql`${presencas.data} >= (date_trunc('month', now()) - interval '5 months')`,
        eq(presencas.userId, userId),
      ),
    )
    .groupBy(presencas.turmaId, sql`to_char(${presencas.data}, 'YYYY-MM')`)

  const detPorTurma = new Map<number, { atletaNome: string; total: number; presentes: number; percentual: number }[]>()
  for (const d of detalhe) {
    const arr = detPorTurma.get(Number(d.turmaId)) ?? []
    const total = Number(d.total)
    const presentes = Number(d.presentes)
    arr.push({
      atletaNome: d.atletaNome,
      total,
      presentes,
      percentual: total > 0 ? Math.round((presentes / total) * 100) : 0,
    })
    detPorTurma.set(Number(d.turmaId), arr)
  }

  const evoPorTurma = new Map<number, { competencia: string; percentual: number }[]>()
  for (const e of evolucao) {
    if (e.turmaId == null) continue
    const arr = evoPorTurma.get(Number(e.turmaId)) ?? []
    const total = Number(e.total)
    const presentes = Number(e.presentes)
    arr.push({ competencia: e.competencia, percentual: total > 0 ? Math.round((presentes / total) * 100) : 0 })
    evoPorTurma.set(Number(e.turmaId), arr)
  }

  return resumo.map((r) => ({
    turmaId: r.turmaId,
    turmaNome: r.turmaNome,
    total: Number(r.total),
    presentes: Number(r.presentes),
    faltas: Number(r.total) - Number(r.presentes),
    percentual: Number(r.total) > 0 ? Math.round((Number(r.presentes) / Number(r.total)) * 100) : 0,
    atletas: detPorTurma.get(r.turmaId) ?? [],
    evolucao: (evoPorTurma.get(r.turmaId) ?? []).sort((a, b) => a.competencia.localeCompare(b.competencia)),
  }))
}

/** Lista as competências (AAAA-MM) que possuem presenças registradas, mais recente primeiro. */
export async function competenciasComPresenca() {
  const userId = await getGestaoUserId()
  const rows = await db
    .select({ competencia: sql<string>`to_char(${presencas.data}, 'YYYY-MM')` })
    .from(presencas)
    .where(eq(presencas.userId, userId))
    .groupBy(sql`to_char(${presencas.data}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${presencas.data}, 'YYYY-MM') desc`)
  return rows.map((r) => r.competencia)
}

export async function frequenciaPorTurma() {
  const userId = await getGestaoUserId()
  const rows = await db
    .select({
      turmaId: turmas.id,
      turmaNome: turmas.nome,
      total: sql<number>`count(${presencas.id})`,
      presentes: sql<number>`coalesce(sum(${PRESENTE}), 0)`,
    })
    .from(turmas)
    .leftJoin(presencas, eq(presencas.turmaId, turmas.id))
    .where(and(eq(turmas.ativo, true), eq(turmas.userId, userId)))
    .groupBy(turmas.id, turmas.nome)
    .orderBy(turmas.nome)

  return rows.map((r) => ({
    ...r,
    total: Number(r.total),
    presentes: Number(r.presentes),
    percentual: Number(r.total) > 0 ? Math.round((Number(r.presentes) / Number(r.total)) * 100) : 0,
  }))
}

export async function frequenciaPorCategoria() {
  const userId = await getGestaoUserId()
  const rows = await db
    .select({
      categoriaNome: categorias.nome,
      total: sql<number>`count(${presencas.id})`,
      presentes: sql<number>`coalesce(sum(${PRESENTE}), 0)`,
    })
    .from(categorias)
    .leftJoin(atletas, eq(atletas.categoriaId, categorias.id))
    .leftJoin(presencas, eq(presencas.atletaId, atletas.id))
    .where(eq(categorias.userId, userId))
    .groupBy(categorias.id, categorias.nome)
    .orderBy(categorias.nome)

  return rows.map((r) => ({
    categoriaNome: r.categoriaNome,
    total: Number(r.total),
    presentes: Number(r.presentes),
    percentual: Number(r.total) > 0 ? Math.round((Number(r.presentes) / Number(r.total)) * 100) : 0,
  }))
}

export async function frequenciaPorAtleta() {
  const userId = await getGestaoUserId()
  const rows = await db
    .select({
      atletaId: atletas.id,
      atletaNome: atletas.nome,
      turmaNome: turmas.nome,
      total: sql<number>`count(${presencas.id})`,
      presentes: sql<number>`coalesce(sum(${PRESENTE}), 0)`,
    })
    .from(atletas)
    .leftJoin(presencas, eq(presencas.atletaId, atletas.id))
    .leftJoin(turmas, eq(atletas.turmaId, turmas.id))
    .where(and(eq(atletas.ativo, true), eq(atletas.userId, userId)))
    .groupBy(atletas.id, atletas.nome, turmas.nome)
    .orderBy(atletas.nome)

  return rows.map((r) => ({
    atletaId: r.atletaId,
    atletaNome: r.atletaNome,
    turmaNome: r.turmaNome,
    total: Number(r.total),
    presentes: Number(r.presentes),
    percentual: Number(r.total) > 0 ? Math.round((Number(r.presentes) / Number(r.total)) * 100) : 0,
  }))
}
