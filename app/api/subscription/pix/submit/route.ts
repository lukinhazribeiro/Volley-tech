import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import { getPixConfig } from "@/lib/pix"

export const dynamic = "force-dynamic"

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"]

/**
 * Cria um pedido de pagamento via Pix e armazena o comprovante enviado
 * pelo cliente em um Blob privado. O pedido entra como "pending" e fica
 * aguardando aprovação manual do admin.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const pix = getPixConfig()

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 })
  }

  const file = formData.get("receipt") as File | null
  const note = (formData.get("note") as string | null)?.slice(0, 500) ?? null

  if (!file) {
    return NextResponse.json({ error: "Anexe o comprovante do Pix." }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "O comprovante deve ter até 5 MB." }, { status: 400 })
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato inválido. Envie uma imagem (PNG/JPG/WebP) ou PDF." },
      { status: 400 },
    )
  }

  // Evita pedidos duplicados pendentes
  const { data: existingPending } = await supabase
    .from("pix_payments")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle()

  if (existingPending) {
    return NextResponse.json(
      { error: "Você já tem um pagamento pendente de aprovação. Aguarde a confirmação." },
      { status: 409 },
    )
  }

  // Upload do comprovante para Blob privado
  const ext = file.name.split(".").pop() || "bin"
  const pathname = `pix-receipts/${user.id}/${Date.now()}.${ext}`

  let receiptPathname: string
  try {
    const blob = await put(pathname, file, { access: "private" })
    receiptPathname = blob.pathname
  } catch (err) {
    console.error("[v0] Erro ao subir comprovante:", err)
    return NextResponse.json({ error: "Não foi possível salvar o comprovante." }, { status: 500 })
  }

  const { error: insertError } = await supabase.from("pix_payments").insert({
    user_id: user.id,
    email: user.email ?? "",
    amount: pix.amount,
    status: "pending",
    receipt_pathname: receiptPathname,
    receipt_content_type: file.type,
    note,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
