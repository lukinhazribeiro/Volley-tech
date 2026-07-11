"use server"

import { db } from "@/lib/gestao/db"
import { atletas, turmas, categorias, mensalidades, presencas, atletaTurmas } from "@/lib/gestao/db/schema"
import { calcularMensalidade, competenciaAtual, type DescontoTipo } from "@/lib/gestao/format"
import { and, asc, desc, eq, ilike, or, sql, gte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { sincronizarMensalidades } from "./financeiro"

export type VinculoTurma = { turmaId: number; valor: number }

export async function listAtletas(search?: string) {
  const base = db
    .select({
      id: atletas.id,
      nome: atletas.nome,
      cpf: atletas.cpf,
      telefone: atletas.telefone,
      categoriaId: atletas.categoriaId,
      categoriaNome: categorias.nome,
      turmaId: atletas.turmaId,
      turmaNome: turmas.nome,
      valorMensalidade: atletas.valorMensalidade,
      descontoTipo: atletas.descontoTipo,
      descontoValor: atletas.descontoValor,
      bolsista: atletas.bolsista,
      ativo: atletas.ativo,
    })
    .from(atletas)
    .leftJoin(categorias, eq(categorias.id, atletas.categoriaId))
    .leftJoin(turmas, eq(turmas.id, atletas.turmaId))
    .orderBy(asc(atletas.nome))

  if (search && search.trim()) {
    const term = `%${search.trim()}%`
    return base.where(
      or(
        ilike(atletas.nome, term),
        ilike(atletas.cpf, term),
        ilike(atletas.telefone, term),
      ),
    )
  }
  return base
}

export async function getAtleta(id: number) {
  const [a] = await db
    .select({
      atleta: atletas,
      categoriaNome: categorias.nome,
      turmaNome: turmas.nome,
      turmaValor: turmas.valorMensalidade,
      turmaVencimento: turmas.diaVencimento,
    })
    .from(atletas)
    .leftJoin(categorias, eq(categorias.id, atletas.categoriaId))
    .leftJoin(turmas, eq(turmas.id, atletas.turmaId))
    .where(eq(atletas.id, id))
  return a ?? null
}

export async function getVinculosAtleta(id: number) {
  const rows = await db
    .select({
      turmaId: atletaTurmas.turmaId,
      valor: atletaTurmas.valor,
      turmaNome: turmas.nome,
      diaVencimento: turmas.diaVencimento,
    })
    .from(atletaTurmas)
    .leftJoin(turmas, eq(turmas.id, atletaTurmas.turmaId))
    .where(eq(atletaTurmas.atletaId, id))
  return rows.map((r) => ({
    turmaId: r.turmaId,
    valor: Number(r.valor),
    turmaNome: r.turmaNome ?? "-",
    diaVencimento: r.diaVencimento ?? 10,
  }))
}

export async function getHistoricoAtleta(id: number) {
  const fichas = await db
    .select()
    .from(mensalidades)
    .where(eq(mensalidades.atletaId, id))
    .orderBy(desc(mensalidades.competencia))

  const chamadas = await db
    .select()
    .from(presencas)
    .where(eq(presencas.atletaId, id))
    .orderBy(desc(presencas.data))
    .limit(30)

  const [freq] = await db
    .select({
      total: sql<number>`count(*)`,
      presentes: sql<number>`count(*) filter (where ${presencas.status} in ('presente','atrasado'))`,
    })
    .from(presencas)
    .where(eq(presencas.atletaId, id))

  const total = Number(freq?.total ?? 0)
  const presentes = Number(freq?.presentes ?? 0)
  return {
    mensalidades: fichas,
    presencas: chamadas,
    frequencia: total > 0 ? Math.round((presentes / total) * 100) : 0,
    totalChamadas: total,
  }
}

function parseVinculos(formData: FormData): VinculoTurma[] {
  const raw = String(formData.get("turmasJson") ?? "").trim()
  if (!raw) return []
  try {
    const arr = JSON.parse(raw) as { turmaId: number | string; valor: number | string }[]
    return arr
      .map((v) => ({ turmaId: Number(v.turmaId), valor: Number(v.valor) || 0 }))
      .filter((v) => v.turmaId > 0)
  } catch {
    return []
  }
}

function parseAtleta(formData: FormData, vinculos: VinculoTurma[]) {
  const nome = String(formData.get("nome") ?? "").trim()
  if (!nome) throw new Error("Nome é obrigatório")
  const categoriaIdRaw = String(formData.get("categoriaId") ?? "")
  const descontoTipo = (String(formData.get("descontoTipo") ?? "nenhum") || "nenhum") as DescontoTipo
  const bolsista = descontoTipo !== "nenhum"
  // O valor base do atleta é a soma dos valores de todas as turmas vinculadas.
  const valorBase = vinculos.reduce((s, v) => s + v.valor, 0)
  // A primeira turma fica em turmaId (compatibilidade com telas que mostram "turma principal").
  const turmaPrincipal = vinculos[0]?.turmaId ?? null
  return {
    nome,
    cpf: String(formData.get("cpf") ?? "").trim() || null,
    telefone: String(formData.get("telefone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    dataNascimento: String(formData.get("dataNascimento") ?? "").trim() || null,
    dataInscricao: String(formData.get("dataInscricao") ?? "").trim() || null,
    responsavel: String(formData.get("responsavel") ?? "").trim() || null,
    telefoneResponsavel: String(formData.get("telefoneResponsavel") ?? "").trim() || null,
    categoriaId: categoriaIdRaw ? Number(categoriaIdRaw) : null,
    turmaId: turmaPrincipal,
    valorMensalidade: String(valorBase),
    descontoTipo,
    descontoValor: String(Number(formData.get("descontoValor") ?? 0) || 0),
    bolsista,
  }
}

/** Substitui os vínculos de turma do atleta pela lista informada. */
async function salvarVinculos(atletaId: number, vinculos: VinculoTurma[]) {
  await db.delete(atletaTurmas).where(eq(atletaTurmas.atletaId, atletaId))
  if (vinculos.length > 0) {
    await db.insert(atletaTurmas).values(
      vinculos.map((v) => ({ atletaId, turmaId: v.turmaId, valor: String(v.valor) })),
    )
  }
}

/** Cria o atleta, grava os vínculos de turma e gera as mensalidades (uma por turma). */
export async function createAtleta(formData: FormData) {
  const vinculos = parseVinculos(formData)
  const data = parseAtleta(formData, vinculos)

  const [novo] = await db.insert(atletas).values(data).returning({ id: atletas.id })
  await salvarVinculos(novo.id, vinculos)

  // A geração das parcelas (uma por turma, com desconto proporcional, do mês de
  // inscrição até 3 meses à frente) é centralizada na sincronização.
  await sincronizarMensalidades()

  revalidatePath("/gestao/atletas")
  revalidatePath("/gestao/pagamentos")
  revalidatePath("/gestao/financeiro")
  revalidatePath("/gestao")
  redirect(`/gestao/atletas/${novo.id}`)
}

export async function updateAtleta(id: number, formData: FormData) {
  const vinculos = parseVinculos(formData)
  const data = parseAtleta(formData, vinculos)
  await db.update(atletas).set(data).where(eq(atletas.id, id))
  await salvarVinculos(id, vinculos)

  // Recalcula as parcelas pendentes (competência atual em diante) conforme os vínculos.
  await recalcularMensalidadesPendentes(id)

  revalidatePath("/gestao/atletas")
  revalidatePath(`/gestao/atletas/${id}`)
  revalidatePath("/gestao/pagamentos")
  revalidatePath("/gestao/financeiro")
  revalidatePath("/gestao")
  redirect(`/gestao/atletas/${id}`)
}

/**
 * Ajusta as mensalidades pendentes (do mês atual em diante) para refletir os
 * valores de turma e o desconto atuais. Remove as pendentes e deixa a
 * sincronização recriá-las corretamente por turma (com desconto proporcional).
 */
async function recalcularMensalidadesPendentes(atletaId: number) {
  const compAtual = competenciaAtual()
  await db
    .delete(mensalidades)
    .where(
      and(
        eq(mensalidades.atletaId, atletaId),
        eq(mensalidades.status, "pendente"),
        gte(mensalidades.competencia, compAtual),
      ),
    )
  await sincronizarMensalidades()
}

/** Inativa/reativa preservando todo o histórico financeiro e de frequência. */
export async function toggleAtletaAtivo(id: number, ativo: boolean) {
  await db.update(atletas).set({ ativo }).where(eq(atletas.id, id))
  revalidatePath("/gestao/atletas")
  revalidatePath(`/gestao/atletas/${id}`)
  revalidatePath("/gestao")
}
