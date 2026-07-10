import Link from "next/link"
import { AppShell } from "@/components/gestao/app-shell"
import { FinanceiroTable } from "@/components/gestao/financeiro-table"
import { listMensalidades, resumoFinanceiro } from "@/app/actions/financeiro"
import { brl } from "@/lib/format"
import { Wallet, TrendingUp, AlertCircle } from "lucide-react"

export const dynamic = "force-dynamic"

const filtros = [
  { key: "todas", label: "Todas" },
  { key: "pendente", label: "Pendentes" },
  { key: "atrasado", label: "Em atraso" },
  { key: "pago", label: "Pagas" },
] as const

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>
}) {
  const { f } = await searchParams
  const filtro = (["todas", "pendente", "pago", "atrasado"].includes(f ?? "") ? f : "todas") as any
  const [rows, resumo] = await Promise.all([listMensalidades(filtro), resumoFinanceiro()])

  return (
    <AppShell title="Financeiro" subtitle="Mensalidades, pagamentos e inadimplência">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4 text-success" /> Recebido</div>
          <p className="mt-1 text-2xl font-bold text-success">{brl(resumo.recebido)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4 text-warning" /> Pendente</div>
          <p className="mt-1 text-2xl font-bold text-warning">{brl(resumo.pendente)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertCircle className="h-4 w-4 text-primary" /> Registros</div>
          <p className="mt-1 text-2xl font-bold">{resumo.pagos}/{resumo.totalReg} pagos</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filtros.map((item) => (
          <Link
            key={item.key}
            href={`/financeiro?f=${item.key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filtro === item.key
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <FinanceiroTable rows={rows} />
    </AppShell>
  )
}
