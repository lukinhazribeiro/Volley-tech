"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PixPayment } from "@/components/hub/pix-payment"
import { formatPrice } from "@/lib/subscription"
import { QrCode, CreditCard, Star } from "lucide-react"

/**
 * Seletor de forma de pagamento (Pix ou Cartão) reutilizado no paywall e no
 * modal do banner de teste. O Pix é a opção padrão e recomendada (ativação
 * manual pelo comprovante); o Cartão redireciona para o Mercado Pago.
 */
export function PaymentOptions({ email }: { email: string }) {
  const [method, setMethod] = useState<"pix" | "mp">("pix")
  const [loadingCard, setLoadingCard] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)

  const handleCardCheckout = async () => {
    setLoadingCard(true)
    setCardError(null)
    try {
      const res = await fetch("/api/subscription/checkout", { method: "POST" })
      const data = await res.json()
      if (!res.ok || !data.init_point) {
        throw new Error(data.error || "Não foi possível iniciar o pagamento com cartão.")
      }
      window.location.href = data.init_point
    } catch (err) {
      setCardError(err instanceof Error ? err.message : "Erro ao iniciar o pagamento.")
      setLoadingCard(false)
    }
  }

  return (
    <div>
      {/* Seletor de método de pagamento */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
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
              Você será levado para a página segura do Mercado Pago para pagar com cartão de crédito e
              voltar automaticamente ao site. A assinatura é renovada mensalmente.
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
  )
}
