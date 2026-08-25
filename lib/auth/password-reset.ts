import "server-only"

/**
 * Redefinição de senha com autorização manual do administrador.
 *
 * Fluxo, sem depender de envio de email:
 *   1. O cliente pede a troca na tela de login (com um recado opcional).
 *      O servidor gera um segredo, guarda apenas o HASH dele e devolve o
 *      segredo uma única vez para o navegador de quem pediu.
 *   2. O pedido aparece no painel ADM, que autoriza ou recusa com um clique.
 *   3. Autorizado, o MESMO navegador conclui a troca apresentando o segredo.
 *
 * O segredo é o que amarra o pedido ao dispositivo: sem ele, saber o email de
 * um pedido autorizado não permite trocar a senha de ninguém.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { pool } from "@/lib/gestao/db"

/** Prazo para o cliente concluir a troca depois da autorização do ADM. */
export const AUTHORIZED_TTL_MINUTES = 30
/** Pedidos em aberto por email, para não inundar o painel. */
const MAX_OPEN_REQUESTS = 3

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export type ResetRequestStatus = "pending" | "authorized" | "denied" | "used"

export interface ResetRequest {
  id: string
  email: string
  message: string | null
  status: ResetRequestStatus
  createdAt: string
  authorizedAt: string | null
  authorizedExpiresAt: string | null
}

/**
 * Guarda apenas o HMAC do segredo, nunca o segredo em si: se o banco for lido,
 * os pedidos continuam inutilizáveis.
 */
function hashToken(token: string): string {
  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!pepper) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente.")
  return createHmac("sha256", pepper).update(token).digest("hex")
}

/** Comparação em tempo constante, para não vazar o segredo pelo tempo de resposta. */
function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex")
  const bufB = Buffer.from(b, "hex")
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * Localiza o usuário pelo email direto em auth.users. A Admin API do
 * supabase-js não oferece busca por email, e paginar todos os usuários não
 * escala — a consulta abaixo é exata e indexada.
 */
export async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const { rows } = await pool.query<{ id: string }>(
    "select id from auth.users where lower(email) = $1 limit 1",
    [email],
  )
  return rows[0] ?? null
}

/**
 * Registra o pedido e devolve o segredo (exibido uma única vez). Retorna null
 * quando o email já tem pedidos demais aguardando decisão.
 */
export async function createResetRequest(
  email: string,
  userId: string,
  message: string | null,
): Promise<{ requestId: string; token: string } | null> {
  const { rows: open } = await pool.query<{ count: string }>(
    `select count(*)::text as count
       from public.password_reset_requests
      where email = $1 and status = 'pending'`,
    [email],
  )
  if (Number(open[0]?.count ?? 0) >= MAX_OPEN_REQUESTS) return null

  const token = randomBytes(32).toString("hex")
  const trimmed = typeof message === "string" ? message.trim() : ""
  const { rows } = await pool.query<{ id: string }>(
    `insert into public.password_reset_requests (email, user_id, token_hash, message)
     values ($1, $2, $3, $4)
     returning id`,
    [email, userId, hashToken(token), trimmed ? trimmed.slice(0, 300) : null],
  )

  return { requestId: rows[0].id, token }
}

/** Situação atual do pedido, para o cliente acompanhar a espera. */
export async function getResetRequestStatus(
  requestId: string,
  token: string,
): Promise<ResetRequest | null> {
  const { rows } = await pool.query<{
    id: string
    email: string
    message: string | null
    status: ResetRequestStatus
    token_hash: string
    created_at: string
    authorized_at: string | null
    authorized_expires_at: string | null
  }>(
    `select id, email, message, status, token_hash, created_at,
            authorized_at, authorized_expires_at
       from public.password_reset_requests
      where id = $1
      limit 1`,
    [requestId],
  )

  const row = rows[0]
  if (!row || !hashesMatch(row.token_hash, hashToken(token))) return null

  return {
    id: row.id,
    email: row.email,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    authorizedAt: row.authorized_at,
    authorizedExpiresAt: row.authorized_expires_at,
  }
}

/** Pedidos para o painel ADM (pendentes primeiro). Nunca expõe o hash. */
export async function listResetRequests(limit = 50): Promise<ResetRequest[]> {
  const { rows } = await pool.query<{
    id: string
    email: string
    message: string | null
    status: ResetRequestStatus
    created_at: string
    authorized_at: string | null
    authorized_expires_at: string | null
  }>(
    `select id, email, message, status, created_at, authorized_at, authorized_expires_at
       from public.password_reset_requests
      order by (status = 'pending') desc, created_at desc
      limit $1`,
    [limit],
  )

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    authorizedAt: row.authorized_at,
    authorizedExpiresAt: row.authorized_expires_at,
  }))
}

/**
 * Decisão do ADM. Só age sobre pedidos pendentes, então autorizar de novo não
 * renova o prazo nem reabre um pedido já usado.
 */
export async function reviewResetRequest(
  requestId: string,
  approve: boolean,
  reviewer: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `update public.password_reset_requests
        set status = $2,
            authorized_at = now(),
            authorized_by = $3,
            authorized_expires_at = case
              when $2 = 'authorized'
              then now() + ($4 || ' minutes')::interval
              else null
            end
      where id = $1 and status = 'pending'`,
    [requestId, approve ? "authorized" : "denied", reviewer, String(AUTHORIZED_TTL_MINUTES)],
  )
  return (rowCount ?? 0) > 0
}

export type ConsumeResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "not_found" | "pending" | "denied" | "used" | "expired" }

/**
 * Valida o pedido e o marca como usado. O `update` condicional torna a operação
 * atômica: dois envios simultâneos não consomem o mesmo pedido duas vezes.
 */
export async function consumeAuthorizedRequest(
  requestId: string,
  token: string,
): Promise<ConsumeResult> {
  const { rows } = await pool.query<{
    user_id: string
    status: ResetRequestStatus
    token_hash: string
    expired: boolean
  }>(
    `select user_id, status, token_hash,
            (authorized_expires_at is not null and authorized_expires_at < now()) as expired
       from public.password_reset_requests
      where id = $1
      limit 1`,
    [requestId],
  )

  const row = rows[0]
  if (!row || !hashesMatch(row.token_hash, hashToken(token))) {
    return { ok: false, reason: "not_found" }
  }
  if (row.status === "denied") return { ok: false, reason: "denied" }
  if (row.status === "used") return { ok: false, reason: "used" }
  if (row.status === "pending") return { ok: false, reason: "pending" }
  if (row.expired) return { ok: false, reason: "expired" }

  const { rowCount } = await pool.query(
    `update public.password_reset_requests
        set status = 'used', used_at = now()
      where id = $1 and status = 'authorized'`,
    [requestId],
  )
  if ((rowCount ?? 0) === 0) return { ok: false, reason: "used" }

  return { ok: true, userId: row.user_id }
}
