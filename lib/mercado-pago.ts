import { readFileSync } from "node:fs"
import { join } from "node:path"

// Tokens de acesso do Mercado Pago (conta id 1199583945).
// Mantidos aqui como fonte garantida porque a variável de ambiente vinha
// sendo salva truncada (apenas o id "1199583945") por erro de cópia,
// quebrando o checkout em todos os ambientes (preview e site publicado).
// ⚠️ SEGURANÇA: são segredos. Recomenda-se renová-los no painel do
// Mercado Pago e migrar para variáveis de ambiente bem-formadas depois.
const PRODUCTION_ACCESS_TOKEN =
  "APP_USR-3727142781665837-061915-d95ccbe80135bfc8c8a4b44ceaaf9007-1199583945"
const TEST_ACCESS_TOKEN =
  "TEST-3727142781665837-061915-ab2cf7ddc260c82fbe3fd7c65453f9bd-1199583945"

/**
 * Define qual ambiente do Mercado Pago usar.
 *
 * Para alternar, defina a variável de ambiente MERCADO_PAGO_MODE:
 *   - "test"  -> usa o token de TESTE (homologação / aprovação da integração)
 *   - "production" (ou ausente) -> usa o token de PRODUÇÃO (cobrança real)
 *
 * Enquanto estiver homologando a integração no painel do Mercado Pago,
 * deixe MERCADO_PAGO_MODE=test. Quando o produto for aprovado e você quiser
 * cobrar de verdade, troque para MERCADO_PAGO_MODE=production (ou remova a
 * variável). Não é preciso editar código.
 */
export function isMercadoPagoTestMode(): boolean {
  const mode = sanitize(process.env.MERCADO_PAGO_MODE)?.toLowerCase()
  return mode === "test" || mode === "sandbox" || mode === "teste"
}

/**
 * Resolve o Access Token do Mercado Pago de forma resiliente, respeitando
 * o modo (teste ou produção).
 *
 * Prioriza um valor BEM-FORMADO vindo de process.env ou dos arquivos .env*,
 * desde que ele combine com o modo ativo (TEST- para teste, APP_USR- para
 * produção). Se nenhum candidato válido existir (ex.: variável salva
 * truncada como "1199583945"), usa o token embutido correspondente ao modo.
 */
export function getMercadoPagoAccessToken(): string {
  const testMode = isMercadoPagoTestMode()

  const candidates: (string | undefined)[] = [
    sanitize(process.env.MERCADO_PAGO_ACCESS_TOKEN),
    readTokenFromFile(".env.development.local"),
    readTokenFromFile(".env.local"),
    readTokenFromFile(".env.development"),
    readTokenFromFile(".env"),
  ]

  for (const candidate of candidates) {
    if (isWellFormed(candidate) && matchesMode(candidate, testMode)) {
      return candidate
    }
  }

  return testMode ? TEST_ACCESS_TOKEN : PRODUCTION_ACCESS_TOKEN
}

// Garante que o token combina com o modo ativo: em teste deve ser TEST-,
// em produção deve ser APP_USR-. Evita usar credencial do ambiente errado.
function matchesMode(token: string, testMode: boolean): boolean {
  return testMode ? token.startsWith("TEST-") : token.startsWith("APP_USR-")
}

// Um token válido do Mercado Pago tem prefixo correto e tamanho realista.
// Isso descarta valores truncados como "1199583945" (só o id da conta).
function isWellFormed(token: string | undefined): token is string {
  if (!token) return false
  const okPrefix = token.startsWith("APP_USR-") || token.startsWith("TEST-")
  return okPrefix && token.length >= 40 && token.split("-").length >= 4
}

function readTokenFromFile(fileName: string): string | undefined {
  try {
    const content = readFileSync(join(process.cwd(), fileName), "utf8")
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*MERCADO_PAGO_ACCESS_TOKEN\s*=\s*(.+)\s*$/)
      if (match) return sanitize(match[1])
    }
  } catch {
    // arquivo não existe nesse ambiente — segue para o próximo
  }
  return undefined
}

function sanitize(value: string | undefined | null): string | undefined {
  if (!value) return undefined
  const cleaned = value.trim().replace(/^["']|["']$/g, "").trim()
  return cleaned.length > 0 ? cleaned : undefined
}
