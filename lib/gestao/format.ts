export const brl = (v: number | string) =>
  `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function initials(nome: string) {
  const p = nome.trim().split(/\s+/)
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1]?.[0] ?? "" : "")).toUpperCase()
}

export type DescontoTipo = "nenhum" | "percentual" | "valor"

/** Calcula o valor final da mensalidade aplicando a bolsa/desconto. */
export function calcularMensalidade(
  base: number | string,
  descontoTipo: DescontoTipo,
  descontoValor: number | string,
) {
  const b = Number(base) || 0
  const d = Number(descontoValor) || 0
  let final = b
  if (descontoTipo === "percentual") final = b * (1 - Math.min(Math.max(d, 0), 100) / 100)
  else if (descontoTipo === "valor") final = Math.max(0, b - d)
  final = Math.round(final * 100) / 100
  return { base: b, final, desconto: Math.round((b - final) * 100) / 100 }
}

export const labelDesconto: Record<DescontoTipo, string> = {
  nenhum: "Sem bolsa",
  percentual: "Bolsa (%)",
  valor: "Desconto fixo",
}

/** Retorna um rótulo curto para o badge de bolsa, ou null se não houver. */
export function bolsaBadge(tipo: DescontoTipo, valor: number): string | null {
  if (tipo === "percentual" && valor > 0) return `Bolsa ${valor}%`
  if (tipo === "valor" && valor > 0) return `- ${brl(valor)}`
  return null
}

/** Formata competência AAAA-MM para "Mês/Ano". */
export function competenciaLabel(competencia: string) {
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  const [ano, mes] = competencia.split("-")
  return `${meses[Number(mes) - 1] ?? mes}/${ano}`
}

export function competenciaAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "-"
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function formatDateShort(d: string | Date | null | undefined) {
  if (!d) return "-"
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

/**
 * Normaliza um telefone brasileiro para o formato aceito pelo link do WhatsApp
 * (apenas dígitos, com DDI 55). Retorna null quando o número é inválido.
 */
export function whatsappNumero(telefone: string | null | undefined): string | null {
  if (!telefone) return null
  let d = telefone.replace(/\D/g, "")
  if (d.length < 10) return null
  // Adiciona o DDI do Brasil se ainda não houver
  if (!d.startsWith("55")) d = `55${d}`
  return d
}

/**
 * Monta a URL do WhatsApp (wa.me) com a mensagem de cobrança pré-preenchida.
 * Retorna null quando não há número válido.
 */
export function linkCobrancaWhatsapp(opts: {
  telefone: string | null | undefined
  nome: string
  totalDevido: number
  parcelasAtrasadas: number
  clube?: string
}): string | null {
  const numero = whatsappNumero(opts.telefone)
  if (!numero) return null
  const clube = opts.clube ?? "o clube"
  const linhas = [
    `Olá, ${opts.nome}! Tudo bem?`,
    "",
    opts.parcelasAtrasadas > 1
      ? `Identificamos ${opts.parcelasAtrasadas} mensalidades em atraso, totalizando ${brl(opts.totalDevido)}.`
      : `Identificamos uma mensalidade em atraso no valor de ${brl(opts.totalDevido)}.`,
    "",
    "Pode nos enviar o comprovante assim que regularizar? Qualquer dúvida, estamos à disposição.",
    "",
    `Obrigado! — ${clube}`,
  ]
  const texto = encodeURIComponent(linhas.join("\n"))
  return `https://wa.me/${numero}?text=${texto}`
}
