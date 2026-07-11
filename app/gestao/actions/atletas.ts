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
    dataInscricao: String(formData.get("dataInscricao") ?? "").trim() || null,
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

  // Automação: gerar TODAS as mensalidades desde a data de inscrição até o mês atual,
  // para que o histórico fique completo (competências passadas em aberto aparecem como atraso).
  // O valor considera o desconto/bolsa do próprio atleta (independe de ter turma).
  const { final } = calcularMensalidade(data.valorMensalidade, data.descontoTipo, data.descontoValor)
  if (final > 0) {
    // dia de vencimento: usa o da turma quando houver, senão o dia da inscrição
    let dia = 10
    if (data.turmaId) {
      const [t] = await db.select().from(turmas).where(eq(turmas.id, data.turmaId))
      dia = t?.diaVencimento ?? 10
    } else if (data.dataInscricao) {
      dia = Number(data.dataInscricao.split("-")[2]) || 10
    }
    const diaStr = String(Math.min(Math.max(dia, 1), 28)).padStart(2, "0")

    // ponto de partida: mês da inscrição (ou mês atual, se não informado)
    const inicio = data.dataInscricao ? data.dataInscricao.slice(0, 7) : competenciaAtual()
    const [anoIni, mesIni] = inicio.split("-").map(Number)
    const atual = competenciaAtual()
    const [anoAtual, mesAtual] = atual.split("-").map(Number)

    const fichas: (typeof mensalidades.$inferInsert)[] = []
    let ano = anoIni
    let mes = mesIni
    // gera mês a mês, inclusivo, até a competência atual (limite de segurança de 240 meses)
    for (let i = 0; i < 240; i++) {
      const comp = `${ano}-${String(mes).padStart(2, "0")}`
      fichas.push({
        atletaId: novo.id,
        turmaId: data.turmaId,
        competencia: comp,
        valor: String(final),
        dataVencimento: `${comp}-${diaStr}`,
        status: "pendente",
      })
      if (ano === anoAtual && mes === mesAtual) break
      if (ano > anoAtual || (ano === anoAtual && mes > mesAtual)) break
      mes += 1
      if (mes > 12) {
        mes = 1
        ano += 1
      }
    }

    if (fichas.length > 0) {
      await db.insert(mensalidades).values(fichas)
    }
  }

  revalidatePath("/gestao/atletas")
  revalidatePath("/gestao/pagamentos")
  revalidatePath("/gestao/financeiro")
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
