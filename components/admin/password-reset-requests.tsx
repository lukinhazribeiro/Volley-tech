"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Check, X, Clock, Loader2, Inbox, KeyRound } from "lucide-react"

interface ResetRequestRow {
  id: string
  email: string
  message: string | null
  status: "pending" | "authorized" | "denied" | "used"
  createdAt: string
  authorizedAt: string | null
  authorizedExpiresAt: string | null
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Falha ao carregar")
    return r.json()
  })

/**
 * Pedidos de troca de senha para o administrador autorizar.
 *
 * Autorizar NÃO define a senha: apenas libera o cliente que pediu a criar a
 * nova senha no próprio dispositivo, dentro do prazo.
 */
export function PasswordResetRequests() {
  const { data, isLoading, mutate } = useSWR<{ requests: ResetRequestRow[] }>(
    "/api/admin/password-resets",
    fetcher,
    { refreshInterval: 15000 },
  )
  const [busyId, setBusyId] = useState<string | null>(null)

  const requests = useMemo(() => data?.requests ?? [], [data])
  const pending = requests.filter((r) => r.status === "pending")
  const history = requests.filter((r) => r.status !== "pending")

  async function review(requestId: string, action: "approve" | "deny") {
    setBusyId(requestId)
    try {
      const res = await fetch("/api/admin/password-resets/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
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
        <KeyRound className="h-5 w-5 text-slate-500" aria-hidden="true" />
        <h2 className="text-lg font-bold text-slate-900">Pedidos de troca de senha</h2>
        {pending.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            {pending.length} aguardando
          </span>
        )}
      </div>

      <p className="mb-3 text-sm text-slate-500">
        Confirme por telefone ou mensagem que o pedido é realmente do cliente antes de autorizar.
        Ao autorizar, ele mesmo cria a nova senha — você nunca precisa saber a senha dele.
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isLoading && <p className="px-4 py-10 text-center text-sm text-slate-400">Carregando...</p>}

        {!isLoading && requests.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-slate-400">
            <Inbox className="h-8 w-8" />
            <p className="text-sm">Nenhum pedido de troca de senha até agora.</p>
          </div>
        )}

        {pending.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                <span className="font-medium text-slate-800">{r.email}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Solicitado em {fmtDateTime(r.createdAt)}
              </p>
              {r.message && <p className="mt-1 text-sm text-slate-600">&ldquo;{r.message}&rdquo;</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => review(r.id, "approve")}
                disabled={busyId === r.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {busyId === r.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Autorizar
              </button>
              <button
                onClick={() => review(r.id, "deny")}
                disabled={busyId === r.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <X className="h-4 w-4" />
                Recusar
              </button>
            </div>
          </div>
        ))}

        {history.length > 0 && (
          <div className="divide-y divide-slate-100">
            {history.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-slate-700">{r.email}</span>
                  <span className="ml-2 text-xs text-slate-400">{fmtDateTime(r.createdAt)}</span>
                </div>
                <StatusBadge status={r.status} expiresAt={r.authorizedExpiresAt} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function StatusBadge({
  status,
  expiresAt,
}: {
  status: ResetRequestRow["status"]
  expiresAt: string | null
}) {
  // Autorizado mas com prazo vencido: o cliente precisa pedir de novo.
  const expired =
    status === "authorized" && expiresAt !== null && new Date(expiresAt).getTime() < Date.now()

  const map: Record<string, { label: string; cls: string }> = {
    authorized: expired
      ? { label: "Autorização expirada", cls: "bg-slate-100 text-slate-500" }
      : { label: "Aguardando o cliente", cls: "bg-blue-100 text-blue-700" },
    denied: { label: "Recusado", cls: "bg-red-100 text-red-700" },
    used: { label: "Senha alterada", cls: "bg-emerald-100 text-emerald-700" },
  }
  const item = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" }
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.cls}`}>
      {item.label}
    </span>
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
