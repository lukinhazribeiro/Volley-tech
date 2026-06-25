import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/subscription"

/**
 * Retorna todas as assinaturas para o painel administrativo.
 * Acesso restrito aos e-mails em ADMIN_EMAILS. Usa o admin client
 * (service role) para ler todos os registros, ignorando o RLS.
 */
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
    .from("subscriptions")
    .select("*")
    .order("updated_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ subscriptions: data ?? [] })
}
