"use client"

import { useEffect, useState } from "react"
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react"
import { formatPrice } from "@/lib/subscription"
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react"

type ConfigState = { publicKey: string; amount: number; configured: boolean } | null

/**
 * Checkout Transparente: o cliente digita o cartão dentro do site.
 * O SDK do Mercado Pago tokeniza os dados no navegador (a Public Key só
 * permite gerar tokens, não movimenta dinheiro) e enviamos apenas o token
 * para o backend concluir a cobrança. Nenhum dado de cartão passa pelo servidor.
 */
export function CardPaymentForm({ email }: { email: string }) {
  const [config, setConfig] = useState<ConfigState>(null)
  const [ready, setReady] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/subscription/card/config")
      .then((r) => r.json())
      .then((data: ConfigState) => {
        if (!active || !data) return
        setConfig(data)
        if (data.configured && data.publicKey) {
          initMercadoPago(data.publicKey, { locale: "pt-BR" })
          setReady(true)
        }
      })
      .catch(() => active && setConfig({ publicKey: "", amount: 0, configured: false }))
    return () => {
      active = false
    }
  }, [])

  // Aprovado: mostra confirmação e recarrega para liberar o acesso.
  if (result?.ok) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-green-50 px-4 py-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
        <p className="text-base font-semibold text-green-800">{result.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
        >
          Acessar o VolleyTech
        </button>
      </div>
    )
  }

  if (config && !config.configured) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-3 text-center text-sm text-amber-700">
        O pagamento com cartão ainda não está disponível. Use o Pix ou tente novamente em instantes.
      </p>
    )
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando pagamento seguro...
      </div>
    )
  }

  return (
    <div>
      {result && !result.ok && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600" role="alert">
          {result.message}
        </p>
      )}

      {processing && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Processando pagamento...
        </div>
      )}

      <CardPayment
        initialization={{ amount: config!.amount, payer: { email } }}
        customization={{
          paymentMethods: { maxInstallments: 1 },
          visual: { style: { theme: "default" } },
        }}
        onSubmit={async (formData) => {
          setProcessing(true)
          setResult(null)
          try {
            const res = await fetch("/api/subscription/card/submit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(formData),
            })
            const data = await res.json()
            if (!res.ok) {
              setResult({ ok: false, message: data.error || "Não foi possível processar o pagamento." })
              return
            }
            const approved = data.status === "approved"
            setResult({ ok: approved, message: data.message })
          } catch {
            setResult({ ok: false, message: "Falha na comunicação. Tente novamente." })
          } finally {
            setProcessing(false)
          }
        }}
        onError={() => {
          setResult({ ok: false, message: "Verifique os dados do cartão e tente novamente." })
        }}
      />

      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
        Pagamento processado com segurança pelo Mercado Pago. Cobrança de {formatPrice(config!.amount)}/mês.
      </p>
    </div>
  )
}
