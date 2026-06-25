"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import {
  Users,
  Clock,
  XCircle,
  CreditCard,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Plug,
  CheckCircle2,
  Loader2,
  Ban,
} from "lucide-react"
import { formatPrice, PLAN_NAME, type SubscriptionStatus } from "@/lib/subscription"
import { PixRequests } from "@/components/admin/pix-requests"

interface AdminSubscription {
  id: string
  email: string
  status: SubscriptionStatus
  plan_amount: number
  trial_start: string
  trial_end: string
  current_period_end: string | null
  mp_preapproval_id: string | null
  last_payment_status: string | null
  last_payment_amount: number | null
  last_payment_at: string | null
  canceled_at: string | null
  created_at: string
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Falha ao carregar dados")
    return r.json()
  })

type FilterKey = "all" | "active" | "trialing" | "rejected" | "canceled"

export function AdminDashboard({ adminEmail, testMode }: { adminEmail: string; testMode: boolean }) {
  const { data, error, isLoading, mutate } = useSWR<{ subscriptions: AdminSubscription[] }>(
    "/api/admin/subscriptions",
    fetcher,
    { refreshInterval: 30000 },
  )
  const [filter, setFilter] = useState<FilterKey>("all")

  const [mpTesting, setMpTesting] = useState(false)
  const [mpResult, setMpResult] = useState<{
    ok: boolean
    checks: { label: string; ok: boolean; detail: string }[]
  } | null>(null)

  async function testMpConnection() {
    setMpTesting(true)
    setMpResult(null)
    try {
      const res = await fetch("/api/admin/mp-test")
      const json = await res.json()
      setMpResult(json)
    } catch {
      setMpResult({
        ok: false,
        checks: [{ label: "Conexão", ok: false, detail: "Não foi possível testar a conexão." }],
      })
    } finally {
      setMpTesting(false)
    }
  }

  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function toggleAccess(subscriptionId: string, action: "activate" | "deactivate") {
    setTogglingId(subscriptionId)
    try {
      const res = await fetch("/api/admin/subscriptions/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, action }),
      })
      if (!res.ok) throw new Error()
      mutate()
    } finally {
      setTogglingId(null)
    }
  }

  const subs = useMemo(() => data?.subscriptions ?? [], [data])

  const now = Date.now()
  const isTrialActive = (s: AdminSubscription) =>
    s.status === "trialing" && new Date(s.trial_end).getTime() > now

  const stats = useMemo(() => {
    return {
      active: subs.filter((s) => s.status === "active").length,
      trialing: subs.filter((s) => isTrialActive(s)).length,
      rejected: subs.filter((s) => s.last_payment_status === "rejected").length,
      canceled: subs.filter((s) => s.status === "canceled").length,
      mrr: subs.filter((s) => s.status === "active").reduce((acc, s) => acc + Number(s.plan_amount || 0), 0),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs])

  const filtered = useMemo(() => {
    switch (filter) {
      case "active":
        return subs.filter((s) => s.status === "active")
      case "trialing":
        return subs.filter((s) => isTrialActive(s))
      case "rejected":
        return subs.filter((s) => s.last_payment_status === "rejected")
      case "canceled":
        return subs.filter((s) => s.status === "canceled")
      default:
        return subs
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs, filter])

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-orange-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao app
              </Link>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Painel Administrativo</h1>
            <p className="text-sm text-slate-500">
              {PLAN_NAME} · logado como {adminEmail}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={testMpConnection}
              disabled={mpTesting}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {mpTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
              Testar Mercado Pago
            </button>
            <button
              onClick={() => mutate()}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      {/* Banner do modo ativo (TESTE x PRODUÇÃO) */}
      <div
        className={`border-b ${
          testMode ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                testMode ? "bg-amber-200 text-amber-900" : "bg-emerald-200 text-emerald-900"
              }`}
            >
              {testMode ? "MODO TESTE" : "MODO PRODUÇÃO"}
            </span>
            <span className={testMode ? "text-amber-800" : "text-emerald-800"}>
              {testMode
                ? "Pagamentos são simulados. Use uma CONTA DE TESTE (comprador) no checkout — não a sua conta real."
                : "Cobrança real ativa. Os clientes pagam de verdade ao assinar."}
            </span>
          </div>
          {testMode && (
            <span className="text-xs text-amber-700">
              {"Para ativar a cobrança real: defina MERCADO_PAGO_MODE=production e republique."}
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" />
            Não foi possível carregar os dados. Verifique se a tabela de assinaturas foi criada.
          </div>
        )}

        {/* Cartões de resumo */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Assinantes ativos"
            value={stats.active}
            icon={<Users className="h-5 w-5" />}
            accent="text-emerald-600 bg-emerald-50"
            onClick={() => setFilter("active")}
            active={filter === "active"}
          />
          <StatCard
            label="Em período de trial"
            value={stats.trialing}
            icon={<Clock className="h-5 w-5" />}
            accent="text-blue-600 bg-blue-50"
            onClick={() => setFilter("trialing")}
            active={filter === "trialing"}
          />
          <StatCard
            label="Pagamentos recusados"
            value={stats.rejected}
            icon={<CreditCard className="h-5 w-5" />}
            accent="text-amber-600 bg-amber-50"
            onClick={() => setFilter("rejected")}
            active={filter === "rejected"}
          />
          <StatCard
            label="Assinaturas canceladas"
            value={stats.canceled}
            icon={<XCircle className="h-5 w-5" />}
            accent="text-red-600 bg-red-50"
            onClick={() => setFilter("canceled")}
            active={filter === "canceled"}
          />
        </div>

        <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm">
          <span className="font-semibold text-orange-700">Receita recorrente estimada (MRR): </span>
          <span className="text-slate-700">{formatPrice(stats.mrr)}</span>
        </div>

        {/* Resultado do teste de conexão com o Mercado Pago */}
        {mpResult && (
          <div
            className={`mt-4 rounded-xl border px-4 py-4 ${
              mpResult.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
            }`}
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              {mpResult.ok ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700">Conexão com o Mercado Pago OK</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-red-700">Problemas na configuração do Mercado Pago</span>
                </>
              )}
            </div>
            <ul className="space-y-2">
              {mpResult.checks.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  {c.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  )}
                  <span>
                    <span className="font-medium text-slate-800">{c.label}: </span>
                    <span className="text-slate-600">{c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Filtros */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "Todos"],
              ["active", "Ativos"],
              ["trialing", "Em trial"],
              ["rejected", "Pagamentos recusados"],
              ["canceled", "Cancelados"],
            ] as [FilterKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                filter === key
                  ? "bg-orange-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tabela */}
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Trial até</th>
                  <th className="px-4 py-3 font-medium">Próxima cobrança</th>
                  <th className="px-4 py-3 font-medium">Último pagamento</th>
                  <th className="px-4 py-3 font-medium">Assinatura MP</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      Carregando...
                    </td>
                  </tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.email}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} isTrialActive={isTrialActive(s)} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(s.trial_end)}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(s.current_period_end)}</td>
                    <td className="px-4 py-3">
                      {s.last_payment_status ? (
                        <span className="flex flex-col">
                          <PaymentBadge status={s.last_payment_status} />
                          <span className="mt-0.5 text-xs text-slate-400">
                            {s.last_payment_amount ? formatPrice(Number(s.last_payment_amount)) : ""}{" "}
                            {s.last_payment_at ? `· ${fmtDate(s.last_payment_at)}` : ""}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{s.mp_preapproval_id ?? "—"}</td>
                    <td className="px-4 py-3">
                      {s.status === "active" ? (
                        <button
                          onClick={() => toggleAccess(s.id, "deactivate")}
                          disabled={togglingId === s.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          {togglingId === s.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Ban className="h-3.5 w-3.5" />
                          )}
                          Desativar
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleAccess(s.id, "activate")}
                          disabled={togglingId === s.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          {togglingId === s.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Ativar 30 dias
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <PixRequests />
      </div>
    </main>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent,
  onClick,
  active,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accent: string
  onClick: () => void
  active: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border bg-white p-4 text-left transition hover:shadow-md ${
        active ? "border-orange-400 ring-2 ring-orange-100" : "border-slate-200"
      }`}
    >
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </button>
  )
}

function StatusBadge({ status, isTrialActive }: { status: SubscriptionStatus; isTrialActive: boolean }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Ativo", cls: "bg-emerald-100 text-emerald-700" },
    trialing: isTrialActive
      ? { label: "Em trial", cls: "bg-blue-100 text-blue-700" }
      : { label: "Trial expirado", cls: "bg-slate-100 text-slate-500" },
    past_due: { label: "Inadimplente", cls: "bg-amber-100 text-amber-700" },
    canceled: { label: "Cancelado", cls: "bg-red-100 text-red-700" },
    expired: { label: "Expirado", cls: "bg-slate-100 text-slate-500" },
  }
  const item = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" }
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.cls}`}>{item.label}</span>
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: "Aprovado", cls: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Recusado", cls: "bg-red-100 text-red-700" },
    pending: { label: "Pendente", cls: "bg-amber-100 text-amber-700" },
    refunded: { label: "Estornado", cls: "bg-slate-100 text-slate-600" },
  }
  const item = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" }
  return <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${item.cls}`}>{item.label}</span>
}

function fmtDate(value: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}
