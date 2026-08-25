import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/subscription"
import { reviewResetRequest } from "@/lib/auth/password-reset"

export const dynamic = "force-dynamic"

/**
 * Autoriza ou recusa um pedido de troca de senha.
 *
 * Autorizar não altera a senha: apenas libera o cliente que fez o pedido a
 * definir a nova senha dentro do prazo, no próprio dispositivo dele.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const requestId: string | undefined = body?.requestId
  const action: "approve" | "deny" | undefined = body?.action

  if (!requestId || (action !== "approve" && action !== "deny")) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 })
  }

  try {
    const updated = await reviewResetRequest(requestId, action === "approve", user.email ?? "admin")
    if (!updated) {
      return NextResponse.json(
        { error: "Este pedido já foi decidido ou não existe." },
        { status: 409 },
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.log("[v0] revisar pedido de senha falhou:", err)
    return NextResponse.json({ error: "Não foi possível registrar a decisão." }, { status: 500 })
  }
}
