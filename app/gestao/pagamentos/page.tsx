import { AppShell } from "@/components/gestao/app-shell"
import { FinanceiroTable } from "@/components/gestao/financeiro-table"
import { listMensalidades } from "@/app/actions/financeiro"

export const dynamic = "force-dynamic"

export default async function PagamentosPage() {
  const todas = await listMensalidades("todas")
  const pendentes = todas.filter((r) => r.status !== "pago")

  return (
    <AppShell title="Pagamentos" subtitle="Registre os pagamentos pendentes do clube">
      <p className="text-sm text-muted-foreground">
        {pendentes.length} mensalidade(s) aguardando pagamento.
      </p>
      <FinanceiroTable rows={pendentes} />
    </AppShell>
  )
}
