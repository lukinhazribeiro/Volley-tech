// Modelo de partida ao vivo do Painel de Análise.
// Regras de pontuação por ação, transições, líbero e substituição.
// Mantido isolado para fácil integração.

import {
  POSICAO_ORDER,
  qualidadeToResultado,
  type Fundamento,
  type Player,
  type PlayerRole,
  type Posicao,
  type Qualidade,
  type ScoutAction,
  type TeamSide,
} from "./types"

/** Configuração de uma equipe na partida. */
export interface TeamConfig {
  side: TeamSide
  name: string
  /** Elenco completo (titulares + reservas + líbero). */
  players: Player[]
  /** Jogador (rosterId) em cada posição de quadra. */
  formation: Record<Posicao, string | null>
  /** Id do líbero (rosterId) ou null. */
  liberoId: string | null
  /** Ids dos atletas que o líbero substitui no fundo (revezamento). */
  liberoReplaces: string[]
  /** Posição do levantador (para o auto-levantamento antes do ataque). */
  setterPosicao: Posicao
}

export interface MatchState {
  teamA: TeamConfig
  teamB: TeamConfig
  actions: ScoutAction[]
  scoreA: number
  scoreB: number
  set: number
  /** Rally atual (incrementa quando um ponto é marcado). */
  currentRally: number
  /** Equipe que está sacando no momento (define a rotação por sideout). */
  servingTeam: TeamSide | null
}

/** Posições de fundo de quadra. */
export const BACK_ROW: Posicao[] = ["P1", "P6", "P5"]

/**
 * Posições de fundo onde o líbero reveza o central. Inclui as três posições de
 * fundo (P1, P6, P5). A regra do saque é tratada à parte em `liberoEntraNaPosicao`:
 * o líbero NÃO pode sacar, então, enquanto a equipe está SACANDO, o central
 * permanece na P1 para executar o saque; assim que a equipe deixa de sacar
 * (a outra equipe passa a sacar), o líbero assume a P1 imediatamente — sem
 * precisar esperar a próxima rotação.
 */
export const LIBERO_POSICOES: Posicao[] = ["P1", "P6", "P5"]

const FRONT_ROW: Posicao[] = ["P4", "P3", "P2"]

/**
 * Rotação no sentido horário: cada atleta avança uma posição.
 * P2→P1, P1→P6, P6→P5, P5→P4, P4→P3, P3→P2.
 */
const ROTATE_CLOCKWISE: Record<Posicao, Posicao> = {
  P2: "P1",
  P1: "P6",
  P6: "P5",
  P5: "P4",
  P4: "P3",
  P3: "P2",
}

/** Gira a equipe no sentido horário (formação + posição do levantador). */
function rotateTeamClockwise(team: TeamConfig): TeamConfig {
  const novaFormacao = {} as Record<Posicao, string | null>
  for (const pos of POSICAO_ORDER) {
    novaFormacao[ROTATE_CLOCKWISE[pos]] = team.formation[pos]
  }
  return {
    ...team,
    formation: novaFormacao,
    setterPosicao: ROTATE_CLOCKWISE[team.setterPosicao],
  }
}

let counter = 0
function uid(prefix: string) {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}_${counter}`
}

/**
 * Cria uma equipe padrão no sistema 5x1 com os atletas numerados de 1 a 14 em
 * sequência (fáceis de editar depois). Os 6 primeiros entram em quadra numa
 * formação válida (centrais opostos entre si, levantador na P1):
 *  #1 = P1 levantador, #2 = P2 central, #3 = P3 ponteiro,
 *  #4 = P4 oposto,     #5 = P5 central, #6 = P6 ponteiro.
 * #7 é o líbero e #8 a #14 são reservas. Assim sempre há exatamente um central
 * no fundo, substituível pelo líbero, e a numeração fica limpa (1..14).
 */
export function createTeam(side: TeamSide, name: string): TeamConfig {
  const base: { num: number; pos: Posicao; role: PlayerRole }[] = [
    { num: 1, pos: "P1", role: "levantador" },
    { num: 2, pos: "P2", role: "central" },
    { num: 3, pos: "P3", role: "ponteiro" },
    { num: 4, pos: "P4", role: "oposto" },
    { num: 5, pos: "P5", role: "central" },
    { num: 6, pos: "P6", role: "ponteiro" },
  ]
  const players: Player[] = base.map((b) => ({
    id: uid("pl"),
    number: b.num,
    name: `Atleta ${b.num}`,
    team: side,
    posicao: b.pos,
    role: b.role,
  }))
  const libero: Player = {
    id: uid("pl"),
    number: 7,
    name: "Atleta 7",
    team: side,
    posicao: null,
    role: "libero",
  }
  // Reservas numeradas em sequência de 8 a 14, mantendo o elenco de 1 a 14.
  const reservas: Player[] = []
  for (let n = 8; n <= 14; n++) {
    reservas.push({
      id: uid("pl"),
      number: n,
      name: `Atleta ${n}`,
      team: side,
      posicao: null,
      role: null,
    })
  }

  const formation = {} as Record<Posicao, string | null>
  base.forEach((b, i) => {
    formation[b.pos] = players[i].id
  })

  // O líbero reveza com os dois centrais (entra por quem estiver no fundo).
  const centraisIds = players.filter((p) => p.role === "central").map((p) => p.id)

  return {
    side,
    name,
    players: [...players, libero, ...reservas],
    formation,
    liberoId: libero.id,
    liberoReplaces: centraisIds,
    setterPosicao: "P1",
  }
}

export function createMatch(): MatchState {
  return {
    teamA: createTeam("casa", "Equipe A"),
    teamB: createTeam("adversario", "Equipe B"),
    actions: [],
    scoreA: 0,
    scoreB: 0,
    set: 1,
    currentRally: 1,
    servingTeam: null,
  }
}

/**
 * Encerra o set atual e prepara o próximo: mantém as equipes (elenco, formação,
 * líbero) e zera placar, ações, rally e saque, incrementando o número do set.
 * O set encerrado deve ser salvo no histórico ANTES de chamar esta função.
 */
export function nextSet(state: MatchState): MatchState {
  return {
    ...state,
    actions: [],
    scoreA: 0,
    scoreB: 0,
    set: state.set + 1,
    currentRally: 1,
    servingTeam: null,
  }
}

/** Aplica a pontuação e a rotação por sideout, retornando o novo estado parcial. */
function applyScoring(
  state: MatchState,
  scoringTeam: TeamSide,
): Pick<MatchState, "scoreA" | "scoreB" | "currentRally" | "servingTeam" | "teamA" | "teamB"> {
  let { scoreA, scoreB, currentRally, servingTeam, teamA, teamB } = state
  if (scoringTeam === "casa") scoreA += 1
  else scoreB += 1
  currentRally += 1

  // Rotação por sideout: quem pontua sem estar sacando recupera o saque e gira.
  if (servingTeam !== null && servingTeam !== scoringTeam) {
    if (scoringTeam === "casa") teamA = rotateTeamClockwise(teamA)
    else teamB = rotateTeamClockwise(teamB)
  }
  servingTeam = scoringTeam

  return { scoreA, scoreB, currentRally, servingTeam, teamA, teamB }
}

function getTeam(state: MatchState, side: TeamSide): TeamConfig {
  return side === "casa" ? state.teamA : state.teamB
}

export function findPlayer(team: TeamConfig, id: string | null): Player | null {
  if (!id) return null
  return team.players.find((p) => p.id === id) ?? null
}

export function isBackRow(pos: Posicao): boolean {
  return BACK_ROW.includes(pos)
}

export function isFrontRow(pos: Posicao): boolean {
  return FRONT_ROW.includes(pos)
}

/**
 * Indica se a posição deve ser ocupada pelo líbero neste momento:
 * há líbero definido, a posição é de fundo (P1/P6/P5) e o atleta-base ali é um
 * central que o líbero reveza.
 *
 * Regra do saque: na P1 (posição de saque) o líbero só entra quando a equipe
 * NÃO está sacando (`isServing = false`). Enquanto a equipe saca, o central
 * permanece na P1 para executar o saque (o líbero não pode sacar). Assim que a
 * outra equipe assume o saque, o líbero cobre a P1 imediatamente na recepção —
 * sem esperar a próxima rotação, evitando o erro de coleta.
 */
export function liberoEntraNaPosicao(
  team: TeamConfig,
  posicao: Posicao,
  isServing = true,
): boolean {
  const base = team.formation[posicao]
  const reveza = Boolean(
    team.liberoId && LIBERO_POSICOES.includes(posicao) && base && team.liberoReplaces.includes(base),
  )
  if (!reveza) return false
  // Na posição de saque, o líbero só entra quando a equipe não está sacando.
  if (posicao === "P1" && isServing) return false
  return true
}

/**
 * Formação efetiva em quadra: para cada posição, o atleta que realmente está
 * jogando ali agora (aplicando a troca automática do líbero no fundo).
 */
export function effectiveFormation(
  team: TeamConfig,
  isServing = true,
): Record<Posicao, { playerId: string | null; isLibero: boolean }> {
  const out = {} as Record<Posicao, { playerId: string | null; isLibero: boolean }>
  for (const pos of POSICAO_ORDER) {
    if (liberoEntraNaPosicao(team, pos, isServing)) {
      out[pos] = { playerId: team.liberoId, isLibero: true }
    } else {
      out[pos] = { playerId: team.formation[pos], isLibero: false }
    }
  }
  return out
}

/** Atleta que ocupa a posição naquele momento (líbero incluído). */
export function onCourtPlayerId(team: TeamConfig, posicao: Posicao, isServing = true): string | null {
  return liberoEntraNaPosicao(team, posicao, isServing) ? team.liberoId : team.formation[posicao]
}

/**
 * Resolve qual atleta executou a ação. Como a formação efetiva já coloca o
 * líbero nas posições de fundo que ele reveza, basta retornar o atleta em
 * quadra naquela posição (que será o líbero quando aplicável).
 */
export function resolvePlayerId(
  team: TeamConfig,
  posicao: Posicao,
  _fundamento: Fundamento,
  isServing = true,
): string | null {
  return onCourtPlayerId(team, posicao, isServing)
}

export interface RecordInput {
  team: TeamSide
  posicao: Posicao
  fundamento: Fundamento
  qualidade: Qualidade
  /** Sub-classificação (ex.: tipo de defesa). Para bloqueio é derivado da posição. */
  detalhe?: string | null
  /** Momento do vídeo em segundos (0 se sem vídeo). */
  videoTime?: number
}

/** Deriva a posição do bloqueio a partir da posição de quadra (rede). */
function bloqueioDetalheFromPos(pos: Posicao): string | null {
  if (pos === "P4") return "ponta"
  if (pos === "P3") return "meio"
  if (pos === "P2") return "oposto"
  return null
}

/** Zona do ataque conforme a posição (fallback quando a função é desconhecida). */
function ataqueZonaFromPos(pos: Posicao): string {
  if (pos === "P4") return "ponta"
  if (pos === "P3") return "meio"
  if (pos === "P2") return "oposto"
  return "fundo"
}

/**
 * Classifica o ataque pela FUNÇÃO do atleta (identificada no 5x1), não apenas
 * pela posição — já que cada atleta tem função definida nas equipes:
 * - qualquer ataque saindo do fundo (P1/P6/P5) → "fundo" (ataque de fundo);
 * - na rede, a função manda: central → "meio" (mesmo se estiver na P4 numa
 *   formação), ponteiro → "ponta", oposto → "oposto", levantador → "segunda".
 * Sem função definida, cai no fallback por posição.
 */
function ataqueZonaFromPlayer(team: TeamConfig, posicao: Posicao, playerId: string | null): string {
  if (isBackRow(posicao)) return "fundo"
  const role = findPlayer(team, playerId)?.role
  switch (role) {
    case "levantador":
      return "segunda"
    case "central":
      return "meio"
    case "ponteiro":
      return "ponta"
    case "oposto":
      return "oposto"
    default:
      return ataqueZonaFromPos(posicao)
  }
}

/**
 * Classifica automaticamente o tipo de defesa pelo contexto do rally:
 * - após ataque do adversário → "ataque" (defesa de ataque);
 * - após toque de bloqueio da própria equipe → "recuperacao";
 * - após ataque da PRÓPRIA equipe → "recuperacao" (a bola voltou do bloqueio/
 *   rede e a mesma equipe recuperou);
 * - após passe/bola fácil do adversário → "volume".
 */
function defesaTipoAuto(actions: ScoutAction[], team: TeamSide): string {
  const ultima = actions[actions.length - 1]
  if (!ultima) return "volume"
  if (ultima.fundamento === "ataque" && ultima.team && ultima.team !== team) return "ataque"
  if (ultima.fundamento === "bloqueio" && ultima.team === team) return "recuperacao"
  if (ultima.fundamento === "ataque" && ultima.team === team) return "recuperacao"
  return "volume"
}

/**
 * Registra uma ação aplicando as regras:
 * - resolve o atleta pela formação/líbero;
 * - se for ataque e não houver levantamento imediatamente antes no rally,
 *   insere automaticamente um levantamento (atribuído ao levantador);
 * - atualiza o placar quando a qualidade é ponto (equipe pontua) ou erro
 *   (adversário pontua), encerrando o rally;
 * - mantém as ações já registradas intactas (substituições não as alteram).
 */
export function recordAction(state: MatchState, input: RecordInput): MatchState {
  const team = getTeam(state, input.team)
  const ts = input.videoTime ?? 0
  const rallyId = `rally_${state.set}_${state.currentRally}`
  const novas: ScoutAction[] = []

  // Posição efetiva da ação. Como a rotação mantém o saque sempre na P1, todo
  // saque é atribuído automaticamente ao atleta que está na P1 naquele momento,
  // independentemente da posição clicada pelo operador.
  const posicao: Posicao = input.fundamento === "saque" ? "P1" : input.posicao

  // A equipe está sacando neste momento? Isso define se o líbero entra na P1.
  // No saque, quem executa é a própria equipe que saca. Nas demais ações, usamos
  // a equipe que detém o saque no rally (state.servingTeam). Quando ainda não há
  // saque definido (início do set), assumimos que o central fica na P1.
  const teamServing = state.servingTeam === null ? null : state.servingTeam === input.team
  const isServing = input.fundamento === "saque" ? true : teamServing ?? true

  // Atleta que executa a ação (formação efetiva já aplica o líbero no fundo).
  const playerId = resolvePlayerId(team, posicao, input.fundamento, isServing)

  // Bola de segunda: o levantador ataca pela rede. Identificado pela FUNÇÃO do
  // atleta (não pela posição fixa), então vale em qualquer rotação em que o
  // levantador esteja na frente. Nesse caso não há levantamento prévio.
  const ehBolaDeSegunda =
    input.fundamento === "ataque" &&
    !isBackRow(posicao) &&
    findPlayer(team, playerId)?.role === "levantador"

  // Zona do ataque pela FUNÇÃO do atacante (central=meio, ponteiro=ponta,
  // oposto=oposto, fundo=fundo). É reutilizada como alvo do levantamento.
  const ataqueAlvo = ataqueZonaFromPlayer(team, posicao, playerId)

  // Auto-levantamento antes do ataque (exceto bola de segunda). O alvo do
  // levantamento acompanha o destino real do ataque, não a posição clicada.
  if (input.fundamento === "ataque" && !ehBolaDeSegunda) {
    const noRally = state.actions.filter((a) => a.rallyId === rallyId && a.team === input.team)
    const ultima = noRally[noRally.length - 1]
    if (!ultima || ultima.fundamento !== "levantamento") {
      const setterId = onCourtPlayerId(team, team.setterPosicao, isServing)
      novas.push({
        id: uid("act"),
        rallyId,
        timestamp: ts,
        fundamento: "levantamento",
        resultado: "continuidade",
        qualidade: "positivo",
        detalhe: ataqueAlvo,
        playerId: setterId,
        posicao: team.setterPosicao,
        team: input.team,
        auto: true,
        confidence: 1,
        validated: true,
      })
    }
  }

  // Detalhe automático por fundamento (leitura pela FUNÇÃO do atleta + rotação):
  // - bloqueio: posição na rede;
  // - ataque: central=meio, ponteiro=ponta, oposto=oposto, levantador=segunda,
  //   fundo (P1/P6/P5)=ataque de fundo — independente de onde a função caiu;
  // - defesa: tipo classificado pelo contexto (ataque/recuperação/volume);
  // - demais: usa o informado.
  let detalhe: string | null
  if (input.fundamento === "bloqueio") {
    detalhe = bloqueioDetalheFromPos(posicao)
  } else if (input.fundamento === "ataque") {
    detalhe = ehBolaDeSegunda ? "segunda" : ataqueAlvo
  } else if (input.fundamento === "defesa") {
    detalhe = input.detalhe ?? defesaTipoAuto(state.actions, input.team)
  } else {
    detalhe = input.detalhe ?? null
  }

  // Regra do bloqueio:
  // - Bloqueio de PONTO: o ataque/recepção adversário anterior foi bloqueado;
  //   aquela ação vira erro (ataque = "bloqueado"; passe = erro de recepção) e o
  //   ponto vai para quem bloqueou.
  // - Bloqueio POSITIVO (a minha defesa recuperou, o rally segue): NÃO conta erro
  //   do adversário — é apenas uma ação positiva de bloqueio, sem pontuar.
  let blockedIdx = -1
  if (input.fundamento === "bloqueio" && input.qualidade === "ponto") {
    const other: TeamSide = input.team === "casa" ? "adversario" : "casa"
    for (let i = state.actions.length - 1; i >= 0; i--) {
      const a = state.actions[i]
      if (a.rallyId !== rallyId) break
      if (a.team !== other) continue
      if (
        (a.fundamento === "ataque" || a.fundamento === "recepcao") &&
        a.qualidade !== "ponto" &&
        a.qualidade !== "erro"
      ) {
        blockedIdx = i
      }
      break
    }
  }
  const mainQualidade: Qualidade = input.qualidade

  novas.push({
    id: uid("act"),
    rallyId,
    timestamp: ts,
    fundamento: input.fundamento,
    resultado: qualidadeToResultado(mainQualidade),
    qualidade: mainQualidade,
    detalhe,
    playerId,
    posicao,
    team: input.team,
    confidence: 1,
    validated: true,
  })

  const actions = [...state.actions, ...novas]

  // Marca a ação bloqueada da outra equipe como erro (contabiliza no scout do
  // atacante/passador), sem pontuar de novo — o ponto já é do bloqueio.
  if (blockedIdx >= 0) {
    const alvo = actions[blockedIdx]
    actions[blockedIdx] = {
      ...alvo,
      qualidade: "erro",
      resultado: "erro",
      detalhe: alvo.fundamento === "ataque" ? "bloqueado" : alvo.detalhe ?? null,
    }
  }

  // Pontuação por regra: ponto → equipe da ação pontua; erro → adversário pontua.
  let scoringTeam: TeamSide | null = null
  if (mainQualidade === "ponto") {
    scoringTeam = input.team
  } else if (mainQualidade === "erro") {
    scoringTeam = input.team === "casa" ? "adversario" : "casa"
  }

  if (scoringTeam) {
    return { ...state, actions, ...applyScoring(state, scoringTeam) }
  }
  // Ao registrar um saque (que não encerrou o rally), marcamos quem detém o
  // saque. Isso faz o líbero da equipe que recebe assumir a P1 imediatamente,
  // sem esperar a próxima rotação.
  if (input.fundamento === "saque") {
    return { ...state, actions, servingTeam: input.team }
  }
  return { ...state, actions }
}

/**
 * Converte a última ação (não automática) de uma equipe para ponto ou erro.
 * Usado quando a ação foi registrada como positiva e logo depois o usuário
 * clica em PONTO ou ERRO. Aplica placar e rotação por sideout.
 */
export function amendLastQuality(
  state: MatchState,
  side: TeamSide,
  quality: "ponto" | "erro",
): MatchState {
  let idx = -1
  for (let i = state.actions.length - 1; i >= 0; i--) {
    if (state.actions[i].team === side && !state.actions[i].auto) {
      idx = i
      break
    }
  }
  if (idx === -1) return state
  const acao = state.actions[idx]
  // Só converte se ainda não era ação de pontuação.
  if (acao.qualidade === "ponto" || acao.qualidade === "erro") return state

  const actions = [...state.actions]
  actions[idx] = { ...acao, qualidade: quality, resultado: qualidadeToResultado(quality) }

  // Se o que virou PONTO foi um bloqueio, o ataque/recepção adversário do mesmo
  // rally foi bloqueado: marca aquela ação como erro (ataque = "bloqueado";
  // passe = erro de recepção), sem pontuar de novo — o ponto já é do bloqueio.
  if (acao.fundamento === "bloqueio" && quality === "ponto") {
    const other: TeamSide = side === "casa" ? "adversario" : "casa"
    for (let i = idx - 1; i >= 0; i--) {
      const a = actions[i]
      if (a.rallyId !== acao.rallyId) break
      if (a.team !== other) continue
      if (
        (a.fundamento === "ataque" || a.fundamento === "recepcao") &&
        a.qualidade !== "ponto" &&
        a.qualidade !== "erro"
      ) {
        actions[i] = {
          ...a,
          qualidade: "erro",
          resultado: "erro",
          detalhe: a.fundamento === "ataque" ? "bloqueado" : a.detalhe ?? null,
        }
      }
      break
    }
  }

  const scoringTeam: TeamSide =
    quality === "ponto" ? side : side === "casa" ? "adversario" : "casa"

  return { ...state, actions, ...applyScoring(state, scoringTeam) }
}

/** Remove a última ação registrada (desfazer). Não reverte placar de rallies fechados. */
export function undoLast(state: MatchState): MatchState {
  if (state.actions.length === 0) return state
  return { ...state, actions: state.actions.slice(0, -1) }
}

/** Substitui o atleta de uma posição. Ações passadas mantêm o atleta antigo. */
export function substitute(
  state: MatchState,
  side: TeamSide,
  posicao: Posicao,
  newPlayerId: string,
): MatchState {
  const key = side === "casa" ? "teamA" : "teamB"
  const team = getTeam(state, side)
  return {
    ...state,
    [key]: { ...team, formation: { ...team.formation, [posicao]: newPlayerId } },
  }
}

/**
 * Recalcula campos derivados das funções (5x1):
 * - líbero = atleta com função "libero";
 * - liberoReplaces = ids dos centrais (o líbero entra por quem está no fundo);
 * - setterPosicao = posição atual do levantador na formação.
 */
function syncRolesDerived(team: TeamConfig): TeamConfig {
  const libero = team.players.find((p) => p.role === "libero")
  const centrais = team.players.filter((p) => p.role === "central").map((p) => p.id)
  const setter = team.players.find((p) => p.role === "levantador")

  let setterPosicao = team.setterPosicao
  if (setter) {
    const pos = POSICAO_ORDER.find((p) => team.formation[p] === setter.id)
    if (pos) setterPosicao = pos
  }

  return {
    ...team,
    liberoId: libero ? libero.id : team.liberoId,
    liberoReplaces: centrais.length > 0 ? centrais : team.liberoReplaces,
    setterPosicao,
  }
}

/**
 * Aplica um patch a UMA equipe isolada (fora de um jogo). Recalcula os campos
 * derivados quando o elenco muda. Usado para editar equipes na biblioteca.
 */
export function applyTeamPatch(team: TeamConfig, patch: Partial<TeamConfig>): TeamConfig {
  const merged = { ...team, ...patch }
  return patch.players ? syncRolesDerived(merged) : merged
}

/** Atualiza a configuração de uma equipe (formação, líbero, elenco, funções). */
export function updateTeam(
  state: MatchState,
  side: TeamSide,
  patch: Partial<TeamConfig>,
): MatchState {
  const key = side === "casa" ? "teamA" : "teamB"
  const team = getTeam(state, side)
  return { ...state, [key]: applyTeamPatch(team, patch) }
}

/**
 * Conta transições: troca de posse entre as equipes dentro de um mesmo rally.
 * Cada vez que a equipe da ação muda em relação à anterior do rally, é 1 transição.
 */
export function countTransitions(actions: ScoutAction[]): number {
  const porRally = new Map<string, ScoutAction[]>()
  for (const a of actions) {
    const arr = porRally.get(a.rallyId) ?? []
    arr.push(a)
    porRally.set(a.rallyId, arr)
  }
  let total = 0
  for (const arr of porRally.values()) {
    for (let i = 1; i < arr.length; i++) {
      if (arr[i].team && arr[i - 1].team && arr[i].team !== arr[i - 1].team) total += 1
    }
  }
  return total
}

/** Estatísticas rápidas para a barra inferior do painel. */
export function quickStats(state: MatchState) {
  const saquesA = state.actions.filter((a) => a.team === "casa" && a.fundamento === "saque").length
  const saquesB = state.actions.filter(
    (a) => a.team === "adversario" && a.fundamento === "saque",
  ).length
  const errosA = state.actions.filter((a) => a.team === "casa" && a.resultado === "erro").length
  const errosB = state.actions.filter(
    (a) => a.team === "adversario" && a.resultado === "erro",
  ).length
  return {
    pontosA: state.scoreA,
    pontosB: state.scoreB,
    saquesA,
    saquesB,
    errosA,
    errosB,
    transicoes: countTransitions(state.actions),
  }
}
