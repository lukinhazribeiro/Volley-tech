import { NextResponse } from "next/server"
import { PLAN_AMOUNT } from "@/lib/subscription"

export const dynamic = "force-dynamic"

/**
 * Retorna a Public Key do Mercado Pago (segura para o navegador) e o valor
 * do plano, usados para inicializar o formulário de cartão transparente.
 */
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY?.trim() || ""
  return NextResponse.json({
    publicKey,
    amount: PLAN_AMOUNT,
    configured: publicKey.length > 0,
  })
}
