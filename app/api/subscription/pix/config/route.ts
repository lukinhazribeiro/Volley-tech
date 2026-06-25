import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getPixConfig, type PixPayment } from "@/lib/pix"

export const dynamic = "force-dynamic"

/**
 * Retorna os dados do Pix para o cliente autenticado pagar, além do
 * pedido Pix mais recente dele (para mostrar status pendente/aprovado).
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const pix = getPixConfig()

  const { data: latest } = await supabase
    .from("pix_payments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<PixPayment>()

  return NextResponse.json({
    pix: {
      key: pix.key,
      keyType: pix.keyType,
      recipientName: pix.recipientName,
      amount: pix.amount,
      configured: pix.configured,
    },
    latest: latest ?? null,
  })
}
