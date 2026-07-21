"use server"

import { db } from "@/lib/gestao/db"
import { atletas, despesas, mensalidades, turmas } from "@/lib/gestao/db/schema"
import { getGestaoUserId } from "@/lib/gestao/auth"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

/**
 * Garante que exista uma mensalidade por mês PARA CADA TURMA do atleta ativo,
 * da data de inscrição até 3 meses à frente do mês atual (previsão de receita).
 *
 * O desconto/bolsa do atleta é aplicado sobre o total das turmas e distribuído
 * proporcionalmente ao valor de cada turma, de modo que a soma das parcelas do mês
 * seja igual ao valor final com desconto. Idempotente: nunca duplica (atleta,turma,competência)
 * já existentes e nunca altera pagamentos. Deve ser chamada ao abrir as telas financeiras.
 */
export async function sincronizarMensalidades() {
  const userId = await getGestaoUserId()
  await db.execute(sql`
    WITH totais AS (
      SELECT at.atleta_id, sum(at.valor) AS total_turmas
      FROM atleta_turmas at
      WHERE at.user_id = ${userId}
      GROUP BY at.atleta_id
    )
    INSERT INTO mensalidades (user_id, atleta_id, turma_id, competencia, valor, data_vencimento, status)
    SELECT
      a.user_id,
      a.id,
      at.turma_id,
      to_char(m, 'YYYY-MM') AS competencia,
      -- valor da turma menos a fatia proporcional do desconto do atleta
      round(
        GREATEST(0,
          at.valor - (
            CASE a.desconto_tipo
              WHEN 'percentual' THEN at.valor * LEAST(GREATEST(a.desconto_valor, 0), 100) / 100.0
              WHEN 'valor' THEN
                CASE WHEN tot.total_turmas > 0
                  THEN LEAST(a.desconto_valor, tot.total_turmas) * (at.valor / tot.total_turmas)
                  ELSE 0 END
              ELSE 0
            END
          )
        ), 2) AS valor,
      (to_char(m, 'YYYY-MM') || '-' ||
        lpad(LEAST(GREATEST(COALESCE(t.dia_vencimento, EXTRACT(DAY FROM COALESCE(a.data_inscricao, a.created_at::date))::int), 1), 28)::text, 2, '0')
      )::date AS data_vencimento,
      'pendente'
    FROM atletas a
    JOIN atleta_turmas at ON at.atleta_id = a.id
    JOIN totais tot ON tot.atleta_id = a.id
    LEFT JOIN turmas t ON t.id = at.turma_id
    CROSS JOIN LATERAL generate_series(
      date_trunc('month', COALESCE(a.data_inscricao, a.created_at::date)),
      date_trunc('month', now()) + interval '3 months',
      interval '1 month'
    ) AS m
    WHERE a.ativo = true
      AND a.user_id = ${userId}
      AND at.valor > 0
      AND NOT EXISTS (
        SELECT 1 FROM mensalidades me
        WHERE me.atleta_id = a.id
          AND me.turma_id IS NOT DISTINCT FROM at.turma_id
          AND me.competencia = to_char(m, 'YYYY-MM')
      )
  `)
}

export async function listMensalidades(filtro?: "todas" | "pendente" | "pago" | "atrasado") {
  const userId = await getGestaoUserId()
  const rows = await db
    .select({
      id: mensalidades.id,
      atletaId: mensalidades.atletaId,
      atletaNome: atletas.nome,
      atletaTelefone: atletas.telefone,
      telefoneResponsavel: atletas.telefoneResponsavel,
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
    .where(eq(mensalidades.userId, userId))
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
  const userId = await getGestaoUserId()
  const hoje = new Date().toISOString().slice(0, 10)
  await db
    .update(mensalidades)
    .set({ status: "pago", dataPagamento: hoje })
    .where(and(eq(mensalidades.id, id), eq(mensalidades.userId, userId)))
  revalidatePath("/gestao/financeiro")
  revalidatePath("/gestao/pagamentos")
  revalidatePath("/gestao")
  return { ok: true }
}

export async function reabrirMensalidade(id: number) {
  const userId = await getGestaoUserId()
  await db
    .update(mensalidades)
    .set({ status: "pendente", dataPagamento: null })
    .where(and(eq(mensalidades.id, id), eq(mensalidades.userId, userId)))
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
      atletaTelefone: string | null
      telefoneResponsavel: string | null
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
      atletaTelefone: r.atletaTelefone ?? null,
      telefoneResponsavel: r.telefoneResponsavel ?? null,
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
  const userId = await getGestaoUserId()
  const [row] = await db
    .select({
      recebido: sql<number>`coalesce(sum(case when ${mensalidades.status} = 'pago' then ${mensalidades.valor} else 0 end), 0)`,
      pendente: sql<number>`coalesce(sum(case when ${mensalidades.status} <> 'pago' then ${mensalidades.valor} else 0 end), 0)`,
      totalReg: sql<number>`count(*)`,
      pagos: sql<number>`sum(case when ${mensalidades.status} = 'pago' then 1 else 0 end)`,
    })
    .from(mensalidades)
    .where(eq(mensalidades.userId, userId))

  return {
    recebido: Number(row?.recebido ?? 0),
    pendente: Number(row?.pendente ?? 0),
    totalReg: Number(row?.totalReg ?? 0),
    pagos: Number(row?.pagos ?? 0),
  }
}

/** Anos-calendário que têm receita (mensalidade paga) OU despesa registrada. */
export async function anosComMovimento() {
  const userId = await getGestaoUserId()
  const rec = await db
    .select({ ano: sql<string>`extract(year from ${mensalidades.dataPagamento})::text` })
    .from(mensalidades)
    .where(and(eq(mensalidades.userId, userId), eq(mensalidades.status, "pago")))
    .groupBy(sql`extract(year from ${mensalidades.dataPagamento})`)
  const desp = await db
    .select({ ano: sql<string>`extract(year from ${despesas.data})::text` })
    .from(despesas)
    .where(eq(despesas.userId, userId))
    .groupBy(sql`extract(year from ${despesas.data})`)

  const anos = new Set<number>()
  for (const r of rec) if (r.ano) anos.add(Number(r.ano))
  for (const d of desp) if (d.ano) anos.add(Number(d.ano))
  anos.add(new Date().getFullYear())
  return Array.from(anos).sort((a, b) => b - a)
}

/**
 * Balanço financeiro anual (regime de caixa) para declaração de imposto de renda.
 * Considera receitas pela DATA DE PAGAMENTO das mensalidades e as despesas manuais.
 * Retorna o consolidado por mês, o total do ano, a receita por turma e as
 * despesas por categoria.
 */
export async function balancoAnual(ano: number) {
  const userId = await getGestaoUserId()

  // Receitas por mês (mensalidades pagas no ano-calendário).
  const receitaMes = await db
    .select({
      mes: sql<string>`to_char(${mensalidades.dataPagamento}, 'MM')`,
      total: sql<number>`coalesce(sum(${mensalidades.valor}), 0)`,
    })
    .from(mensalidades)
    .where(
      and(
        eq(mensalidades.userId, userId),
        eq(mensalidades.status, "pago"),
        sql`extract(year from ${mensalidades.dataPagamento}) = ${ano}`,
      ),
    )
    .groupBy(sql`to_char(${mensalidades.dataPagamento}, 'MM')`)

  // Despesas por mês.
  const despesaMes = await db
    .select({
      mes: sql<string>`to_char(${despesas.data}, 'MM')`,
      total: sql<number>`coalesce(sum(${despesas.valor}), 0)`,
    })
    .from(despesas)
    .where(and(eq(despesas.userId, userId), sql`extract(year from ${despesas.data}) = ${ano}`))
    .groupBy(sql`to_char(${despesas.data}, 'MM')`)

  // Receita por turma no ano.
  const receitaTurma = await db
    .select({
      turmaNome: turmas.nome,
      total: sql<number>`coalesce(sum(${mensalidades.valor}), 0)`,
    })
    .from(mensalidades)
    .leftJoin(turmas, eq(turmas.id, mensalidades.turmaId))
    .where(
      and(
        eq(mensalidades.userId, userId),
        eq(mensalidades.status, "pago"),
        sql`extract(year from ${mensalidades.dataPagamento}) = ${ano}`,
      ),
    )
    .groupBy(turmas.nome)
    .orderBy(desc(sql`coalesce(sum(${mensalidades.valor}), 0)`))

  // Despesas por categoria no ano.
  const despesaCategoria = await db
    .select({
      categoria: despesas.categoria,
      total: sql<number>`coalesce(sum(${despesas.valor}), 0)`,
    })
    .from(despesas)
    .where(and(eq(despesas.userId, userId), sql`extract(year from ${despesas.data}) = ${ano}`))
    .groupBy(despesas.categoria)
    .orderBy(desc(sql`coalesce(sum(${despesas.valor}), 0)`))

  const recMap = new Map(receitaMes.map((r) => [r.mes, Number(r.total)]))
  const despMap = new Map(despesaMes.map((r) => [r.mes, Number(r.total)]))

  const meses = Array.from({ length: 12 }, (_, i) => {
    const mm = String(i + 1).padStart(2, "0")
    const receita = recMap.get(mm) ?? 0
    const despesa = despMap.get(mm) ?? 0
    return { mes: i + 1, receita, despesa, resultado: receita - despesa }
  })

  const totalReceita = meses.reduce((s, m) => s + m.receita, 0)
  const totalDespesa = meses.reduce((s, m) => s + m.despesa, 0)

  return {
    ano,
    meses,
    totalReceita,
    totalDespesa,
    resultado: totalReceita - totalDespesa,
    receitaPorTurma: receitaTurma.map((r) => ({
      turmaNome: r.turmaNome ?? "Sem turma",
      total: Number(r.total),
    })),
    despesaPorCategoria: despesaCategoria.map((r) => ({
      categoria: r.categoria,
      total: Number(r.total),
    })),
  }
}
