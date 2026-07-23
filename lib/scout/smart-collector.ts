import type { MatchAction } from "@/lib/scout/match-parser"

/**
 * ============================================================================
 * Coletor Inteligente do Scout Volleyball — camada de domínio
 * ----------------------------------------------------------------------------
 * Toda a "inteligência" da leitura do voleibol fica aqui, em funções puras.
 * O painel (UI) apenas captura a sequência de ações e delega para estas
 * funções. A saída principal é uma lista de `MatchAction` 100% compatível com
 * o sistema atual (estatísticas, gráficos, planilhas, PDFs) — nada do modelo
 * existente é alterado. Dados granulares adicionais (toque a toque + direção
 * do ataque inferida) são retornados à parte, como "extras".
 * ============================================================================
 */

export type PlayerRole = "levantador" | "oposto" | "ponteiro" | "central" | "libero"

export const ROLE_OPTIONS: { value: PlayerRole; label: string; short: string }[] = [
  { value: "levantador", label: "Levantador", short: "LEV" },
  { value: "oposto", label: "Oposto", short: "OP" },
  { value: "ponteiro", label: "Ponteiro", short: "PO" },
  { value: "central", label: "Central", short: "CE" },
  { value: "libero", label: "Líbero", short: "LI" },
]

export const ROLE_LABEL: Record<PlayerRole, string> = {
  levantador: "Levantador",
  oposto: "Oposto",
  ponteiro: "Ponteiro",
  central: "Central",
  libero: "Líbero",
}

/** Posições da quadra (rodízio). 1 = sacador (fundo direita). */
export type CourtPos = 1 | 2 | 3 | 4 | 5 | 6

/** Posições da linha de fundo, onde o líbero pode atuar. */
export const BACK_ROW: CourtPos[] = [1, 6, 5]
export const FRONT_ROW: CourtPos[] = [4, 3, 2]

/** Fundamentos registrados pelo operador. */
export type Fundamento = "S" | "P" | "L" | "A" | "B" | "D"

export const FUNDAMENTO_LABEL: Record<Fundamento, string> = {
  S: "Saque",
  P: "Passe",
  L: "Levantamento",
  A: "Ataque",
  B: "Bloqueio",
  D: "Defesa",
}

/** Token de ataque (compatível com o campo attackPosition do MatchAction). */
export type AttackToken = "P" | "M" | "O" | "F" | "S"

/**
 * Formação em quadra de uma equipe: mapa posição(1..6) -> número do atleta.
 * É a base para os "botões inteligentes" e para o rodízio automático.
 */
export type Formation = Record<CourtPos, number>

export interface TeamSetup {
  /** Formação inicial informada pelo operador antes da partida. */
  formation: Formation
  /** Função de cada atleta (por número). */
  roles: Record<number, PlayerRole>
  /** Número do líbero (se houver). */
  liberoNumber?: number
  /**
   * Posição defensiva configurável por FUNÇÃO. Define para onde cada atleta vai
   * durante a defesa (após o saque adversário). Recepção usa a formação normal.
   */
  defensiveByRole: Record<PlayerRole, CourtPos>
}

/** Posições defensivas padrão por função (configuráveis antes da partida). */
export const DEFAULT_DEFENSIVE_BY_ROLE: Record<PlayerRole, CourtPos> = {
  libero: 5,
  central: 5,
  ponteiro: 6,
  levantador: 1,
  oposto: 1,
}

// ---------------------------------------------------------------------------
// Rodízio + Líbero
// ---------------------------------------------------------------------------

/**
 * Aplica UM rodízio no sentido horário. O atleta que estava na P2 vai para P1,
 * P1->P6, P6->P5, P5->P4, P4->P3, P3->P2.
 */
export function rotateFormation(f: Formation): Formation {
  return {
    1: f[2],
    6: f[1],
    5: f[6],
    4: f[5],
    3: f[4],
    2: f[3],
  }
}

/**
 * Retorna a formação "em quadra" considerando a entrada automática do líbero:
 * quando um Central está na linha de fundo (P1/P6/P5), o líbero assume aquela
 * posição. Quando o Central sobe para a rede, o líbero sai.
 * A `baseFormation` (rodízio real) é sempre preservada; esta função só decide
 * quem aparece nos botões/quadra.
 */
export function applyLibero(baseFormation: Formation, setup: TeamSetup): Formation {
  const libero = setup.liberoNumber
  if (!libero) return baseFormation

  const result: Formation = { ...baseFormation }
  for (const pos of BACK_ROW) {
    const playerNumber = baseFormation[pos]
    if (setup.roles[playerNumber] === "central") {
      result[pos] = libero
    }
  }
  return result
}

/** Descobre em qual posição (1..6) está determinado atleta. */
export function findPosition(f: Formation, playerNumber: number): CourtPos | null {
  for (const pos of [1, 2, 3, 4, 5, 6] as CourtPos[]) {
    if (f[pos] === playerNumber) return pos
  }
  return null
}

/** Sistema de rodízio (6x1 etc.) apenas para exibição — nº de atacantes na rede. */
export function describeSystem(setup: TeamSetup): string {
  const setterCount = Object.values(setup.roles).filter((r) => r === "levantador").length
  if (setterCount >= 2) return "6x2"
  return "5x1"
}

// ---------------------------------------------------------------------------
// Levantador
// ---------------------------------------------------------------------------

/** Retorna o número do levantador que está em quadra na formação dada. */
export function findSetter(courtFormation: Formation, setup: TeamSetup): number | null {
  for (const pos of [1, 2, 3, 4, 5, 6] as CourtPos[]) {
    const n = courtFormation[pos]
    if (setup.roles[n] === "levantador") return n
  }
  return null
}

// ---------------------------------------------------------------------------
// Direção automática do ataque
// ---------------------------------------------------------------------------

export type AttackDirection =
  | "diagonal_curta"
  | "diagonal_media"
  | "paragonal"
  | "paralela"
  | "meio_p5"
  | "meio_p6"
  | "meio_p1"
  | "indefinida"

export const DIRECTION_LABEL: Record<AttackDirection, string> = {
  diagonal_curta: "Diagonal Curta",
  diagonal_media: "Diagonal Média/Longa",
  paragonal: "Paragonal",
  paralela: "Paralela",
  meio_p5: "Fundo P5",
  meio_p6: "Fundo P6",
  meio_p1: "Fundo P1",
  indefinida: "Indefinida",
}

/**
 * Origem do ataque para fins de leitura de direção.
 * - saida  = ataque pela ponta/saída (P4)
 * - entrada = ataque pela entrada/oposto (P2)
 * - meio   = ataque de meio (P3)
 * - fundo  = pipe / fundo
 */
export type AttackOrigin = "saida" | "entrada" | "meio" | "fundo"

/** Converte token de ataque na posição de bloqueio usada pelo MatchAction. */
function blockPosFromToken(token?: AttackToken): "O" | "M" | "P" | "FS" {
  switch (token) {
    case "O":
      return "O"
    case "M":
      return "M"
    case "F":
    case "S":
      return "FS"
    default:
      return "P"
  }
}

/**
 * Converte o token de ataque (attackPosition) na origem usada para leitura.
 * Ponta => saída; Oposto => entrada; Meio => meio; Fundo/Segunda => fundo.
 */
export function attackTokenToOrigin(token: AttackToken): AttackOrigin {
  switch (token) {
    case "P":
      return "saida"
    case "O":
      return "entrada"
    case "M":
      return "meio"
    case "F":
    case "S":
      return "fundo"
  }
}

/**
 * Infere a direção do ataque a partir da ORIGEM do ataque e da posição de quem
 * DEFENDEU (P1..P6). Baseado nas regras do voleibol descritas pelo usuário:
 *
 *  Ataque pela Saída (P4):   Def P5 => diagonal média/longa; P6 => paragonal;
 *                            P1 => paralela; P4 => diagonal curta.
 *  Ataque pela Entrada (P2): leitura espelhada (P1<->P5).
 *  Ataque de Meio/Pipe:      interpretado pela posição do defensor (P5/P6/P1).
 */
export function inferAttackDirection(origin: AttackOrigin, defenderPos: CourtPos | null): AttackDirection {
  if (!defenderPos) return "indefinida"

  if (origin === "saida") {
    if (defenderPos === 5) return "diagonal_media"
    if (defenderPos === 6) return "paragonal"
    if (defenderPos === 1) return "paralela"
    if (defenderPos === 4) return "diagonal_curta"
    return "indefinida"
  }

  if (origin === "entrada") {
    // Espelhado em relação à saída.
    if (defenderPos === 1) return "diagonal_media"
    if (defenderPos === 6) return "paragonal"
    if (defenderPos === 5) return "paralela"
    if (defenderPos === 2) return "diagonal_curta"
    return "indefinida"
  }

  // Meio e Fundo/Pipe: leitura direta pela zona de fundo do defensor.
  if (defenderPos === 5) return "meio_p5"
  if (defenderPos === 6) return "meio_p6"
  if (defenderPos === 1) return "meio_p1"
  return "indefinida"
}

/** Direções possíveis quando o ataque termina em ponto (sem defesa para inferir). */
export function possibleDirections(origin: AttackOrigin): { value: AttackDirection; label: string }[] {
  if (origin === "saida" || origin === "entrada") {
    return [
      { value: "diagonal_curta", label: DIRECTION_LABEL.diagonal_curta },
      { value: "diagonal_media", label: DIRECTION_LABEL.diagonal_media },
      { value: "paragonal", label: DIRECTION_LABEL.paragonal },
      { value: "paralela", label: DIRECTION_LABEL.paralela },
    ]
  }
  return [
    { value: "meio_p5", label: DIRECTION_LABEL.meio_p5 },
    { value: "meio_p6", label: DIRECTION_LABEL.meio_p6 },
    { value: "meio_p1", label: DIRECTION_LABEL.meio_p1 },
  ]
}

// ---------------------------------------------------------------------------
// Modelo do rally (toque a toque) + tradução para MatchAction[]
// ---------------------------------------------------------------------------

/** Um toque registrado pelo operador durante o rally. */
export interface Touch {
  team: "A" | "B"
  player: number
  /** Posição de quadra do atleta no momento (para leitura de direção/defesa). */
  courtPos: CourtPos | null
  fundamento: Fundamento
  /** Token de ataque, quando fundamento = A. */
  attackToken?: AttackToken
  /** true = ação positiva (padrão); false = negativa. */
  positive: boolean
}

/** Encerramento do rally: ponto (#) ou erro (E) no último toque. */
export type RallyEnd = "point" | "error"

export interface RallyResult {
  /** Ações compatíveis com o sistema atual (alimentam TODAS as estatísticas). */
  actions: MatchAction[]
  /** Equipe que marcou o ponto. */
  pointScoredBy: "A" | "B"
  /** Extras granulares (não alteram dashboards; guardados para uso futuro). */
  extras: {
    touches: Touch[]
    attackDirection?: AttackDirection
    attackOrigin?: AttackOrigin
  }
}

let actionSeq = 0
function newId() {
  actionSeq += 1
  return `smart-${Date.now()}-${actionSeq}`
}

/**
 * Traduz a sequência de toques de um rally em ações compatíveis com o
 * `MatchAction` atual. A regra central é que apenas o ÚLTIMO toque encerra o
 * ponto; os toques intermediários viram ações não-pontuais (recepção A/B/C,
 * defesa "D"), exatamente como o coletor antigo fazia — preservando a lógica de
 * pontuação e o rodízio do restante do sistema.
 *
 * @param defenderPosResolver função que devolve a posição defensiva de um
 *   atleta (para inferir direção do ataque terminado em ponto por defesa).
 */
export function finalizeRally(
  touches: Touch[],
  end: RallyEnd,
  directionOverride?: AttackDirection,
): RallyResult {
  const actions: MatchAction[] = []
  // Garante os campos obrigatórios do MatchAction. serveQuality é obrigatório no
  // contrato; usamos "+" (saque em jogo) como padrão para ações não relacionadas
  // ao saque, exatamente como o coletor antigo assumia.
  const emit = (a: Partial<MatchAction> & Pick<MatchAction, "servingTeam" | "servingPlayer" | "attackingTeam">) => {
    actions.push({
      id: newId(),
      timestamp: Date.now(),
      serveQuality: "+",
      ...a,
    } as MatchAction)
  }
  if (touches.length === 0) {
    return { actions, pointScoredBy: "A", extras: { touches } }
  }

  const serve = touches.find((t) => t.fundamento === "S")
  const servingTeam: "A" | "B" = serve ? serve.team : touches[0].team
  const servingPlayer = serve ? serve.player : 0
  const lastTouch = touches[touches.length - 1]

  // Recepção: primeiro passe após o saque, feito pela equipe adversária ao saque.
  const reception = touches.find((t) => t.fundamento === "P" && t.team !== servingTeam)

  // ---- Caso 1: rally decidido no próprio saque (ace ou erro) -------------
  const serveIsTerminal = lastTouch.fundamento === "S"
  if (serveIsTerminal) {
    if (end === "point") {
      // Ace: ponto de quem sacou.
      emit({
        servingTeam,
        servingPlayer,
        serveQuality: "ka",
        attackingTeam: servingTeam === "A" ? "B" : "A",
      })
      return { actions, pointScoredBy: servingTeam, extras: { touches } }
    }
    // Erro de saque: ponto do adversário.
    emit({
      servingTeam,
      servingPlayer,
      serveQuality: "-",
      attackingTeam: servingTeam === "A" ? "B" : "A",
    })
    return { actions, pointScoredBy: servingTeam === "A" ? "B" : "A", extras: { touches } }
  }

  // Base do saque (em jogo) + recepção, quando existirem.
  const receivingTeam: "A" | "B" = servingTeam === "A" ? "B" : "A"
  const passingQuality: "A" | "B" | "C" | "D" | undefined = reception
    ? reception.positive
      ? "A"
      : "C"
    : undefined

  // Se houve saque em jogo, registra a ação de saque+recepção (não-pontual).
  if (serve) {
    emit({
      servingTeam,
      servingPlayer,
      serveQuality: "+",
      serveZone: undefined,
      passingQuality: passingQuality ?? "A",
      passingPlayer: reception?.player ?? 0,
      attackingTeam: receivingTeam,
    })
  }

  // ---- Defesas intermediárias (transição): cada defesa vira ação "D" ------
  // Uma defesa "não terminal" mantém o rally vivo e credita defesa + o ataque
  // anterior do adversário. Iteramos pelos toques de defesa que NÃO sejam o
  // último toque do rally.
  for (let i = 0; i < touches.length - 1; i++) {
    const t = touches[i]
    if (t.fundamento !== "D") continue
    // Procura o ataque imediatamente anterior (do time adversário) para creditar.
    let atk: Touch | undefined
    for (let j = i - 1; j >= 0; j--) {
      if (touches[j].fundamento === "A") {
        atk = touches[j]
        break
      }
    }
    if (atk) {
      emit({
        servingTeam,
        servingPlayer,
        attackingTeam: atk.team,
        attackPosition: atk.attackToken ?? "P",
        resultComplemento: "D",
        actionPlayer: atk.player,
        defensivePlayer: t.player,
      })
    }
  }

  // ---- Toque final: decide o ponto ---------------------------------------
  const attackOrigin = lastTouch.attackToken ? attackTokenToOrigin(lastTouch.attackToken) : undefined

  if (lastTouch.fundamento === "A") {
    const attackingTeam = lastTouch.team
    const defendingTeam = attackingTeam === "A" ? "B" : "A"

    if (end === "point") {
      // Ataque ponto. Direção vem do painel (override) quando não há defesa.
      emit({
        servingTeam,
        servingPlayer,
        attackingTeam,
        attackPosition: lastTouch.attackToken ?? "P",
        resultComplemento: "#",
        actionPlayer: lastTouch.player,
      })
      return {
        actions,
        pointScoredBy: attackingTeam,
        extras: { touches, attackDirection: directionOverride, attackOrigin },
      }
    }
    // Ataque erro: ponto do adversário.
    emit({
      servingTeam,
      servingPlayer,
      attackingTeam,
      attackPosition: lastTouch.attackToken ?? "P",
      resultComplemento: "!",
      actionPlayer: lastTouch.player,
    })
    return { actions, pointScoredBy: defendingTeam, extras: { touches, attackOrigin } }
  }

  if (lastTouch.fundamento === "B") {
    // Bloqueio: o último toque é um bloqueio da equipe `lastTouch.team`.
    // Modelamos como ataque adversário bloqueado ("+"), creditando o bloqueio.
    const blockingTeam = lastTouch.team
    const attackingTeam = blockingTeam === "A" ? "B" : "A"
    // Ataque anterior (do time adversário ao bloqueador).
    let atk: Touch | undefined
    for (let j = touches.length - 2; j >= 0; j--) {
      if (touches[j].fundamento === "A" && touches[j].team === attackingTeam) {
        atk = touches[j]
        break
      }
    }
    if (end === "point") {
      emit({
        servingTeam,
        servingPlayer,
        attackingTeam,
        attackPosition: atk?.attackToken ?? "P",
        resultComplemento: "+",
        actionPlayer: atk?.player ?? 0,
        blockingPlayer: lastTouch.player,
        blockingPosition: blockPosFromToken(atk?.attackToken),
      })
      return { actions, pointScoredBy: blockingTeam, extras: { touches } }
    }
    // Erro de bloqueio (bola na rede/fora): ponto do time atacante.
    emit({
      servingTeam,
      servingPlayer,
      attackingTeam,
      attackPosition: atk?.attackToken ?? "P",
      resultComplemento: "#",
      actionPlayer: atk?.player ?? 0,
    })
    return { actions, pointScoredBy: attackingTeam, extras: { touches } }
  }

  if (lastTouch.fundamento === "S") {
    // Já tratado acima.
  }

  // ---- Toque final genérico (P/L/D terminando o rally) --------------------
  // Erro em passe/levantamento/defesa: ponto do adversário do time do toque.
  const teamOfLast = lastTouch.team
  const opp = teamOfLast === "A" ? "B" : "A"
  if (end === "error") {
    // Erro genérico modelado como erro de ataque do time (mantém contabilidade
    // de ponto correta para o placar/sets).
    emit({
      servingTeam,
      servingPlayer,
      attackingTeam: teamOfLast,
      attackPosition: "P",
      resultComplemento: "!",
      actionPlayer: lastTouch.player,
    })
    return { actions, pointScoredBy: opp, extras: { touches } }
  }
  // Ponto genérico para o time do último toque.
  emit({
    servingTeam,
    servingPlayer,
    attackingTeam: teamOfLast,
    attackPosition: "P",
    resultComplemento: "#",
    actionPlayer: lastTouch.player,
  })
  return { actions, pointScoredBy: teamOfLast, extras: { touches } }
}
