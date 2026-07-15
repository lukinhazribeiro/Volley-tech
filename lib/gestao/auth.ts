import { createClient } from "@/lib/supabase/server"

/**
 * Retorna o ID do usuário logado (Supabase). Toda operação da Gestão é escopada
 * por este ID para que cada conta veja apenas os próprios dados.
 * Lança erro se não houver sessão — as páginas da Gestão são protegidas por auth.
 */
export async function getGestaoUserId(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("Não autenticado")
  }
  return user.id
}
