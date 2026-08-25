import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/subscription"
import { listResetRequests } from "@/lib/auth/password-reset"

export const dynamic = "force-dynamic"

/** Lista os pedidos de troca de senha para o painel ADM. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
  }

  try {
    const requests = await listResetRequests()
    return NextResponse.json({ requests })
  } catch (err) {
    console.log("[v0] listar pedidos de senha falhou:", err)
    return NextResponse.json({ error: "Não foi possível carregar os pedidos." }, { status: 500 })
  }
}
