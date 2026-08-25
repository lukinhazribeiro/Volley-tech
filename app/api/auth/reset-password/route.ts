import { NextResponse } from "next/server"
import { consumeAuthorizedRequest } from "@/lib/auth/password-reset"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Grava a nova senha de um pedido já autorizado pelo administrador.
 *
 * Exige o segredo devolvido quando o pedido foi aberto, então só o navegador
 * que fez o pedido consegue concluir a troca.
 */
export async function POST(request: Request) {
  let requestId = ""
  let token = ""
  let password = ""
  try {
    const body = await request.json()
    requestId = typeof body?.requestId === "string" ? body.requestId : ""
    token = typeof body?.token === "string" ? body.token : ""
    password = typeof body?.password === "string" ? body.password : ""
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  if (!requestId || !token) {
    return NextResponse.json({ error: "Pedido inválido. Faça um novo pedido." }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "A nova senha deve ter pelo menos 6 caracteres." },
      { status: 400 },
    )
  }

  try {
    const result = await consumeAuthorizedRequest(requestId, token)
    if (!result.ok) {
      const message =
        result.reason === "pending"
          ? "Seu pedido ainda não foi aprovado pelo administrador."
          : result.reason === "denied"
            ? "Seu pedido foi recusado. Fale com o administrador."
            : result.reason === "expired"
              ? "A autorização expirou. Faça um novo pedido."
              : result.reason === "used"
                ? "Este pedido já foi usado. Faça um novo pedido."
                : "Pedido inválido. Faça um novo pedido."
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // A senha é gravada pela Admin API para que o Supabase faça o hash e
    // mantenha a conta consistente — nunca escrevemos em auth.users na mão.
    const supabase = createAdminClient()
    const { error } = await supabase.auth.admin.updateUserById(result.userId, {
      password,
      email_confirm: true,
    })
    if (error) {
      const weak = /password/i.test(error.message)
      return NextResponse.json(
        { error: weak ? "Senha muito fraca. Escolha outra." : "Não foi possível alterar a senha." },
        { status: 400 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.log("[v0] reset-password falhou:", err)
    return NextResponse.json({ error: "Erro inesperado. Tente novamente." }, { status: 500 })
  }
}
