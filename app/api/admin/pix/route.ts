import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/subscription"
import type { PixPayment } from "@/lib/pix"

export const dynamic = "force-dynamic"

/** Lista os pedidos de pagamento via Pix para o painel admin. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("pix_payments")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ payments: (data ?? []) as PixPayment[] })
}
