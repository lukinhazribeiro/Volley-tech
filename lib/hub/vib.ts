/**
 * Volley Hub — VIB (referência estatística comparativa da Volley Tech).
 *
 * O VIB NÃO substitui o IGD: usa o IGD de cada atleta como insumo para gerar
 * uma referência agregada. Compara a atleta com uma população ANONIMIZADA de
 * atletas semelhantes (mesma posição + idade ±1 ano), dividida em 4 faixas
 * (quartis por IGD), e classifica onde a atleta se posiciona.
 *
 * Esta camada é puramente estatística: nada aqui identifica outras atletas.
 * A leitura da população cross-conta acontece no banco, via função agregada
 * `vib_compare` (SECURITY DEFINER), que só retorna médias/cortes — ver vib-data.ts.
 */

/** Grupos de posição usados na comparação do VIB. */
export type PositionGroup = "levantadora" | "ponteira" | "oposta" | "central" | "libero" | "outro"

/** Rótulos legíveis dos grupos de posição. */
export const POSITION_GROUP_LABEL: Record<PositionGroup, string> = {
  levantadora: "Levantadora",
  ponteira: "Ponteira",
  oposta: "Oposta",
  central: "Central",
  libero: "Líbero",
  outro: "Outra",
}

/** Classificações visuais do VIB. "Excelente" não é uma 5ª faixa estatística. */
export type VibClassification =
  | "excelente"
  | "muito_bom"
  | "bom"
  | "neutro"
  | "abaixo"
  | "sem_dados"

/** Rótulos legíveis das classificações. */
export const VIB_CLASSIFICATION_LABEL: Record<VibClassification, string> = {
  excelente: "Excelente",
  muito_bom: "Muito Bom",
  bom: "Bom",
  neutro: "Neutro",
  abaixo: "Abaixo do Esperado",
  sem_dados: "Sem dados",
}

/**
 * Normaliza a posição livre da atleta para um grupo de comparação do VIB.
 * Aceita variações comuns (acentos, abreviações, plural/singular).
 */
export function positionToGroup(position: string | null | undefined): PositionGroup {
  if (!position) return "outro"
  const p = position
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

  if (/(levant|setter|lev\b|arm)/.test(p)) return "levantadora"
  if (/(libero|libera)/.test(p)) return "libero"
  if (/(opost|opp\b)/.test(p)) return "oposta"
  if (/(central|meio|middle|centro)/.test(p)) return "central"
  if (/(ponteir|passador|outside|ponta|entrada)/.test(p)) return "ponteira"
  return "outro"
}

/** Idade atual (anos completos) a partir da data de nascimento. */
export function ageFromBirthDate(birthDate: string | null | undefined, reference = new Date()): number | null {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return null
  let age = reference.getFullYear() - d.getFullYear()
  const m = reference.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && reference.getDate() < d.getDate())) age--
  return age >= 0 && age < 120 ? age : null
}

/**
 * Idade na temporada: idade que a atleta completa no ano da temporada.
 * Usada como referência etária estável ao longo do ano competitivo.
 */
export function ageInSeason(birthDate: string | null | undefined, season: number): number | null {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return null
  const age = season - d.getFullYear()
  return age >= 0 && age < 120 ? age : null
}

/** Ano de nascimento (chave da faixa etária ±1 ano no banco). */
export function birthYearOf(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return null
  return d.getFullYear()
}

/** Temporada corrente (ano). Ajuste manual da categoria continua no app. */
export function currentSeason(reference = new Date()): number {
  return reference.getFullYear()
}

/** Resultado agregado devolvido pela função `vib_compare` do banco. */
export interface VibCompareResult {
  sampleSize: number
  /** Faixa estatística da atleta (1 = topo, 4 = base). */
  band: number
  /** true quando o IGD da atleta está acima da média da própria Faixa 1. */
  isExcellent: boolean
  bandAverages: [number | null, number | null, number | null, number | null]
  bandMins: [number | null, number | null, number | null, number | null]
}

/**
 * Deriva a classificação visual do VIB a partir do resultado agregado.
 * Faixa 1 = Muito Bom, 2 = Bom, 3 = Neutro, 4 = Abaixo; acima da média da
 * Faixa 1 = Excelente (sem criar uma 5ª faixa).
 */
export function classifyVib(result: VibCompareResult | null): VibClassification {
  if (!result || result.sampleSize === 0) return "sem_dados"
  if (result.isExcellent) return "excelente"
  switch (result.band) {
    case 1:
      return "muito_bom"
    case 2:
      return "bom"
    case 3:
      return "neutro"
    default:
      return "abaixo"
  }
}

/** Média do IGD da Faixa 1 (referência principal exibida no perfil). */
export function band1Average(result: VibCompareResult | null): number | null {
  return result?.bandAverages[0] ?? null
}

/** Cor semântica (token) por classificação, para uso na UI. */
export function classificationTone(c: VibClassification): {
  text: string
  bg: string
  border: string
} {
  switch (c) {
    case "excelente":
      return { text: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-300" }
    case "muito_bom":
      return { text: "text-blue-700", bg: "bg-blue-100", border: "border-blue-300" }
    case "bom":
      return { text: "text-cyan-700", bg: "bg-cyan-100", border: "border-cyan-300" }
    case "neutro":
      return { text: "text-amber-700", bg: "bg-amber-100", border: "border-amber-300" }
    case "abaixo":
      return { text: "text-red-700", bg: "bg-red-100", border: "border-red-300" }
    default:
      return { text: "text-slate-500", bg: "bg-slate-100", border: "border-slate-300" }
  }
}
