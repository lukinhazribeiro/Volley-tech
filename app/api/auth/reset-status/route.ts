import { NextResponse } from "next/server"
import { getResetRequestStatus } from "@/lib/auth/password-reset"

export const dynamic = "force-dynamic"

/**
 * Situação do pedido de troca de senha, consultada pela tela de login enquanto
 * o cliente aguarda. Exige o segredo do pedido, então ninguém consegue
 * acompanhar (nem descobrir) o pedido de outra pessoa.
 */
export async function POST(request: Request) {
  let requestId = ""
  let token = ""
  try {
    const body = await request.json()
    requestId = typeof body?.requestId === "string" ? body.requestId : ""
    token = typeof body?.token === "string" ? body.token : ""
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  if (!requestId || !token) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 })
  }

  try {
    const found = await getResetRequestStatus(requestId, token)
    if (!found) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      status: found.status,
      authorizedExpiresAt: found.authorizedExpiresAt,
    })
  } catch (err) {
    console.log("[v0] reset-status falhou:", err)
    return NextResponse.json({ error: "Erro inesperado." }, { status: 500 })
  }
}
