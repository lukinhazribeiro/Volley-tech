"use server"

import { db } from "@/lib/gestao/db"
import { despesas } from "@/lib/gestao/db/schema"
import { getGestaoUserId } from "@/lib/gestao/auth"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

/** Lista as despesas de um ano-calendário, mais recentes primeiro. */
export async function listDespesas(ano: number) {
  const userId = await getGestaoUserId()
  const rows = await db
    .select()
    .from(despesas)
    .where(and(eq(despesas.userId, userId), sql`extract(year from ${despesas.data}) = ${ano}`))
    .orderBy(desc(despesas.data))
  return rows.map((d) => ({
    id: d.id,
    descricao: d.descricao,
    categoria: d.categoria,
    valor: Number(d.valor),
    data: d.data,
    observacao: d.observacao,
  }))
}

/** Cria uma despesa manual (usada no balanço anual para imposto de renda). */
export async function createDespesa(formData: FormData) {
  const userId = await getGestaoUserId()
  const descricao = String(formData.get("descricao") ?? "").trim()
  const data = String(formData.get("data") ?? "").trim()
  if (!descricao || !data) throw new Error("Descrição e data são obrigatórias")
  const valor = Number(formData.get("valor") ?? 0) || 0
  const categoria = String(formData.get("categoria") ?? "geral").trim() || "geral"
  const observacao = String(formData.get("observacao") ?? "").trim() || null

  await db.insert(despesas).values({
    userId,
    descricao,
    categoria,
    valor: String(valor),
    data,
    observacao,
  })
  revalidatePath("/gestao/relatorios")
  revalidatePath("/gestao/financeiro")
  return { ok: true }
}

export async function deleteDespesa(id: number) {
  const userId = await getGestaoUserId()
  await db.delete(despesas).where(and(eq(despesas.id, id), eq(despesas.userId, userId)))
  revalidatePath("/gestao/relatorios")
  revalidatePath("/gestao/financeiro")
  return { ok: true }
}

/** Anos que possuem despesas registradas. */
export async function anosComDespesa() {
  const userId = await getGestaoUserId()
  const rows = await db
    .select({ ano: sql<string>`extract(year from ${despesas.data})::text` })
    .from(despesas)
    .where(eq(despesas.userId, userId))
    .groupBy(sql`extract(year from ${despesas.data})`)
  return rows.map((r) => Number(r.ano))
}
