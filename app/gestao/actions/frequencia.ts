"use server"

import { db } from "@/lib/db"
import { atletas, categorias, presencas, turmas } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

const PRESENTE = sql`case when ${presencas.status} in ('presente','atrasado') then 1 else 0 end`

export async function frequenciaPorTurma() {
  const rows = await db
    .select({
      turmaId: turmas.id,
      turmaNome: turmas.nome,
      total: sql<number>`count(${presencas.id})`,
      presentes: sql<number>`coalesce(sum(${PRESENTE}), 0)`,
    })
    .from(turmas)
    .leftJoin(presencas, eq(presencas.turmaId, turmas.id))
    .where(eq(turmas.ativo, true))
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
  const rows = await db
    .select({
      categoriaNome: categorias.nome,
      total: sql<number>`count(${presencas.id})`,
      presentes: sql<number>`coalesce(sum(${PRESENTE}), 0)`,
    })
    .from(categorias)
    .leftJoin(atletas, eq(atletas.categoriaId, categorias.id))
    .leftJoin(presencas, eq(presencas.atletaId, atletas.id))
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
    .where(eq(atletas.ativo, true))
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
