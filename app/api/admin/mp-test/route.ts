import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/subscription"
import { getMercadoPagoAccessToken, isMercadoPagoTestMode } from "@/lib/mercado-pago"

// Nunca cachear: o resultado depende do token atual e do login do admin.
export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * Testa a conexão com o Mercado Pago validando o MERCADO_PAGO_ACCESS_TOKEN.
 * Verifica também se o produto de assinaturas (preapproval) está acessível.
 * Acesso restrito a administradores.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 })
  }

  const token = getMercadoPagoAccessToken()
  const testMode = isMercadoPagoTestMode()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ""

  const checks: { label: string; ok: boolean; detail: string }[] = []

  // 0. Modo ativo (teste x produção)
  checks.push({
    label: "Modo",
    ok: true,
    detail: testMode
      ? "TESTE (MERCADO_PAGO_MODE=test) — use contas e cartões de teste. Troque para produção quando a integração for aprovada."
      : "PRODUÇÃO — cobrança real. Para homologar a integração, defina MERCADO_PAGO_MODE=test.",
  })

  // 1. Token presente
  if (!token) {
    checks.push({
      label: "Access Token",
      ok: false,
      detail: "MERCADO_PAGO_ACCESS_TOKEN não está definido nas variáveis de ambiente.",
    })
    return NextResponse.json({ ok: false, checks })
  }

  // Diagnóstico seguro da estrutura (sem expor o segredo): tamanho, início,
  // fim e nº de segmentos. Um token válido tem 4-5 segmentos separados por "-"
  // e começa com APP_USR- ou TEST-.
  const segments = token.split("-").length
  checks.push({
    label: "Estrutura do token",
    ok: segments >= 4 && (token.startsWith("APP_USR-") || token.startsWith("TEST-")),
    detail: `Tamanho ${token.length}, começa com "${token.slice(0, 8)}…", termina com "…${token.slice(-6)}", ${segments} segmentos. (Esperado: começa com APP_USR-/TEST- e ~5 segmentos.)`,
  })

  const isProd = token.startsWith("APP_USR-")
  const isTest = token.startsWith("TEST-")
  // A Public Key também começa com APP_USR- mas é um UUID curto com hífens.
  // O Access Token tem números e segmentos. Detecta a confusão mais comum.
  const looksLikePublicKey = /^APP_USR-[0-9a-f]{8}-[0-9a-f]{4}-/i.test(token)
  // O token deve combinar com o modo ativo: TEST- em modo teste, APP_USR- em produção.
  const matchesMode = testMode ? isTest : isProd
  checks.push({
    label: "Tipo do token",
    ok: matchesMode && !looksLikePublicKey,
    detail: looksLikePublicKey
      ? "Isso parece ser a PUBLIC KEY, não o Access Token. Use o Access Token (longo, com números, termina com o id da conta)."
      : testMode
        ? isTest
          ? "Token de TESTE (TEST-) — correto para o modo teste/homologação."
          : "Modo teste ativo, mas o token não é de teste (TEST-). Verifique a credencial."
        : isProd
          ? "Token de PRODUÇÃO (APP_USR-) — correto para clientes reais."
          : isTest
            ? "Token de TESTE (TEST-) em modo produção. Para cobrar de verdade use o token APP_USR-."
            : `Formato não reconhecido (começa com "${token.slice(0, 8)}..."). Verifique se não há espaços ou aspas e se é o Access Token.`,
  })

  // 2. Site URL em HTTPS
  checks.push({
    label: "URL do site",
    ok: siteUrl.startsWith("https://"),
    detail: siteUrl.startsWith("https://")
      ? `NEXT_PUBLIC_SITE_URL = ${siteUrl}`
      : "NEXT_PUBLIC_SITE_URL ausente ou não está em HTTPS. Necessária para back_url e webhook.",
  })

  // 3. Valida o token chamando a API de identificação do MP
  try {
    const res = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (res.ok) {
      checks.push({
        label: "Autenticação",
        ok: true,
        detail: `Conta conectada: ${data.nickname ?? data.email ?? data.id} (id ${data.id}).`,
      })
    } else {
      checks.push({
        label: "Autenticação",
        ok: false,
        detail: `Mercado Pago recusou o token (HTTP ${res.status}): ${data.message ?? "não autorizado"}.`,
      })
    }
  } catch (e) {
    checks.push({
      label: "Autenticação",
      ok: false,
      detail: `Falha ao contatar o Mercado Pago: ${(e as Error).message}`,
    })
  }

  const ok = checks.every((c) => c.ok)
  return NextResponse.json({ ok, checks })
}
