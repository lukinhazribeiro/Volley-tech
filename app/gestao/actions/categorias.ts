"use server"

import { db } from "@/lib/gestao/db"
import { categorias, atletas } from "@/lib/gestao/db/schema"
import { asc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function listCategorias() {
  const rows = await db
    .select({
      id: categorias.id,
      nome: categorias.nome,
      descricao: categorias.descricao,
      ativo: categorias.ativo,
      totalAtletas: sql<number>`(select count(*) from ${atletas} where ${atletas.categoriaId} = ${categorias.id})`,
    })
    .from(categorias)
    .orderBy(asc(categorias.id))
  return rows.map((r) => ({ ...r, totalAtletas: Number(r.totalAtletas) }))
}

export async function createCategoria(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim()
  const descricao = String(formData.get("descricao") ?? "").trim() || null
  if (!nome) throw new Error("Nome é obrigatório")
  await db.insert(categorias).values({ nome, descricao })
  revalidatePath("/gestao/categorias")
}

export async function updateCategoria(id: number, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim()
  const descricao = String(formData.get("descricao") ?? "").trim() || null
  if (!nome) throw new Error("Nome é obrigatório")
  await db.update(categorias).set({ nome, descricao }).where(eq(categorias.id, id))
  revalidatePath("/gestao/categorias")
}

export async function toggleCategoria(id: number, ativo: boolean) {
  await db.update(categorias).set({ ativo }).where(eq(categorias.id, id))
  revalidatePath("/gestao/categorias")
}

export async function deleteCategoria(id: number) {
  // Só permite excluir se não houver atletas vinculados
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(atletas)
    .where(eq(atletas.categoriaId, id))
  if (Number(count) > 0) throw new Error("Não é possível excluir: há atletas vinculados a esta categoria.")
  await db.delete(categorias).where(eq(categorias.id, id))
  revalidatePath("/gestao/categorias")
}
