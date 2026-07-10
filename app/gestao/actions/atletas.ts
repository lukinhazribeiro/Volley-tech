"use server"

import { db } from "@/lib/gestao/db"
import { atletas, turmas, categorias, mensalidades, presencas } from "@/lib/gestao/db/schema"
import { calcularMensalidade, competenciaAtual, type DescontoTipo } from "@/lib/gestao/format"
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

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

function parseAtleta(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim()
  if (!nome) throw new Error("Nome é obrigatório")
  const categoriaIdRaw = String(formData.get("categoriaId") ?? "")
  const turmaIdRaw = String(formData.get("turmaId") ?? "")
  const descontoTipo = (String(formData.get("descontoTipo") ?? "nenhum") || "nenhum") as DescontoTipo
  const bolsista = descontoTipo !== "nenhum"
  return {
    nome,
    cpf: String(formData.get("cpf") ?? "").trim() || null,
    telefone: String(formData.get("telefone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    dataNascimento: String(formData.get("dataNascimento") ?? "").trim() || null,
    responsavel: String(formData.get("responsavel") ?? "").trim() || null,
    telefoneResponsavel: String(formData.get("telefoneResponsavel") ?? "").trim() || null,
    categoriaId: categoriaIdRaw ? Number(categoriaIdRaw) : null,
    turmaId: turmaIdRaw ? Number(turmaIdRaw) : null,
    valorMensalidade: String(Number(formData.get("valorMensalidade") ?? 0) || 0),
    descontoTipo,
    descontoValor: String(Number(formData.get("descontoValor") ?? 0) || 0),
    bolsista,
  }
}

/** Cria o atleta e automaticamente gera a ficha financeira do mês corrente. */
export async function createAtleta(formData: FormData) {
  const data = parseAtleta(formData)

  const [novo] = await db.insert(atletas).values(data).returning({ id: atletas.id })

  // Automação: gerar mensalidade (ficha financeira) da competência atual
  const { final } = calcularMensalidade(data.valorMensalidade, data.descontoTipo, data.descontoValor)
  if (final > 0 && data.turmaId) {
    const [t] = await db.select().from(turmas).where(eq(turmas.id, data.turmaId))
    const dia = t?.diaVencimento ?? 10
    const comp = competenciaAtual()
    const [ano, mes] = comp.split("-")
    const vencimento = `${ano}-${mes}-${String(dia).padStart(2, "0")}`
    await db.insert(mensalidades).values({
      atletaId: novo.id,
      turmaId: data.turmaId,
      competencia: comp,
      valor: String(final),
      dataVencimento: vencimento,
      status: "pendente",
    })
  }

  revalidatePath("/gestao/atletas")
  revalidatePath("/gestao")
  redirect(`/gestao/atletas/${novo.id}`)
}

export async function updateAtleta(id: number, formData: FormData) {
  const data = parseAtleta(formData)
  await db.update(atletas).set(data).where(eq(atletas.id, id))

  // Atualiza mensalidades ainda pendentes da competência atual para refletir o novo valor/bolsa
  const { final } = calcularMensalidade(data.valorMensalidade, data.descontoTipo, data.descontoValor)
  await db
    .update(mensalidades)
    .set({ valor: String(final) })
    .where(
      and(
        eq(mensalidades.atletaId, id),
        eq(mensalidades.competencia, competenciaAtual()),
        eq(mensalidades.status, "pendente"),
      ),
    )

  revalidatePath("/gestao/atletas")
  revalidatePath(`/gestao/atletas/${id}`)
  revalidatePath("/gestao")
  redirect(`/gestao/atletas/${id}`)
}

/** Inativa/reativa preservando todo o histórico financeiro e de frequência. */
export async function toggleAtletaAtivo(id: number, ativo: boolean) {
  await db.update(atletas).set({ ativo }).where(eq(atletas.id, id))
  revalidatePath("/gestao/atletas")
  revalidatePath(`/gestao/atletas/${id}`)
  revalidatePath("/gestao")
}
