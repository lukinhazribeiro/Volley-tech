import Link from "next/link"
import { AlertTriangle, Clock, CheckCircle2, ChevronRight, MessageCircle } from "lucide-react"
import { brl, formatDate, linkCobrancaWhatsapp } from "@/lib/gestao/format"

type Item = {
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

export function InadimplenciaPanel({ itens }: { itens: Item[] }) {
  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-success/30 bg-success/5 py-14 text-center">
        <CheckCircle2 className="mb-3 h-10 w-10 text-success" />
        <p className="text-base font-semibold text-foreground">Nenhuma pendência</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas as mensalidades estão em dia. Bom trabalho!
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {itens.map((a) => {
        const emAtraso = a.atrasadas > 0
        const telefone = a.atletaTelefone || a.telefoneResponsavel
        const linkWhats = linkCobrancaWhatsapp({
          telefone,
          nome: a.atletaNome,
          totalDevido: a.totalDevido,
          parcelasAtrasadas: a.atrasadas || a.pendentes,
        })
        return (
          <div
            key={a.atletaId}
            className={`group relative flex flex-col gap-3 rounded-2xl border p-4 shadow-lg shadow-black/20 ${
              emAtraso ? "border-destructive/50 bg-destructive/5" : "border-border bg-card"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold leading-tight">{a.atletaNome}</p>
                <p className="text-xs text-muted-foreground">{a.turmaNome ?? "Sem turma"}</p>
              </div>
              {emAtraso ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" /> Em atraso
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-semibold text-warning">
                  <Clock className="h-3.5 w-3.5" /> Pendente
                </span>
              )}
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total devido</p>
                <p className="text-xl font-extrabold text-foreground">{brl(a.totalDevido)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Parcelas</p>
                <p className="text-sm font-semibold">
                  {a.pendentes} aberta(s)
                  {a.atrasadas > 0 && (
                    <span className="text-destructive"> · {a.atrasadas} atrasada(s)</span>
                  )}
                </p>
              </div>
            </div>

            <div className="border-t border-border/60 pt-2 text-xs text-muted-foreground">
              <span>
                {emAtraso
                  ? `${a.maiorAtrasoDias} dia(s) de atraso`
                  : `Vence em ${formatDate(a.vencimentoMaisAntigo)}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {linkWhats ? (
                <a
                  href={linkWhats}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success/15 px-3 py-2 text-xs font-semibold text-success transition-colors hover:bg-success/25"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Cobrar no WhatsApp
                </a>
              ) : (
                <span
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground"
                  title="Cadastre o telefone do atleta ou do responsável"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Sem telefone
                </span>
              )}
              <Link
                href={`/gestao/atletas/${a.atletaId}`}
                className="flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-secondary"
              >
                Confirmar <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
