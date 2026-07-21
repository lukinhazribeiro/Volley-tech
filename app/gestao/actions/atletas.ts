"use server"

import { db } from "@/lib/gestao/db"
import { atletas, turmas, categorias, mensalidades, presencas, atletaTurmas } from "@/lib/gestao/db/schema"
import { calcularMensalidade, competenciaAtual, type DescontoTipo } from "@/lib/gestao/format"
import { getGestaoUserId } from "@/lib/gestao/auth"
import { and, asc, desc, eq, ilike, or, sql, gte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { sincronizarMensalidades } from "./financeiro"

export type VinculoTurma = { turmaId: number; valor: number }

export async function listAtletas(search?: string) {
  const userId = await getGestaoUserId()
  const term = search?.trim() ? `%${search.trim()}%` : null
  const where = term
    ? and(
        eq(atletas.userId, userId),
        or(ilike(atletas.nome, term), ilike(atletas.cpf, term), ilike(atletas.telefone, term)),
      )
    : eq(atletas.userId, userId)

  return db
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
    .where(where)
    .orderBy(asc(atletas.nome))
}

/**
 * Lista os atletas com os campos necessários aos relatórios (inclui data de
 * nascimento e turma principal), para agrupar por turma ou por ano de nascimento.
 */
export async function atletasParaRelatorio() {
  const userId = await getGestaoUserId()
  const rows = await db
    .select({
      nome: atletas.nome,
      turmaNome: turmas.nome,
      categoriaNome: categorias.nome,
      dataNascimento: atletas.dataNascimento,
      dataInscricao: atletas.dataInscricao,
      valorMensalidade: atletas.valorMensalidade,
      ativo: atletas.ativo,
    })
    .from(atletas)
    .leftJoin(turmas, eq(turmas.id, atletas.turmaId))
    .leftJoin(categorias, eq(categorias.id, atletas.categoriaId))
    .where(eq(atletas.userId, userId))
    .orderBy(asc(atletas.nome))

  return rows.map((a) => ({
    nome: a.nome,
    turmaNome: a.turmaNome,
    categoriaNome: a.categoriaNome,
    dataNascimento: a.dataNascimento,
    dataInscricao: a.dataInscricao,
    mensalidade: Number(a.valorMensalidade),
    ativo: a.ativo,
  }))
}

export async function getAtleta(id: number) {
  const userId = await getGestaoUserId()
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
    .where(and(eq(atletas.id, id), eq(atletas.userId, userId)))
  return a ?? null
}

export async function getVinculosAtleta(id: number) {
  const userId = await getGestaoUserId()
  const rows = await db
    .select({
      turmaId: atletaTurmas.turmaId,
      valor: atletaTurmas.valor,
      turmaNome: turmas.nome,
      diaVencimento: turmas.diaVencimento,
    })
    .from(atletaTurmas)
    .leftJoin(turmas, eq(turmas.id, atletaTurmas.turmaId))
    .where(and(eq(atletaTurmas.atletaId, id), eq(atletaTurmas.userId, userId)))
  return rows.map((r) => ({
    turmaId: r.turmaId,
    valor: Number(r.valor),
    turmaNome: r.turmaNome ?? "-",
    diaVencimento: r.diaVencimento ?? 10,
  }))
}

export async function getHistoricoAtleta(id: number) {
  const userId = await getGestaoUserId()
  const fichas = await db
    .select()
    .from(mensalidades)
    .where(and(eq(mensalidades.atletaId, id), eq(mensalidades.userId, userId)))
    .orderBy(desc(mensalidades.competencia))

  const chamadas = await db
    .select()
    .from(presencas)
    .where(and(eq(presencas.atletaId, id), eq(presencas.userId, userId)))
    .orderBy(desc(presencas.data))
    .limit(30)

  const [freq] = await db
    .select({
      total: sql<number>`count(*)`,
      presentes: sql<number>`count(*) filter (where ${presencas.status} in ('presente','atrasado'))`,
    })
    .from(presencas)
    .where(and(eq(presencas.atletaId, id), eq(presencas.userId, userId)))

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
async function salvarVinculos(userId: string, atletaId: number, vinculos: VinculoTurma[]) {
  await db
    .delete(atletaTurmas)
    .where(and(eq(atletaTurmas.atletaId, atletaId), eq(atletaTurmas.userId, userId)))
  if (vinculos.length > 0) {
    await db.insert(atletaTurmas).values(
      vinculos.map((v) => ({ userId, atletaId, turmaId: v.turmaId, valor: String(v.valor) })),
    )
  }
}

/** Cria o atleta, grava os vínculos de turma e gera as mensalidades (uma por turma). */
export async function createAtleta(formData: FormData) {
  const userId = await getGestaoUserId()
  const vinculos = parseVinculos(formData)
  const data = parseAtleta(formData, vinculos)

  const [novo] = await db
    .insert(atletas)
    .values({ ...data, userId, ativo: true })
    .returning({ id: atletas.id })
  await salvarVinculos(userId, novo.id, vinculos)

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
  const userId = await getGestaoUserId()
  const vinculos = parseVinculos(formData)
  const data = parseAtleta(formData, vinculos)
  await db.update(atletas).set(data).where(and(eq(atletas.id, id), eq(atletas.userId, userId)))
  await salvarVinculos(userId, id, vinculos)

  // Recalcula as parcelas pendentes (competência atual em diante) conforme os vínculos.
  await recalcularMensalidadesPendentes(userId, id)

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
async function recalcularMensalidadesPendentes(userId: string, atletaId: number) {
  const compAtual = competenciaAtual()
  await db
    .delete(mensalidades)
    .where(
      and(
        eq(mensalidades.userId, userId),
        eq(mensalidades.atletaId, atletaId),
        eq(mensalidades.status, "pendente"),
        gte(mensalidades.competencia, compAtual),
      ),
    )
  await sincronizarMensalidades()
}

/** Inativa/reativa preservando todo o histórico financeiro e de frequência. */
export async function toggleAtletaAtivo(id: number, ativo: boolean) {
  const userId = await getGestaoUserId()
  await db.update(atletas).set({ ativo }).where(and(eq(atletas.id, id), eq(atletas.userId, userId)))
  revalidatePath("/gestao/atletas")
  revalidatePath(`/gestao/atletas/${id}`)
  revalidatePath("/gestao")
}
