"use server"

import { db } from "@/lib/gestao/db"
import { atletas, mensalidades, turmas } from "@/lib/gestao/db/schema"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function listMensalidades(filtro?: "todas" | "pendente" | "pago" | "atrasado") {
  const rows = await db
    .select({
      id: mensalidades.id,
      atletaId: mensalidades.atletaId,
      atletaNome: atletas.nome,
      turmaNome: turmas.nome,
      competencia: mensalidades.competencia,
      valor: mensalidades.valor,
      desconto: mensalidades.desconto,
      dataVencimento: mensalidades.dataVencimento,
      dataPagamento: mensalidades.dataPagamento,
      status: mensalidades.status,
    })
    .from(mensalidades)
    .leftJoin(atletas, eq(mensalidades.atletaId, atletas.id))
    .leftJoin(turmas, eq(mensalidades.turmaId, turmas.id))
    .orderBy(desc(mensalidades.dataVencimento))

  const hoje = new Date().toISOString().slice(0, 10)
  const norm = rows.map((r) => ({
    ...r,
    valor: Number(r.valor),
    desconto: Number(r.desconto),
    status:
      r.status === "pendente" && r.dataVencimento && r.dataVencimento < hoje ? "atrasado" : r.status,
  }))

  if (!filtro || filtro === "todas") return norm
  return norm.filter((r) => r.status === filtro)
}

export async function registrarPagamento(id: number) {
  const hoje = new Date().toISOString().slice(0, 10)
  await db
    .update(mensalidades)
    .set({ status: "pago", dataPagamento: hoje })
    .where(eq(mensalidades.id, id))
  revalidatePath("/gestao/financeiro")
  revalidatePath("/gestao/pagamentos")
  revalidatePath("/gestao")
  return { ok: true }
}

export async function reabrirMensalidade(id: number) {
  await db
    .update(mensalidades)
    .set({ status: "pendente", dataPagamento: null })
    .where(eq(mensalidades.id, id))
  revalidatePath("/gestao/financeiro")
  revalidatePath("/gestao/pagamentos")
  revalidatePath("/gestao")
  return { ok: true }
}

/** Agrupa as mensalidades em aberto por atleta, destacando os atrasos. */
export async function inadimplenciaPorAtleta() {
  const rows = await listMensalidades("todas")
  const hoje = new Date()

  const mapa = new Map<
    number,
    {
      atletaId: number
      atletaNome: string
      turmaNome: string | null
      pendentes: number
      atrasadas: number
      totalDevido: number
      maiorAtrasoDias: number
      vencimentoMaisAntigo: string | null
    }
  >()

  for (const r of rows) {
    if (r.status === "pago") continue
    const atrasada = r.status === "atrasado"
    const dias =
      atrasada && r.dataVencimento
        ? Math.max(0, Math.floor((hoje.getTime() - new Date(r.dataVencimento).getTime()) / 86400000))
        : 0
    const atual = mapa.get(r.atletaId) ?? {
      atletaId: r.atletaId,
      atletaNome: r.atletaNome ?? "—",
      turmaNome: r.turmaNome,
      pendentes: 0,
      atrasadas: 0,
      totalDevido: 0,
      maiorAtrasoDias: 0,
      vencimentoMaisAntigo: null as string | null,
    }
    atual.pendentes += 1
    if (atrasada) atual.atrasadas += 1
    atual.totalDevido += r.valor
    atual.maiorAtrasoDias = Math.max(atual.maiorAtrasoDias, dias)
    if (
      r.dataVencimento &&
      (!atual.vencimentoMaisAntigo || r.dataVencimento < atual.vencimentoMaisAntigo)
    ) {
      atual.vencimentoMaisAntigo = r.dataVencimento
    }
    mapa.set(r.atletaId, atual)
  }

  // Ordena: quem tem mais atraso primeiro, depois maior valor devido
  return Array.from(mapa.values()).sort(
    (a, b) => b.maiorAtrasoDias - a.maiorAtrasoDias || b.totalDevido - a.totalDevido,
  )
}

export async function resumoFinanceiro() {
  const [row] = await db
    .select({
      recebido: sql<number>`coalesce(sum(case when ${mensalidades.status} = 'pago' then ${mensalidades.valor} else 0 end), 0)`,
      pendente: sql<number>`coalesce(sum(case when ${mensalidades.status} <> 'pago' then ${mensalidades.valor} else 0 end), 0)`,
      totalReg: sql<number>`count(*)`,
      pagos: sql<number>`sum(case when ${mensalidades.status} = 'pago' then 1 else 0 end)`,
    })
    .from(mensalidades)

  return {
    recebido: Number(row?.recebido ?? 0),
    pendente: Number(row?.pendente ?? 0),
    totalReg: Number(row?.totalReg ?? 0),
    pagos: Number(row?.pagos ?? 0),
  }
}
