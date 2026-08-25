import { NextResponse } from "next/server"
import {
  createResetRequest,
  findUserByEmail,
  isValidEmail,
  normalizeEmail,
} from "@/lib/auth/password-reset"

/**
 * Abre um pedido de troca de senha para o administrador autorizar.
 *
 * A resposta é sempre genérica quando o email é válido, mesmo se a conta não
 * existir: revelar isso permitiria descobrir quais emails têm conta. Quando a
 * conta existe, devolve o segredo do pedido — guardado somente neste navegador
 * — que será exigido para concluir a troca depois da aprovação.
 */
export async function POST(request: Request) {
  let email = ""
  let message: string | null = null
  try {
    const body = await request.json()
    email = normalizeEmail(body?.email)
    message = typeof body?.message === "string" ? body.message : null
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Informe um email válido." }, { status: 400 })
  }

  try {
    const user = await findUserByEmail(email)

    // Conta inexistente: responde como sucesso, sem registrar pedido.
    if (!user) {
      return NextResponse.json({ ok: true, pending: false })
    }

    const created = await createResetRequest(email, user.id, message)
    if (!created) {
      return NextResponse.json(
        { error: "Você já tem pedidos aguardando aprovação. Fale com o administrador." },
        { status: 429 },
      )
    }

    return NextResponse.json({
      ok: true,
      pending: true,
      requestId: created.requestId,
      token: created.token,
    })
  } catch (err) {
    console.log("[v0] forgot-password falhou:", err)
    return NextResponse.json({ error: "Erro inesperado. Tente novamente." }, { status: 500 })
  }
}
