import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail, PLAN_AMOUNT } from "@/lib/subscription"
import type { PixPayment } from "@/lib/pix"

export const dynamic = "force-dynamic"

/**
 * Aprova ou rejeita um pedido de pagamento via Pix.
 * - approve: marca o pedido como aprovado e libera 30 dias de acesso
 *   (status "active", current_period_end = agora + 30 dias).
 * - reject: marca o pedido como rejeitado (não altera o acesso).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const paymentId: string | undefined = body?.paymentId
  const action: "approve" | "reject" | undefined = body?.action

  if (!paymentId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: payment, error: fetchError } = await admin
    .from("pix_payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle<PixPayment>()

  if (fetchError || !payment) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })
  }

  const reviewedAt = new Date().toISOString()

  const { error: updateError } = await admin
    .from("pix_payments")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      reviewed_by: user.email,
      reviewed_at: reviewedAt,
    })
    .eq("id", paymentId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (action === "approve") {
    // Libera 30 dias a partir da aprovação
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const { error: subError } = await admin
      .from("subscriptions")
      .update({
        status: "active",
        current_period_end: periodEnd,
        last_payment_status: "approved",
        last_payment_amount: payment.amount ?? PLAN_AMOUNT,
        last_payment_at: reviewedAt,
      })
      .eq("user_id", payment.user_id)

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
