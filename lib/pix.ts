import { PLAN_AMOUNT } from "@/lib/subscription"

/**
 * Configuração do pagamento via Pix manual (com aprovação do admin).
 * A chave Pix e o nome do recebedor vêm de variáveis de ambiente, para
 * não ficarem hardcoded e poderem ser trocados sem editar código.
 */
export function getPixConfig() {
  const key = process.env.PIX_KEY?.trim() || ""
  const recipientName = process.env.PIX_RECIPIENT_NAME?.trim() || ""
  const keyType = process.env.PIX_KEY_TYPE?.trim() || "" // ex: CPF, CNPJ, E-mail, Telefone, Aleatória
  return {
    key,
    recipientName,
    keyType,
    amount: PLAN_AMOUNT,
    configured: Boolean(key),
  }
}

export type PixPaymentStatus = "pending" | "approved" | "rejected"

export interface PixPayment {
  id: string
  user_id: string
  email: string
  amount: number
  status: PixPaymentStatus
  receipt_pathname: string | null
  receipt_content_type: string | null
  note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}
