/**
 * Fórmula DEFINITIVA do TGP (Total Great Percentage) — usada de forma idêntica
 * no Scout Volleyball, no Scout View e na Volley Hub, para que o percentual
 * exibido em qualquer tela seja sempre o mesmo.
 *
 *   TGP = 35·( T / (T + 20) ) + 45·( TP / T ) + 20·( TG / TP )
 *
 * Onde, para CADA atleta (auto-contido, sem depender da equipe):
 *   T  = total de ações   = TP + TE
 *   TP = total de ações positivas
 *   TE = total de erros
 *   TG = Total Great       = pontos feitos pela atleta
 *        (ataque convertido + ace de saque + pontos de bloqueio)
 *
 * Interpretação dos pesos:
 *   35 → volume de participação (quanto mais joga, mais estável a nota);
 *   45 → eficiência (proporção de ações positivas);
 *   20 → letalidade (proporção das positivas que viraram ponto).
 */

export interface TgpInput {
  /** Total de ações positivas. */
  tp: number
  /** Total de erros. */
  te: number
  /** Total Great: pontos feitos pela atleta. */
  tg: number
}

/**
 * Calcula o TGP (0-100, arredondado) a partir de TP, TE e TG.
 * Retorna 0 quando não há ações registradas.
 */
export function computeTGP({ tp, te, tg }: TgpInput): number {
  const T = tp + te
  if (T <= 0) return 0

  const volume = T / (T + 20)
  const efficiency = tp / T
  const lethality = tp > 0 ? tg / tp : 0

  const tgp = 35 * volume + 45 * efficiency + 20 * lethality
  return Math.round(Math.min(100, Math.max(0, tgp)))
}
