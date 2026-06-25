import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/subscription"

export const dynamic = "force-dynamic"

/**
 * Ativa ou desativa manualmente o acesso de um usuário.
 * - activate: libera 30 dias a partir de agora (status "active").
 * - deactivate: marca como "canceled" (bloqueia o acesso imediatamente).
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
  const subscriptionId: string | undefined = body?.subscriptionId
  const action: "activate" | "deactivate" | undefined = body?.action

  if (!subscriptionId || (action !== "activate" && action !== "deactivate")) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 })
  }

  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  const update =
    action === "activate"
      ? {
          status: "active" as const,
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          canceled_at: null,
        }
      : {
          status: "canceled" as const,
          canceled_at: nowIso,
        }

  const { error } = await admin.from("subscriptions").update(update).eq("id", subscriptionId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
