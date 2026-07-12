import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMercadoPagoAccessToken } from "@/lib/mercado-pago"
import { PLAN_AMOUNT, PLAN_NAME } from "@/lib/subscription"

export const dynamic = "force-dynamic"

const MP_API = "https://api.mercadopago.com"

/**
 * Checkout Transparente (cartão dentro do site).
 *
 * O navegador tokeniza os dados do cartão com o SDK do Mercado Pago (Public Key)
 * e envia aqui apenas o token — NUNCA o número do cartão. Este endpoint cria um
 * pagamento real via API do Mercado Pago e, se aprovado, ativa a assinatura por
 * 1 mês. Assim os dados sensíveis do cartão nunca passam pelo nosso servidor.
 */
export async function POST(request: NextRequest) {
  const accessToken = getMercadoPagoAccessToken()
  if (!accessToken) {
    return NextResponse.json({ error: "Pagamento não configurado." }, { status: 500 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 })
  }

  const {
    token,
    payment_method_id,
    issuer_id,
    installments,
    payer,
  } = body ?? {}

  if (!token || !payment_method_id) {
    return NextResponse.json({ error: "Dados do cartão incompletos." }, { status: 400 })
  }

  const payerEmail = (payer?.email as string) || user.email || ""

  // Idempotência: evita cobrança duplicada em cliques repetidos.
  const idempotencyKey = `${user.id}-${token}`

  const paymentBody = {
    transaction_amount: PLAN_AMOUNT,
    token,
    description: PLAN_NAME,
    installments: Number(installments) || 1,
    payment_method_id,
    issuer_id: issuer_id ? String(issuer_id) : undefined,
    external_reference: user.id,
    metadata: { user_id: user.id },
    payer: {
      email: payerEmail,
      identification: payer?.identification
        ? {
            type: payer.identification.type,
            number: payer.identification.number,
          }
        : undefined,
    },
  }

  let payment: any
  try {
    const res = await fetch(`${MP_API}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(paymentBody),
    })
    payment = await res.json()
    if (!res.ok) {
      const message =
        payment?.message ||
        payment?.cause?.[0]?.description ||
        "Não foi possível processar o pagamento."
      console.log("[v0] MP card payment error:", JSON.stringify(payment))
      return NextResponse.json({ error: traduzErroMp(message) }, { status: 400 })
    }
  } catch (err) {
    console.log("[v0] MP card fetch error:", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: "Falha na comunicação com o Mercado Pago." }, { status: 502 })
  }

  const status = payment.status as string // approved | in_process | rejected | ...

  // Ativa a assinatura quando aprovado (usa admin client para ignorar RLS).
  if (status === "approved") {
    const admin = createAdminClient()
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    await admin
      .from("subscriptions")
      .update({
        status: "active",
        current_period_end: periodEnd.toISOString(),
        mp_payer_id: payment.payer?.id ? String(payment.payer.id) : null,
        last_payment_status: "approved",
        last_payment_amount: payment.transaction_amount ?? PLAN_AMOUNT,
        last_payment_at: payment.date_approved || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
  }

  return NextResponse.json({
    status,
    status_detail: payment.status_detail,
    message: mensagemStatus(status, payment.status_detail),
  })
}

/** Mensagem amigável conforme o status do pagamento do cartão. */
function mensagemStatus(status: string, detail?: string): string {
  if (status === "approved") return "Pagamento aprovado! Sua assinatura está ativa."
  if (status === "in_process" || status === "pending")
    return "Pagamento em análise. Avisaremos assim que for aprovado."
  if (status === "rejected") {
    if (detail === "cc_rejected_insufficient_amount") return "Cartão sem limite/saldo suficiente."
    if (detail === "cc_rejected_bad_filled_security_code") return "Código de segurança (CVV) inválido."
    if (detail === "cc_rejected_bad_filled_date") return "Data de validade inválida."
    if (detail === "cc_rejected_high_risk")
      return "Pagamento recusado pelo banco. Tente outro cartão ou use Pix."
    return "Pagamento recusado. Confira os dados ou tente outro cartão."
  }
  return "Não foi possível concluir o pagamento."
}

function traduzErroMp(message: string): string {
  const m = message.toLowerCase()
  if (m.includes("invalid") && m.includes("token")) return "Não foi possível validar o cartão. Tente novamente."
  return message
}
