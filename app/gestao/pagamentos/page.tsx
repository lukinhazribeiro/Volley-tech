import { AppShell } from "@/components/gestao/app-shell"
import { FinanceiroTable } from "@/components/gestao/financeiro-table"
import { InadimplenciaPanel } from "@/components/gestao/inadimplencia-panel"
import { listMensalidades, inadimplenciaPorAtleta, resumoFinanceiro, sincronizarMensalidades } from "@/app/gestao/actions/financeiro"
import { brl } from "@/lib/gestao/format"
import { AlertTriangle, Clock, Wallet } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PagamentosPage() {
  await sincronizarMensalidades()
  const [todas, porAtleta, resumo] = await Promise.all([
    listMensalidades("todas"),
    inadimplenciaPorAtleta(),
    resumoFinanceiro(),
  ])
  const pendentes = todas.filter((r) => r.status !== "pago")
  const atrasadas = todas.filter((r) => r.status === "atrasado")
  const atletasEmAtraso = porAtleta.filter((a) => a.atrasadas > 0).length

  const cards = [
    {
      label: "Em atraso",
      valor: brl(atrasadas.reduce((s, r) => s + r.valor, 0)),
      sub: `${atrasadas.length} parcela(s) · ${atletasEmAtraso} atleta(s)`,
      icon: AlertTriangle,
      tone: "text-destructive",
      ring: "border-destructive/40 bg-destructive/5",
    },
    {
      label: "Aguardando",
      valor: brl(pendentes.reduce((s, r) => s + r.valor, 0)),
      sub: `${pendentes.length} mensalidade(s) em aberto`,
      icon: Clock,
      tone: "text-warning",
      ring: "border-warning/40 bg-warning/5",
    },
    {
      label: "Recebido",
      valor: brl(resumo.recebido),
      sub: `${resumo.pagos} de ${resumo.totalReg} quitada(s)`,
      icon: Wallet,
      tone: "text-success",
      ring: "border-success/40 bg-success/5",
    },
  ]

  return (
    <AppShell
      title="Pagamentos"
      subtitle="Acompanhe atrasos e confirme os pagamentos de cada atleta"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-2xl border p-4 ${c.ring}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {c.label}
              </span>
              <c.icon className={`h-4 w-4 ${c.tone}`} />
            </div>
            <p className={`mt-2 text-2xl font-extrabold ${c.tone}`}>{c.valor}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Situação por atleta
        </h2>
        <InadimplenciaPanel itens={porAtleta} />
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-base font-bold">Confirmar pagamentos</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          {pendentes.length} mensalidade(s) aguardando confirmação. Atrasos aparecem destacados.
        </p>
        <FinanceiroTable rows={pendentes} />
      </section>
    </AppShell>
  )
}
