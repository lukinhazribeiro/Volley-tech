"use client"

import { registrarPagamento, reabrirMensalidade } from "@/app/actions/financeiro"
import { Check, RotateCcw, Loader2 } from "lucide-react"
import { useTransition } from "react"

export function MensalidadeActions({ id, pago }: { id: number; pago: boolean }) {
  const [pending, start] = useTransition()

  return pago ? (
    <button
      onClick={() => start(() => reabrirMensalidade(id).then(() => {}))}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
      Reabrir
    </button>
  ) : (
    <button
      onClick={() => start(() => registrarPagamento(id).then(() => {}))}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--success)] px-3 py-1.5 text-xs font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      Registrar pagamento
    </button>
  )
}
