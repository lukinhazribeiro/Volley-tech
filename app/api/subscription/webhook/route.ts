import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMercadoPagoAccessToken } from "@/lib/mercado-pago"

const MP_API = "https://api.mercadopago.com"

/**
 * Webhook do Mercado Pago para assinaturas (preapproval) e pagamentos.
 * Recebe notificações e atualiza o status da assinatura e o histórico de
 * pagamentos no Supabase — o que alimenta o painel administrativo.
 *
 * Configure a URL deste endpoint no painel do Mercado Pago:
 *   {SEU_DOMINIO}/api/subscription/webhook
 */
export async function POST(request: NextRequest) {
  const accessToken = getMercadoPagoAccessToken()
  if (!accessToken) {
    return NextResponse.json({ error: "MP não configurado" }, { status: 500 })
  }

  let payload: any
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  // Mercado Pago pode mandar via query (?type=&id=) ou no corpo
  const { searchParams } = request.nextUrl
  const type = payload.type || searchParams.get("type") || payload.topic || searchParams.get("topic")
  const dataId = payload.data?.id || searchParams.get("id") || payload.id

  if (!dataId) {
    return NextResponse.json({ received: true })
  }

  try {
    if (type === "subscription_preapproval" || type === "preapproval") {
      await handlePreapproval(String(dataId), accessToken)
    } else if (
      type === "payment" ||
      type === "subscription_authorized_payment" ||
      type === "authorized_payment"
    ) {
      await handlePayment(String(dataId), accessToken)
    }
  } catch (err) {
    console.log("[v0] webhook error:", err instanceof Error ? err.message : String(err))
  }

  // Sempre 200 para o MP não reenviar indefinidamente
  return NextResponse.json({ received: true })
}

/** Atualiza o status da assinatura a partir de um preapproval. */
async function handlePreapproval(dataId: string, accessToken: string) {
  const res = await fetch(`${MP_API}/preapproval/${dataId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const preapproval = await res.json()
  if (!res.ok || !preapproval) return

  const userId = preapproval.external_reference as string | undefined
  const mpStatus = preapproval.status as string // authorized | paused | cancelled | pending

  const status =
    mpStatus === "authorized"
      ? "active"
      : mpStatus === "cancelled"
        ? "canceled"
        : mpStatus === "paused"
          ? "past_due"
          : "trialing"

  // próxima cobrança ~1 mês à frente
  const periodEnd = new Date()
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  const update: Record<string, unknown> = {
    status,
    mp_preapproval_id: preapproval.id,
    mp_payer_id: preapproval.payer_id ? String(preapproval.payer_id) : null,
  }
  if (status === "active") {
    update.current_period_end = periodEnd.toISOString()
  }
  if (status === "canceled") {
    update.canceled_at = new Date().toISOString()
  }

  await applyUpdate(update, { userId, email: preapproval.payer_email })
}

/** Registra o resultado de um pagamento (aprovado/recusado) e ajusta o status. */
async function handlePayment(dataId: string, accessToken: string) {
  const res = await fetch(`${MP_API}/v1/payments/${dataId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const payment = await res.json()
  if (!res.ok || !payment) return

  const paymentStatus = payment.status as string // approved | rejected | pending | refunded | cancelled
  const userId = payment.external_reference as string | undefined
  const payerEmail = payment.payer?.email as string | undefined
  const preapprovalId = payment.metadata?.preapproval_id || payment.point_of_interaction?.transaction_data?.subscription_id

  const update: Record<string, unknown> = {
    last_payment_status: paymentStatus,
    last_payment_amount: payment.transaction_amount ?? null,
    last_payment_at: payment.date_approved || payment.date_created || new Date().toISOString(),
  }

  // Pagamento aprovado reativa/mantém a assinatura ativa e empurra a próxima cobrança.
  if (paymentStatus === "approved") {
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1)
    update.status = "active"
    update.current_period_end = periodEnd.toISOString()
  } else if (paymentStatus === "rejected") {
    // Pagamento recusado deixa a assinatura inadimplente (bloqueia o acesso).
    update.status = "past_due"
  }

  await applyUpdate(update, { userId, email: payerEmail, preapprovalId })
}

/** Aplica o update casando por user_id, depois email, depois preapproval id. */
async function applyUpdate(
  update: Record<string, unknown>,
  keys: { userId?: string; email?: string; preapprovalId?: string },
) {
  const supabase = createAdminClient()
  if (keys.userId) {
    await supabase.from("subscriptions").update(update).eq("user_id", keys.userId)
  } else if (keys.email) {
    await supabase.from("subscriptions").update(update).eq("email", keys.email)
  } else if (keys.preapprovalId) {
    await supabase.from("subscriptions").update(update).eq("mp_preapproval_id", String(keys.preapprovalId))
  }
}
