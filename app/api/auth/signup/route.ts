import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password

  if (!email || !password) {
    return NextResponse.json({ error: "Informe email e senha." }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ error: "Servidor não configurado para cadastro." }, { status: 500 })
  }

  // Cria o usuário já confirmado para permitir login imediato (sem email).
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    const alreadyExists = /registered|already|exists/i.test(error.message)
    return NextResponse.json(
      { error: alreadyExists ? "Este email já está cadastrado. Faça login." : error.message },
      { status: alreadyExists ? 409 : 400 },
    )
  }

  // Provisiona o trial de 7 dias (caso a tabela exista; se não existir, o
  // fallback por data de criação cuida disso no AuthGate).
  const userId = data.user?.id
  if (userId) {
    await admin
      .from("subscriptions")
      .insert({
        user_id: userId,
        email,
        status: "trialing",
        trial_start: new Date().toISOString(),
        trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .then(
        () => undefined,
        () => undefined, // ignora erro se a tabela ainda não existir
      )
  }

  return NextResponse.json({ ok: true })
}
