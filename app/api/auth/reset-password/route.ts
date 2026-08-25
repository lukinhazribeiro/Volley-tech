import { NextResponse } from "next/server"
import {
  findUserByEmail,
  isValidEmail,
  normalizeEmail,
  verifyResetCode,
} from "@/lib/auth/password-reset"
import { createAdminClient } from "@/lib/supabase/admin"

/** Valida o código de 6 dígitos e grava a nova senha. */
export async function POST(request: Request) {
  let email = ""
  let code = ""
  let password = ""
  try {
    const body = await request.json()
    email = normalizeEmail(body?.email)
    code = typeof body?.code === "string" ? body.code.replace(/\D/g, "") : ""
    password = typeof body?.password === "string" ? body.password : ""
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Informe um email válido." }, { status: 400 })
  }
  if (code.length !== 6) {
    return NextResponse.json({ error: "Informe o código de 6 dígitos." }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "A nova senha deve ter pelo menos 6 caracteres." },
      { status: 400 },
    )
  }

  try {
    const result = await verifyResetCode(email, code)
    if (!result.ok) {
      const message =
        result.reason === "expired"
          ? "Código expirado. Peça um novo código."
          : result.reason === "too_many_attempts"
            ? "Muitas tentativas incorretas. Peça um novo código."
            : "Código incorreto."
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const user = await findUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: "Conta não encontrada." }, { status: 400 })
    }

    // A senha é gravada pela Admin API para que o Supabase faça o hash e
    // mantenha a conta consistente — nunca escrevemos em auth.users na mão.
    const supabase = createAdminClient()
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
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
