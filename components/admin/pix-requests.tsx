"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { formatPrice } from "@/lib/subscription"
import { Check, X, FileText, Clock, Loader2, Inbox } from "lucide-react"

interface PixPaymentRow {
  id: string
  email: string
  amount: number
  status: "pending" | "approved" | "rejected"
  receipt_pathname: string | null
  receipt_content_type: string | null
  note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Falha ao carregar")
    return r.json()
  })

export function PixRequests() {
  const { data, isLoading, mutate } = useSWR<{ payments: PixPaymentRow[] }>(
    "/api/admin/pix",
    fetcher,
    { refreshInterval: 30000 },
  )
  const [busyId, setBusyId] = useState<string | null>(null)

  const payments = useMemo(() => data?.payments ?? [], [data])
  const pending = payments.filter((p) => p.status === "pending")
  const history = payments.filter((p) => p.status !== "pending")

  async function review(paymentId: string, action: "approve" | "reject") {
    setBusyId(paymentId)
    try {
      const res = await fetch("/api/admin/pix/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, action }),
      })
      if (!res.ok) throw new Error()
      mutate()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-bold text-slate-900">Pagamentos via Pix</h2>
        {pending.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            {pending.length} aguardando
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isLoading && (
          <p className="px-4 py-10 text-center text-sm text-slate-400">Carregando...</p>
        )}

        {!isLoading && payments.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-slate-400">
            <Inbox className="h-8 w-8" />
            <p className="text-sm">Nenhum pagamento via Pix recebido ainda.</p>
          </div>
        )}

        {pending.map((p) => (
          <div key={p.id} className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-slate-800">{p.email}</span>
                <span className="text-sm text-slate-500">· {formatPrice(Number(p.amount))}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">Enviado em {fmtDateTime(p.created_at)}</p>
              {p.note && <p className="mt-1 text-sm text-slate-600">&ldquo;{p.note}&rdquo;</p>}
              {p.receipt_pathname && (
                <a
                  href={`/api/admin/pix/receipt?pathname=${encodeURIComponent(p.receipt_pathname)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  Ver comprovante
                </a>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => review(p.id, "approve")}
                disabled={busyId === p.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {busyId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Aprovar
              </button>
              <button
                onClick={() => review(p.id, "reject")}
                disabled={busyId === p.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <X className="h-4 w-4" />
                Rejeitar
              </button>
            </div>
          </div>
        ))}

        {history.length > 0 && (
          <div className="divide-y divide-slate-100">
            {history.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-slate-700">{p.email}</span>
                  <span className="ml-2 text-xs text-slate-400">{fmtDateTime(p.created_at)}</span>
                </div>
                <div className="flex items-center gap-3">
                  {p.receipt_pathname && (
                    <a
                      href={`/api/admin/pix/receipt?pathname=${encodeURIComponent(p.receipt_pathname)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-slate-500 hover:text-orange-600 hover:underline"
                    >
                      comprovante
                    </a>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      p.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {p.status === "approved" ? "Aprovado" : "Rejeitado"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function fmtDateTime(value: string): string {
  const d = new Date(value)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
