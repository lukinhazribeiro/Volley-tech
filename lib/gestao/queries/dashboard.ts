import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

type Row = Record<string, any>

async function q<T = Row>(query: ReturnType<typeof sql>): Promise<T[]> {
  const res = await db.execute(query)
  // node-postgres driver returns { rows }
  return (res as unknown as { rows: T[] }).rows
}

export async function getIndicadores() {
  const rows = await q(sql`
    SELECT
      (SELECT count(*) FROM atletas) AS total_atletas,
      (SELECT count(*) FROM atletas WHERE ativo) AS ativos,
      (SELECT count(*) FROM atletas WHERE NOT ativo) AS inativos,
      (SELECT count(*) FROM presencas WHERE data = CURRENT_DATE AND status IN ('presente','atrasado')) AS presencas_hoje,
      (SELECT count(*) FROM presencas WHERE data = CURRENT_DATE) AS chamadas_hoje,
      (SELECT count(*) FROM presencas WHERE data = CURRENT_DATE AND status IN ('ausente','justificada')) AS ausencias_hoje,
      (SELECT coalesce(sum(valor),0) FROM mensalidades WHERE competencia = to_char(CURRENT_DATE,'YYYY-MM') AND status='pago') AS receita_recebida,
      (SELECT coalesce(sum(valor),0) FROM mensalidades WHERE competencia = to_char(CURRENT_DATE,'YYYY-MM') AND status IN ('pendente','atrasado')) AS receita_pendente,
      (SELECT coalesce(sum(valor),0) FROM mensalidades WHERE competencia = to_char(CURRENT_DATE,'YYYY-MM')) AS receita_prevista
  `)
  const r = rows[0]
  const total = Number(r.total_atletas)
  const chamadas = Number(r.chamadas_hoje) || 1
  const prevista = Number(r.receita_prevista) || 1
  return {
    totalAtletas: total,
    ativos: Number(r.ativos),
    inativos: Number(r.inativos),
    presencasHoje: Number(r.presencas_hoje),
    ausenciasHoje: Number(r.ausencias_hoje),
    percentualPresenca: Math.round((Number(r.presencas_hoje) / chamadas) * 100),
    percentualAusencia: Math.round((Number(r.ausencias_hoje) / chamadas) * 100),
    receitaRecebida: Number(r.receita_recebida),
    receitaPendente: Number(r.receita_pendente),
    receitaPrevista: Number(r.receita_prevista),
    percentualPago: Math.round((Number(r.receita_recebida) / prevista) * 100),
    percentualPendente: Math.round((Number(r.receita_pendente) / prevista) * 100),
    inadimplencia: Math.round((Number(r.receita_pendente) / prevista) * 100),
  }
}

export async function getPresencasSemana() {
  const rows = await q(sql`
    WITH dias AS (
      SELECT generate_series(CURRENT_DATE - INTERVAL '6 day', CURRENT_DATE, INTERVAL '1 day')::date AS dia
    )
    SELECT
      d.dia,
      coalesce(count(p.id) FILTER (WHERE p.status IN ('presente','atrasado')), 0) AS presentes,
      coalesce(count(p.id), 0) AS total
    FROM dias d
    LEFT JOIN presencas p ON p.data = d.dia
    GROUP BY d.dia
    ORDER BY d.dia
  `)
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
  return rows.map((r) => {
    const total = Number(r.total) || 0
    const presentes = Number(r.presentes) || 0
    const dia = new Date(r.dia)
    return {
      dia: labels[dia.getUTCDay()],
      percentual: total > 0 ? Math.round((presentes / total) * 100) : 0,
    }
  })
}

export async function getFrequenciaPorTurma() {
  const rows = await q(sql`
    SELECT
      t.nome,
      coalesce(round(100.0 * count(p.id) FILTER (WHERE p.status IN ('presente','atrasado')) / NULLIF(count(p.id),0)), 0) AS percentual
    FROM turmas t
    LEFT JOIN presencas p ON p.turma_id = t.id
    WHERE t.ativo
    GROUP BY t.id, t.nome
    ORDER BY percentual DESC
    LIMIT 6
  `)
  return rows.map((r) => ({ nome: r.nome as string, percentual: Number(r.percentual) }))
}

export async function getMensalidadesAtraso() {
  const rows = await q(sql`
    SELECT a.nome, t.nome AS turma, m.valor, m.data_vencimento,
      (CURRENT_DATE - m.data_vencimento) AS dias_atraso
    FROM mensalidades m
    JOIN atletas a ON a.id = m.atleta_id
    LEFT JOIN turmas t ON t.id = m.turma_id
    WHERE m.status IN ('atrasado','pendente') AND m.data_vencimento < CURRENT_DATE
    ORDER BY dias_atraso DESC
    LIMIT 6
  `)
  return rows.map((r) => ({
    nome: r.nome as string,
    turma: (r.turma as string) ?? "-",
    valor: Number(r.valor),
    vencimento: new Date(r.data_vencimento),
    diasAtraso: Number(r.dias_atraso),
  }))
}

export async function getProximosTreinos() {
  const rows = await q(sql`
    SELECT nome, horario, quadra FROM turmas WHERE ativo ORDER BY horario LIMIT 4
  `)
  return rows.map((r) => ({
    nome: r.nome as string,
    horario: (r.horario as string) ?? "",
    quadra: (r.quadra as string) ?? "",
  }))
}

export async function getAtletasPorCategoria() {
  const rows = await q(sql`
    SELECT c.nome, count(a.id) AS total
    FROM categorias c
    LEFT JOIN atletas a ON a.categoria_id = c.id
    GROUP BY c.id, c.nome
    ORDER BY c.id
  `)
  return rows.map((r) => ({ nome: r.nome as string, total: Number(r.total) }))
}

export async function getSerieMensal() {
  // Receita, frequência e inadimplência por competência (últimos 6 meses de dados)
  const receita = await q(sql`
    SELECT competencia,
      coalesce(sum(valor) FILTER (WHERE status='pago'),0) AS recebido,
      coalesce(round(100.0 * sum(valor) FILTER (WHERE status IN ('pendente','atrasado')) / NULLIF(sum(valor),0)),0) AS inadimplencia
    FROM mensalidades
    GROUP BY competencia
    ORDER BY competencia
  `)
  const freq = await q(sql`
    SELECT to_char(data,'YYYY-MM') AS mes,
      coalesce(round(100.0 * count(*) FILTER (WHERE status IN ('presente','atrasado')) / NULLIF(count(*),0)),0) AS percentual
    FROM presencas
    GROUP BY mes
    ORDER BY mes
  `)
  return {
    receita: receita.map((r) => ({ mes: mesLabel(r.competencia), recebido: Number(r.recebido) })),
    inadimplencia: receita.map((r) => ({ mes: mesLabel(r.competencia), valor: Number(r.inadimplencia) })),
    frequencia: freq.map((r) => ({ mes: mesLabel(r.mes), valor: Number(r.percentual) })),
  }
}

function mesLabel(competencia: string) {
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  const [, m] = competencia.split("-")
  return meses[Number(m) - 1] ?? competencia
}
