"use server"

import { db } from "@/lib/gestao/db"
import { turmas, atletas, categorias } from "@/lib/gestao/db/schema"
import { getGestaoUserId } from "@/lib/gestao/auth"
import { and, asc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function listTurmas() {
  const userId = await getGestaoUserId()
  const rows = await db
    .select({
      id: turmas.id,
      nome: turmas.nome,
      categoriaId: turmas.categoriaId,
      categoriaNome: categorias.nome,
      professor: turmas.professor,
      diasSemana: turmas.diasSemana,
      horario: turmas.horario,
      quadra: turmas.quadra,
      valorMensalidade: turmas.valorMensalidade,
      diaVencimento: turmas.diaVencimento,
      ativo: turmas.ativo,
      totalAtletas: sql<number>`(select count(*) from ${atletas} where ${atletas.turmaId} = ${turmas.id} and ${atletas.userId} = ${userId})`,
    })
    .from(turmas)
    .leftJoin(categorias, eq(categorias.id, turmas.categoriaId))
    .where(eq(turmas.userId, userId))
    .orderBy(asc(turmas.id))
  return rows.map((r) => ({ ...r, totalAtletas: Number(r.totalAtletas) }))
}

export async function getTurma(id: number) {
  const userId = await getGestaoUserId()
  const [t] = await db
    .select()
    .from(turmas)
    .where(and(eq(turmas.id, id), eq(turmas.userId, userId)))
  return t ?? null
}

function parseTurma(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim()
  if (!nome) throw new Error("Nome da turma é obrigatório")
  const categoriaIdRaw = String(formData.get("categoriaId") ?? "")
  return {
    nome,
    categoriaId: categoriaIdRaw ? Number(categoriaIdRaw) : null,
    professor: String(formData.get("professor") ?? "").trim() || null,
    diasSemana: String(formData.get("diasSemana") ?? "").trim() || null,
    horario: String(formData.get("horario") ?? "").trim() || null,
    quadra: String(formData.get("quadra") ?? "").trim() || null,
    valorMensalidade: String(Number(formData.get("valorMensalidade") ?? 0) || 0),
    diaVencimento: Number(formData.get("diaVencimento") ?? 10) || 10,
  }
}

export async function createTurma(formData: FormData) {
  const userId = await getGestaoUserId()
  await db.insert(turmas).values({ ...parseTurma(formData), userId })
  revalidatePath("/gestao/turmas")
  revalidatePath("/gestao")
}

export async function updateTurma(id: number, formData: FormData) {
  const userId = await getGestaoUserId()
  await db
    .update(turmas)
    .set(parseTurma(formData))
    .where(and(eq(turmas.id, id), eq(turmas.userId, userId)))
  revalidatePath("/gestao/turmas")
  revalidatePath("/gestao")
}

export async function toggleTurma(id: number, ativo: boolean) {
  const userId = await getGestaoUserId()
  await db.update(turmas).set({ ativo }).where(and(eq(turmas.id, id), eq(turmas.userId, userId)))
  revalidatePath("/gestao/turmas")
}

export async function deleteTurma(id: number) {
  const userId = await getGestaoUserId()
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(atletas)
    .where(and(eq(atletas.turmaId, id), eq(atletas.userId, userId)))
  if (Number(count) > 0) throw new Error("Não é possível excluir: há atletas vinculados a esta turma.")
  await db.delete(turmas).where(and(eq(turmas.id, id), eq(turmas.userId, userId)))
  revalidatePath("/gestao/turmas")
}
