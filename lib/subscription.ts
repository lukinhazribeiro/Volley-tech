export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "expired"

export interface Subscription {
  id: string
  user_id: string
  email: string
  status: SubscriptionStatus
  plan_amount: number
  currency: string
  trial_start: string
  trial_end: string
  current_period_end: string | null
  mp_preapproval_id: string | null
  mp_payer_id: string | null
}

export const PLAN_NAME = "Volleyball Scout Pro"
export const PLAN_AMOUNT = 19.9
export const PLAN_CURRENCY = "BRL"
export const TRIAL_DAYS = 7

/**
 * E-mails com acesso vitalício gratuito (isentos de cobrança e de trial).
 * Comparação feita em minúsculas e sem espaços.
 */
export const FREE_ACCESS_EMAILS = ["cunhalukinhaz@gmail.com"]

export function isFreeAccessEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return FREE_ACCESS_EMAILS.includes(email.trim().toLowerCase())
}

/** E-mails com acesso ao painel administrativo. */
export const ADMIN_EMAILS = ["cunhalukinhaz@gmail.com"]

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.trim().toLowerCase())
}

export interface AccessState {
  /** Se o usuário pode usar o app agora (trial válido ou assinatura ativa). */
  hasAccess: boolean
  /** True enquanto estiver no período de trial gratuito. */
  isTrial: boolean
  /** Dias restantes do trial (0 se expirado/n/a). */
  trialDaysLeft: number
  status: SubscriptionStatus
}

/**
 * Determina o acesso a partir da assinatura.
 * - trialing: tem acesso enquanto trial_end estiver no futuro.
 * - active: tem acesso enquanto current_period_end estiver no futuro.
 * - demais: sem acesso.
 */
export function resolveAccess(sub: Subscription | null): AccessState {
  if (!sub) {
    return { hasAccess: false, isTrial: false, trialDaysLeft: 0, status: "expired" }
  }

  const now = Date.now()

  if (sub.status === "trialing") {
    const end = new Date(sub.trial_end).getTime()
    const msLeft = end - now
    const hasAccess = msLeft > 0
    const trialDaysLeft = hasAccess ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : 0
    return {
      hasAccess,
      isTrial: hasAccess,
      trialDaysLeft,
      status: hasAccess ? "trialing" : "expired",
    }
  }

  if (sub.status === "active") {
    const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : now + 1
    return { hasAccess: end > now, isTrial: false, trialDaysLeft: 0, status: "active" }
  }

  return { hasAccess: false, isTrial: false, trialDaysLeft: 0, status: sub.status }
}

/**
 * Fallback usado quando a tabela `subscriptions` ainda não foi criada.
 * Deriva o trial de 7 dias a partir da data de criação da conta no Supabase Auth,
 * permitindo que o app funcione antes da migração ser aplicada.
 */
export function resolveAccessFromCreatedAt(createdAt: string | undefined): AccessState {
  if (!createdAt) {
    return { hasAccess: true, isTrial: true, trialDaysLeft: TRIAL_DAYS, status: "trialing" }
  }
  const now = Date.now()
  const trialEnd = new Date(createdAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000
  const msLeft = trialEnd - now
  const hasAccess = msLeft > 0
  return {
    hasAccess,
    isTrial: hasAccess,
    trialDaysLeft: hasAccess ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : 0,
    status: hasAccess ? "trialing" : "expired",
  }
}

export function formatPrice(amount: number = PLAN_AMOUNT): string {
  return amount.toLocaleString("pt-BR", { style: "currency", currency: PLAN_CURRENCY })
}
