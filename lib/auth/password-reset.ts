import "server-only"

import { createHmac, randomInt, timingSafeEqual } from "node:crypto"
import { pool } from "@/lib/gestao/db"
import { createAdminClient } from "@/lib/supabase/admin"

/** Validade do código enviado por email. */
export const CODE_TTL_MINUTES = 15
/** Tentativas erradas permitidas por código antes de invalidá-lo. */
export const MAX_ATTEMPTS = 5
/** Códigos que um mesmo email pode pedir dentro da janela de validade. */
const MAX_REQUESTS_PER_WINDOW = 3

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Guarda apenas o HMAC do código, nunca o código em si: se o banco for lido,
 * os códigos continuam inutilizáveis. O hash é atrelado ao email, então um
 * código não pode ser reaproveitado em outra conta.
 */
function hashCode(email: string, code: string): string {
  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!pepper) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente.")
  return createHmac("sha256", pepper).update(`${email}:${code}`).digest("hex")
}

function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex")
  const bufB = Buffer.from(b, "hex")
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** Código numérico de 6 dígitos com gerador criptográfico. */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0")
}

/**
 * Localiza o usuário pelo email direto em auth.users. A Admin API do
 * supabase-js não oferece busca por email, e paginar todos os usuários não
 * escala — a consulta abaixo é exata e indexada.
 */
export async function findUserByEmail(
  email: string,
): Promise<{ id: string } | null> {
  const { rows } = await pool.query<{ id: string }>(
    "select id from auth.users where lower(email) = $1 limit 1",
    [email],
  )
  return rows[0] ?? null
}

/**
 * Cria um código para o email. Retorna null quando o limite da janela foi
 * atingido, para não permitir uso do envio de email como abuso.
 */
export async function createResetCode(email: string): Promise<string | null> {
  const supabase = createAdminClient()
  const windowStart = new Date(Date.now() - CODE_TTL_MINUTES * 60_000).toISOString()

  const { count } = await supabase
    .from("password_reset_codes")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", windowStart)

  if ((count ?? 0) >= MAX_REQUESTS_PER_WINDOW) return null

  // Invalida códigos anteriores: só o mais recente vale.
  await supabase
    .from("password_reset_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("email", email)
    .is("used_at", null)

  const code = generateCode()
  const { error } = await supabase.from("password_reset_codes").insert({
    email,
    code_hash: hashCode(email, code),
    expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
  })
  if (error) throw new Error(error.message)

  return code
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" }

/**
 * Valida o código do email e o consome. Cada tentativa errada é contabilizada;
 * ao estourar o limite, o código é descartado e um novo precisa ser pedido.
 */
export async function verifyResetCode(email: string, code: string): Promise<VerifyResult> {
  const supabase = createAdminClient()

  const { data: row } = await supabase
    .from("password_reset_codes")
    .select("id, code_hash, expires_at, attempts")
    .eq("email", email)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) return { ok: false, reason: "invalid" }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabase
      .from("password_reset_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id)
    return { ok: false, reason: "expired" }
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await supabase
      .from("password_reset_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id)
    return { ok: false, reason: "too_many_attempts" }
  }

  if (!hashesMatch(row.code_hash, hashCode(email, code))) {
    const attempts = row.attempts + 1
    await supabase
      .from("password_reset_codes")
      .update({
        attempts,
        // Estourou o limite nesta tentativa: queima o código.
        used_at: attempts >= MAX_ATTEMPTS ? new Date().toISOString() : null,
      })
      .eq("id", row.id)
    return { ok: false, reason: attempts >= MAX_ATTEMPTS ? "too_many_attempts" : "invalid" }
  }

  // Consome o código para impedir reuso.
  await supabase
    .from("password_reset_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id)

  return { ok: true }
}
