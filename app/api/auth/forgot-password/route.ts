import { NextResponse } from "next/server"
import {
  createResetCode,
  findUserByEmail,
  isValidEmail,
  normalizeEmail,
} from "@/lib/auth/password-reset"
import { sendResetCodeEmail } from "@/lib/email/send-reset-code"

/**
 * Envia um código de 6 dígitos para o email informado.
 *
 * A resposta é sempre genérica quando o email é válido, mesmo se a conta não
 * existir: revelar isso permitiria descobrir quais emails têm conta.
 */
export async function POST(request: Request) {
  let email = ""
  try {
    const body = await request.json()
    email = normalizeEmail(body?.email)
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Informe um email válido." }, { status: 400 })
  }

  try {
    const user = await findUserByEmail(email)

    // Conta inexistente: responde como sucesso, sem enviar nada.
    if (!user) {
      return NextResponse.json({ ok: true })
    }

    const code = await createResetCode(email)
    if (!code) {
      return NextResponse.json(
        { error: "Muitos pedidos de código. Aguarde alguns minutos e tente novamente." },
        { status: 429 },
      )
    }

    const sent = await sendResetCodeEmail(email, code)
    if (!sent.ok) {
      // Falha de configuração/entrega é problema real do sistema: precisa
      // aparecer, senão o cliente espera para sempre por um email que não vem.
      return NextResponse.json(
        {
          error: sent.notConfigured
            ? "O envio de emails ainda não foi configurado. Fale com o administrador."
            : "Não foi possível enviar o email agora. Tente novamente em instantes.",
        },
        { status: 503 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.log("[v0] forgot-password falhou:", err)
    return NextResponse.json({ error: "Erro inesperado. Tente novamente." }, { status: 500 })
  }
}
