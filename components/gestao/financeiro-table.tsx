import { brl, formatDate } from "@/lib/format"
import { MensalidadeActions } from "@/components/gestao/mensalidade-actions"

type Row = {
  id: number
  atletaNome: string | null
  turmaNome: string | null
  competencia: string
  valor: number
  dataVencimento: string | null
  dataPagamento: string | null
  status: string
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pago: "bg-success/15 text-success",
    pendente: "bg-warning/15 text-warning",
    atrasado: "bg-destructive/15 text-destructive",
  }
  const label: Record<string, string> = { pago: "Pago", pendente: "Pendente", atrasado: "Em atraso" }
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {label[status] ?? status}
    </span>
  )
}

export function FinanceiroTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
        Nenhuma mensalidade encontrada. As fichas são geradas automaticamente ao cadastrar atletas.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-semibold">Atleta</th>
              <th className="px-5 py-3 font-semibold">Competência</th>
              <th className="px-5 py-3 font-semibold">Vencimento</th>
              <th className="px-5 py-3 font-semibold">Valor</th>
              <th className="px-5 py-3 font-semibold">Situação</th>
              <th className="px-5 py-3 text-right font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-secondary/40">
                <td className="px-5 py-3">
                  <span className="block font-medium">{r.atletaNome ?? "—"}</span>
                  <span className="block text-xs text-muted-foreground">{r.turmaNome ?? "—"}</span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{r.competencia}</td>
                <td className="px-5 py-3 text-muted-foreground">{formatDate(r.dataVencimento)}</td>
                <td className="px-5 py-3 font-semibold">{brl(r.valor)}</td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-3 text-right">
                  <MensalidadeActions id={r.id} pago={r.status === "pago"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
