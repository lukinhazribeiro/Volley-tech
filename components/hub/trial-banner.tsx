"use client"

import { useEffect, useState } from "react"
import { Sparkles, Check, ShieldCheck, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PaymentOptions } from "@/components/hub/payment-options"
import {
  resolveAccess,
  resolveAccessFromCreatedAt,
  isFreeAccessEmail,
  formatPrice,
  PLAN_NAME,
  type AccessState,
  type Subscription,
} from "@/lib/subscription"

export function TrialBanner() {
  const [access, setAccess] = useState<AccessState | null>(null)
  const [free, setFree] = useState(false)
  const [email, setEmail] = useState("")
  const [showOptions, setShowOptions] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user
      if (!user || !mounted) return

      setEmail(user.email ?? "")

      if (isFreeAccessEmail(user.email)) {
        setFree(true)
        return
      }

      const { data: sub, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle<Subscription>()

      if (!mounted) return

      // Qualquer erro de leitura (tabela ausente, RLS, schema cache) cai no
      // fallback por data de criação para o app não travar antes da migração.
      setAccess(subError ? resolveAccessFromCreatedAt(user.created_at) : resolveAccess(sub ?? null))
    })

    return () => {
      mounted = false
    }
  }, [])

  // E-mails isentos ou assinantes ativos não veem o convite de assinatura.
  if (free) return null
  if (!access || !access.isTrial) {
    if (access?.status === "active") {
      return (
        <div className="mb-10 flex items-center gap-2 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface)]/60 px-4 py-3 text-sm text-[var(--hub-muted)]">
          <ShieldCheck className="h-4 w-4 text-[var(--hub-accent)]" />
          <span>
            Assinatura <span className="font-semibold text-[var(--hub-text)]">{PLAN_NAME}</span> ativa. Obrigado por
            apoiar o VolleyTech!
          </span>
        </div>
      )
    }
    return null
  }

  const days = access.trialDaysLeft

  return (
    <div className="mb-10 overflow-hidden rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface)] shadow-lg">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--hub-border)] bg-[var(--hub-bg)]/40 px-3 py-1 text-xs font-medium text-[var(--hub-accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            {days > 0 ? `${days} ${days === 1 ? "dia restante" : "dias restantes"} de teste` : "Período de teste"}
          </span>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-[var(--hub-text)]">
            Garanta o {PLAN_NAME} antes do fim do teste
          </h3>
          <p className="mt-1 text-sm text-[var(--hub-muted)]">
            Assine agora e continue com acesso total ao Scout, Attack Position e súmula digital sem interrupção.
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[var(--hub-muted)]">
            {["Acesso completo", "Histórico e análises", "Exportação em PDF", "Cancele quando quiser"].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 shrink-0 text-[var(--hub-accent)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:w-52 sm:shrink-0">
          <div className="text-center sm:text-right">
            <span className="text-3xl font-black text-[var(--hub-accent)]">{formatPrice()}</span>
            <span className="text-sm text-[var(--hub-muted)]">/mês</span>
          </div>
          <button
            onClick={() => setShowOptions(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--hub-accent)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Assinar plano mensal
          </button>
        </div>
      </div>

      {/* Modal com escolha de forma de pagamento (Pix ou Cartão) */}
      {showOptions && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Escolha a forma de pagamento"
          onClick={() => setShowOptions(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Escolha como pagar</h3>
              <button
                onClick={() => setShowOptions(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <PaymentOptions email={email} />
          </div>
        </div>
      )}
    </div>
  )
}
