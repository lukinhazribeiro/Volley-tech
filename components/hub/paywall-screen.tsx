"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { VolleyTechLogo } from "@/components/hub/volley-tech-logo"
import { PixPayment } from "@/components/hub/pix-payment"
import { formatPrice, type AccessState } from "@/lib/subscription"
import { Check, QrCode, CreditCard, Star } from "lucide-react"

export function PaywallScreen({
  email,
  access,
  onSignOut,
}: {
  email: string
  access: AccessState
  onSignOut: () => void
}) {
  const [method, setMethod] = useState<"pix" | "mp">("pix")
  const [loadingCard, setLoadingCard] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)

  const expiredTrial = access.status === "expired"

  const handleCardCheckout = async () => {
    setLoadingCard(true)
    setCardError(null)
    try {
      const res = await fetch("/api/subscription/checkout", { method: "POST" })
      const data = await res.json()
      if (!res.ok || !data.init_point) {
        throw new Error(data.error || "Não foi possível iniciar o pagamento com cartão.")
      }
      // Redireciona para a página segura do Mercado Pago
      window.location.href = data.init_point
    } catch (err) {
      setCardError(err instanceof Error ? err.message : "Erro ao iniciar o pagamento.")
      setLoadingCard(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-white px-6 text-slate-900">
      <div
        className="pointer-events-none absolute left-1/2 top-[-8rem] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-orange-300 opacity-30 blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <VolleyTechLogo className="mb-4 h-16 w-16 text-orange-600" />
          <h1 className="text-2xl font-bold tracking-tight">
            {expiredTrial ? "Seu período gratuito terminou" : "Assine para continuar"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Para continuar usando o VolleyTech, ative sua assinatura mensal.
          </p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-2xl">
          <div className="flex items-end justify-center gap-1 text-center">
            <span className="text-4xl font-black text-orange-600">{formatPrice()}</span>
            <span className="mb-1 text-sm text-slate-500">/mês</span>
          </div>

          <ul className="mt-6 space-y-3 text-sm text-slate-700">
            {[
              "Acesso completo ao Scout e Attack Position",
              "Histórico de jogos e análise de performance",
              "Exportação de súmulas em PDF",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-orange-600" />
                {item}
              </li>
            ))}
          </ul>

          {/* Seletor de método de pagamento */}
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setMethod("pix")}
              className={`relative flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                method === "pix" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <QrCode className="h-4 w-4" />
              Pix
              <span className="absolute -top-2 right-1 flex items-center gap-0.5 rounded-full bg-orange-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white shadow">
                <Star className="h-2.5 w-2.5 fill-current" />
                Recomendado
              </span>
            </button>
            <button
              onClick={() => setMethod("mp")}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                method === "mp" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Cartão
            </button>
          </div>

          <div className="mt-4">
            {method === "pix" ? (
              <PixPayment />
            ) : (
              <div className="space-y-4">
                <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Você será levado para a página segura do Mercado Pago para pagar com cartão de
                  crédito e voltar automaticamente ao site. A assinatura é renovada mensalmente.
                </p>

                {cardError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600" role="alert">
                    {cardError}
                  </p>
                )}

                <Button
                  onClick={handleCardCheckout}
                  disabled={loadingCard}
                  className="h-12 w-full bg-orange-600 text-base font-semibold text-white hover:bg-orange-700"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {loadingCard ? "Redirecionando..." : "Pagar com cartão no Mercado Pago"}
                </Button>

                <p className="text-center text-xs text-slate-500">
                  Cobrança mensal de {formatPrice()} vinculada a {email}.
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="mx-auto mt-6 block text-sm font-medium text-slate-500 hover:text-slate-700 hover:underline"
        >
          Sair desta conta
        </button>
      </div>
    </main>
  )
}
