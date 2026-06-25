"use client"

import { useEffect } from "react"

export default function SubscriptionReturnPage() {
  useEffect(() => {
    // Dá um tempo para o webhook processar e recarrega a app na raiz,
    // onde o AuthGate revalida a assinatura.
    const t = setTimeout(() => {
      window.location.href = "/"
    }, 2500)
    return () => clearTimeout(t)
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-orange-50 via-amber-50 to-white px-6 text-center text-slate-900">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-300 border-t-orange-600" aria-label="Processando" />
      <h1 className="text-xl font-bold">Confirmando sua assinatura...</h1>
      <p className="max-w-sm text-sm text-slate-600">
        Estamos validando o pagamento no Mercado Pago. Você será redirecionado automaticamente.
      </p>
    </main>
  )
}
