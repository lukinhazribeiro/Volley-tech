// Tipos centrais do módulo de Scout Automático por Vídeo.
// Mantidos isolados para facilitar a integração em outros projetos.

export type Fundamento =
  | "saque"
  | "recepcao"
  | "levantamento"
  | "ataque"
  | "bloqueio"
  | "defesa"

export type Resultado = "ponto" | "erro" | "continuidade"

export type TeamSide = "casa" | "adversario"

/** Posições de rodízio do voleibol. P1 = sacador. */
export type Posicao = "P1" | "P2" | "P3" | "P4" | "P5" | "P6"

/**
 * Detalhes específicos por fundamento (sub-classificação):
 * - levantamento: para onde foi a bola.
 * - bloqueio: posição em que o ponto de bloqueio foi feito.
 * - defesa: tipo de defesa.
 */
export type LevantamentoAlvo =
  | "ponta"
  | "meio"
  | "oposto"
  | "fundo"
  | "segunda"
  | "erro"
export type BloqueioPosicao = "ponta" | "meio" | "oposto"
export type DefesaTipo = "ataque" | "volume" | "recuperacao"

/** Função do atleta no sistema 5x1. */
export type PlayerRole =
  | "levantador"
  | "central"
  | "oposto"
  | "ponteiro"
  | "libero"
  | null

export interface Player {
  id: string
  number: number
  name: string
  team: TeamSide
  /** Posição em quadra (P1-P6) na formação manual. Reservas ficam sem posição. */
  posicao?: Posicao | null
  /** Função no sistema 5x1 (levantador, central, oposto, ponteiro, líbero). */
  role?: PlayerRole
}

export const ROLE_LABEL: Record<NonNullable<PlayerRole>, string> = {
  levantador: "Levantador",
  central: "Central",
  oposto: "Oposto",
  ponteiro: "Ponteiro",
  libero: "Líbero",
}

export const ROLE_SHORT: Record<NonNullable<PlayerRole>, string> = {
  levantador: "L",
  central: "C",
  oposto: "O",
  ponteiro: "P",
  libero: "Líb",
}

/** Qualidade da ação no painel ao vivo (mapeia para Resultado). */
export type Qualidade = "ponto" | "perfeito" | "positivo" | "erro"

export interface ScoutAction {
  id: string
  rallyId: string
  /** Momento da ação em segundos dentro do vídeo. */
  timestamp: number
  fundamento: Fundamento
  resultado: Resultado
  playerId: string | null
  /** Sub-classificação dependente do fundamento (alvo, posição ou tipo). */
  detalhe?: string | null
  /** Qualidade detalhada (ponto, perfeito, positivo, erro) usada no painel. */
  qualidade?: Qualidade | null
  /** Posição de quadra em que a ação ocorreu (P1-P6). */
  posicao?: Posicao | null
  /** Equipe que executou a ação. */
  team?: TeamSide
  /** Indica que a ação foi inserida automaticamente (ex.: levantamento antes do ataque). */
  auto?: boolean
  /** Confiança da IA entre 0 e 1. */
  confidence: number
  /** Indica se o usuário já validou/corrigiu a ação. */
  validated: boolean
}

export interface Rally {
  id: string
  index: number
  startTime: number
  endTime: number
  /** Lado que pontuou no fim do rally. */
  winner: TeamSide | null
}

export interface ScoutAnalysis {
  videoName: string
  videoDuration: number
  rallies: Rally[]
  actions: ScoutAction[]
  players: Player[]
}

// ---- Rótulos e estilos reutilizáveis ----

export const FUNDAMENTO_LABEL: Record<Fundamento, string> = {
  saque: "Saque",
  recepcao: "Recepção",
  levantamento: "Levantamento",
  ataque: "Ataque",
  bloqueio: "Bloqueio",
  defesa: "Defesa",
}

export const FUNDAMENTO_ORDER: Fundamento[] = [
  "saque",
  "recepcao",
  "levantamento",
  "ataque",
  "bloqueio",
  "defesa",
]

export const RESULTADO_LABEL: Record<Resultado, string> = {
  ponto: "Ponto",
  erro: "Erro",
  continuidade: "Continuidade",
}

/**
 * Cores por fundamento usando classes utilitárias.
 * Paleta controlada: azul (primária), mais tons de apoio.
 */
export const FUNDAMENTO_STYLE: Record<
  Fundamento,
  { dot: string; chip: string; bar: string }
> = {
  saque: {
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    bar: "bg-sky-500",
  },
  recepcao: {
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bar: "bg-emerald-500",
  },
  levantamento: {
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    bar: "bg-amber-500",
  },
  ataque: {
    dot: "bg-blue-500",
    chip: "bg-blue-50 text-blue-700 border-blue-200",
    bar: "bg-blue-500",
  },
  bloqueio: {
    dot: "bg-indigo-500",
    chip: "bg-indigo-50 text-indigo-700 border-indigo-200",
    bar: "bg-indigo-500",
  },
  defesa: {
    dot: "bg-teal-500",
    chip: "bg-teal-50 text-teal-700 border-teal-200",
    bar: "bg-teal-500",
  },
}

export const RESULTADO_STYLE: Record<Resultado, string> = {
  ponto: "bg-emerald-50 text-emerald-700 border-emerald-200",
  erro: "bg-red-50 text-red-700 border-red-200",
  continuidade: "bg-slate-100 text-slate-600 border-slate-200",
}

export const TEAM_LABEL: Record<TeamSide, string> = {
  casa: "Casa",
  adversario: "Adversário",
}

/** Cores por equipe (Casa = azul, Adversário = laranja). */
export const TEAM_STYLE: Record<TeamSide, { chip: string; hex: string }> = {
  casa: { chip: "bg-blue-50 text-blue-700 border-blue-200", hex: "#3b82f6" },
  adversario: {
    chip: "bg-orange-50 text-orange-700 border-orange-200",
    hex: "#f97316",
  },
}

/** Cores em hex por fundamento (para gráficos). */
export const FUNDAMENTO_HEX: Record<Fundamento, string> = {
  saque: "#0ea5e9",
  recepcao: "#10b981",
  levantamento: "#f59e0b",
  ataque: "#3b82f6",
  bloqueio: "#8b5cf6",
  defesa: "#14b8a6",
}

// ---- Posições de quadra (formação manual) ----

export const POSICAO_ORDER: Posicao[] = ["P1", "P2", "P3", "P4", "P5", "P6"]

export const POSICAO_INFO: Record<
  Posicao,
  { zona: string; linha: "rede" | "fundo" }
> = {
  P4: { zona: "Rede esquerda", linha: "rede" },
  P3: { zona: "Rede meio", linha: "rede" },
  P2: { zona: "Rede direita", linha: "rede" },
  P5: { zona: "Fundo esquerda", linha: "fundo" },
  P6: { zona: "Fundo meio", linha: "fundo" },
  P1: { zona: "Saque / Fundo direita", linha: "fundo" },
}

// ---- Rótulos dos detalhes por fundamento ----

export const LEVANTAMENTO_LABEL: Record<LevantamentoAlvo, string> = {
  ponta: "Ponta (P)",
  meio: "Meio (M)",
  oposto: "Oposto (O)",
  fundo: "Fundo (F)",
  segunda: "Segunda (S/F)",
  erro: "Erro (E)",
}

export const BLOQUEIO_LABEL: Record<BloqueioPosicao, string> = {
  ponta: "Ponta",
  meio: "Meio",
  oposto: "Oposto",
}

export const DEFESA_LABEL: Record<DefesaTipo, string> = {
  ataque: "Defesa de ataque",
  volume: "Passe de volume",
  recuperacao: "Recuperação de bloqueio",
}

/** Zona/tipo do ataque conforme a posição do atacante. */
export type AtaqueZona = "ponta" | "meio" | "oposto" | "fundo" | "segunda"

export const ATAQUE_ZONA_LABEL: Record<AtaqueZona, string> = {
  ponta: "Ponta (P4)",
  meio: "Meio (P3)",
  oposto: "Oposto (P2)",
  fundo: "Fundo (P1/P6)",
  segunda: "Bola de Segunda",
}

/** Fundamentos que usam o campo `detalhe` (sub-classificação). */
export const FUNDAMENTOS_COM_DETALHE: Fundamento[] = [
  "levantamento",
  "bloqueio",
  "defesa",
]

/** Opções de detalhe disponíveis por fundamento (para o editor). */
export const DETALHE_OPCOES: Partial<Record<Fundamento, { value: string; label: string }[]>> = {
  levantamento: (["ponta", "meio", "oposto", "fundo", "segunda", "erro"] as LevantamentoAlvo[]).map(
    (k) => ({ value: k, label: LEVANTAMENTO_LABEL[k] }),
  ),
  ataque: (["ponta", "meio", "oposto", "fundo", "segunda"] as AtaqueZona[]).map((k) => ({
    value: k,
    label: ATAQUE_ZONA_LABEL[k],
  })),
  bloqueio: (["ponta", "meio", "oposto"] as BloqueioPosicao[]).map((k) => ({
    value: k,
    label: BLOQUEIO_LABEL[k],
  })),
  defesa: (["ataque", "volume", "recuperacao"] as DefesaTipo[]).map((k) => ({
    value: k,
    label: DEFESA_LABEL[k],
  })),
}

// ---- Qualidade da ação (painel ao vivo) ----

export const QUALIDADE_LABEL: Record<Qualidade, string> = {
  ponto: "Ponto",
  perfeito: "Perfeito",
  positivo: "Positivo",
  erro: "Erro",
}

export const QUALIDADE_STYLE: Record<Qualidade, string> = {
  ponto: "text-emerald-600",
  perfeito: "text-emerald-600",
  positivo: "text-emerald-600",
  erro: "text-red-600",
}

/** Converte a qualidade detalhada no Resultado simples para estatísticas. */
export function qualidadeToResultado(q: Qualidade): Resultado {
  if (q === "ponto") return "ponto"
  if (q === "erro") return "erro"
  return "continuidade"
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}
