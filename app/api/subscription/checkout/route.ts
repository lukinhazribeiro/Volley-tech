import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { PLAN_AMOUNT, PLAN_CURRENCY, PLAN_NAME } from "@/lib/subscription"
import { getMercadoPagoAccessToken, isMercadoPagoTestMode } from "@/lib/mercado-pago"

const MP_API = "https://api.mercadopago.com"

export async function POST() {
  const accessToken = getMercadoPagoAccessToken()
  if (!accessToken) {
    return NextResponse.json(
      { error: "Mercado Pago não configurado. Defina MERCADO_PAGO_ACCESS_TOKEN." },
      { status: 500 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL?.replace("/auth/callback", "") || ""

  // O Mercado Pago exige back_url e notification_url em HTTPS. Sem isso o
  // preapproval falha ou o checkout exibe "acesso não autorizado pelo recurso".
  if (!origin.startsWith("https://")) {
    return NextResponse.json(
      {
        error:
          "URL do site inválida. Configure NEXT_PUBLIC_SITE_URL com a URL pública em HTTPS do app (ex.: https://seuapp.vercel.app).",
      },
      { status: 500 },
    )
  }

  const backUrl = `${origin}/subscription/return`
  const notificationUrl = `${origin}/api/subscription/webhook`

  // Cria uma assinatura recorrente mensal (preapproval) vinculada ao email.
  const body = {
    reason: `${PLAN_NAME} — Assinatura Mensal`,
    external_reference: user.id,
    payer_email: user.email,
    back_url: backUrl,
    notification_url: notificationUrl,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: PLAN_AMOUNT,
      currency_id: PLAN_CURRENCY,
    },
    status: "pending",
  }

  const res = await fetch(`${MP_API}/preapproval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok) {
    console.log("[v0] Mercado Pago preapproval error:", res.status, JSON.stringify(data))

    // Mensagens claras para as causas mais comuns desse fluxo.
    let friendly = data.message || "Falha ao criar assinatura no Mercado Pago."
    if (res.status === 401 || /unauthorized|não autorizado|nao autorizado/i.test(friendly)) {
      friendly =
        "Acesso não autorizado pelo Mercado Pago. Verifique se o MERCADO_PAGO_ACCESS_TOKEN é o token de PRODUÇÃO da aplicação correta e se o produto 'Assinaturas' está ativado nela."
    } else if (res.status === 400 && /back_url|notification_url/i.test(JSON.stringify(data))) {
      friendly = "URL inválida. Confirme que NEXT_PUBLIC_SITE_URL é uma URL pública em HTTPS."
    }

    return NextResponse.json(
      { error: friendly, mp_status: res.status, mp_detail: data },
      { status: 502 },
    )
  }

  // Guarda o id da assinatura para reconciliar no webhook
  await supabase
    .from("subscriptions")
    .update({ mp_preapproval_id: data.id })
    .eq("user_id", user.id)

  // Em modo teste, usa o sandbox_init_point: é o checkout de SANDBOX, onde se
  // paga com USUÁRIOS DE TESTE. Usar o init_point normal com token de teste é
  // o que causa a confusão entre conta de teste e conta real no checkout.
  const testMode = isMercadoPagoTestMode()
  const initPoint = testMode ? data.sandbox_init_point || data.init_point : data.init_point

  return NextResponse.json({ init_point: initPoint })
}
