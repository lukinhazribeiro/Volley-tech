import { createClient } from "@supabase/supabase-js"

/**
 * Client com a service role key — IGNORA RLS.
 * Use APENAS em rotas de servidor confiáveis (ex: webhooks).
 * Nunca exponha no client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error("Supabase admin não configurado (faltando SUPABASE_SERVICE_ROLE_KEY).")
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
