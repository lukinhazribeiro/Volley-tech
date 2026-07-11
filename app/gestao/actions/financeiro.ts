"use server"

import { db } from "@/lib/gestao/db"
import { atletas, mensalidades, turmas } from "@/lib/gestao/db/schema"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

/**
 * Garante que exista uma mensalidade por mês para cada atleta ativo,
 * da data de inscrição até o mês atual. Idempotente: nunca duplica
 * competências já existentes e nunca altera pagamentos. Deve ser chamada
 * ao abrir as telas financeiras para manter o histórico e a previsão sempre completos.
 */
export async function sincronizarMensalidades() {
  await db.execute(sql`
    INSERT INTO mensalidades (atleta_id, turma_id, competencia, valor, data_vencimento, status)
    SELECT
      a.id,
      a.turma_id,
      to_char(m, 'YYYY-MM') AS competencia,
      round(
        CASE a.desconto_tipo
          WHEN 'percentual' THEN a.valor_mensalidade * (1 - LEAST(GREATEST(a.desconto_valor, 0), 100) / 100.0)
          WHEN 'valor' THEN GREATEST(0, a.valor_mensalidade - a.desconto_valor)
          ELSE a.valor_mensalidade
        END, 2) AS valor,
      (to_char(m, 'YYYY-MM') || '-' ||
        lpad(LEAST(GREATEST(COALESCE(t.dia_vencimento, EXTRACT(DAY FROM COALESCE(a.data_inscricao, a.created_at::date))::int), 1), 28)::text, 2, '0')
      )::date AS data_vencimento,
      'pendente'
    FROM atletas a
    LEFT JOIN turmas t ON t.id = a.turma_id
    CROSS JOIN LATERAL generate_series(
      date_trunc('month', COALESCE(a.data_inscricao, a.created_at::date)),
      date_trunc('month', now()),
      interval '1 month'
    ) AS m
    WHERE a.ativo = true
      AND (
        CASE a.desconto_tipo
          WHEN 'percentual' THEN a.valor_mensalidade * (1 - LEAST(GREATEST(a.desconto_valor, 0), 100) / 100.0)
          WHEN 'valor' THEN GREATEST(0, a.valor_mensalidade - a.desconto_valor)
          ELSE a.valor_mensalidade
        END
      ) > 0
      AND NOT EXISTS (
        SELECT 1 FROM mensalidades me
        WHERE me.atleta_id = a.id AND me.competencia = to_char(m, 'YYYY-MM')
      )
  `)
}

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
