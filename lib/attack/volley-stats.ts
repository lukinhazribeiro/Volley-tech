export type Team = "A" | "B"
export type PlayStatus = "levantamento" | "sem_sequencia"
export type SetPosition = "ponta" | "meio" | "oposto" | "pipe" | "fundo1" | "segunda"
export type AttackType =
  | "diagonal_maior"
  | "diagonal_menor"
  | "paralela"
  | "paragonal"
  | "bloqueado"
  | "pingo"
  | "ataque_5"
  | "ataque_1"
export type ResultType = "ponto" | "certo" | "erro"
export type NoSetReason = "erro_levantamento" | "erro_saque_adversario"

export interface Play {
  id: number
  team: Team
  status: PlayStatus
  position?: SetPosition
  attackType?: AttackType
  result?: ResultType
  noSetReason?: NoSetReason
  timestamp: Date | string
  setter?: number
}

export const noSetReasonLabels: Record<NoSetReason, string> = {
  erro_levantamento: "Erro de levantamento",
  erro_saque_adversario: "Erro de saque adversário",
}

/**
 * Determina qual equipe pontuou em uma jogada.
 * - Ataque convertido (ponto) → pontua a própria equipe.
 * - Ataque bloqueado ou com erro → pontua a equipe adversária.
 * - "certo" (rali continua) → ninguém pontua.
 * - Sem levantamento por erro de levantamento → pontua o adversário.
 * - Sem levantamento por erro de saque do adversário → pontua a própria equipe.
 */
export function getScoringTeam(play: Play): Team | null {
  const opponent: Team = play.team === "A" ? "B" : "A"
  if (play.status === "sem_sequencia") {
    if (play.noSetReason === "erro_levantamento") return opponent
    if (play.noSetReason === "erro_saque_adversario") return play.team
    return null
  }
  if (play.attackType === "bloqueado") return opponent
  if (play.result === "ponto") return play.team
  if (play.result === "erro") return opponent
  return null
}

export interface Setters {
  setter1: string
  setter2: string
  active: number
}

export interface TeamNames {
  A: string
  B: string
}

export interface Session {
  id: number
  name: string
  plays: Play[]
  date: Date | string
  teamNames: TeamNames
  settersA: Setters
  settersB: Setters
}

export const setPositions: { value: SetPosition; label: string; description: string }[] = [
  { value: "ponta", label: "Ponta", description: "P4" },
  { value: "meio", label: "Meio", description: "P3" },
  { value: "oposto", label: "Oposto", description: "P2" },
  { value: "pipe", label: "Pipe", description: "P6" },
  { value: "fundo1", label: "Fundo 1", description: "P1" },
  { value: "segunda", label: "Segunda", description: "2ª" },
]

export const attackTypes: { value: AttackType; label: string }[] = [
  { value: "diagonal_maior", label: "Diag. Maior" },
  { value: "diagonal_menor", label: "Diag. Menor" },
  { value: "paralela", label: "Paralela" },
  { value: "paragonal", label: "Paragonal" },
  { value: "bloqueado", label: "Bloqueado" },
  { value: "pingo", label: "Pingo" },
]

export const specialAttackTypes: { value: AttackType; label: string }[] = [
  { value: "ataque_5", label: "Ataque 5" },
  { value: "ataque_1", label: "Ataque 1" },
  { value: "pingo", label: "Pingo" },
  { value: "bloqueado", label: "Bloqueado" },
]

export const resultTypes: { value: ResultType; label: string }[] = [
  { value: "ponto", label: "Ponto" },
  { value: "certo", label: "Certo" },
  { value: "erro", label: "Erro" },
]

export const positionLabels: Record<SetPosition, string> = {
  ponta: "Ponta",
  meio: "Meio",
  oposto: "Oposto",
  pipe: "Pipe",
  fundo1: "Fundo 1",
  segunda: "Segunda",
}

export const attackTypeLabels: Record<AttackType, string> = {
  diagonal_maior: "Diagonal Maior",
  diagonal_menor: "Diagonal Menor",
  paralela: "Paralela",
  paragonal: "Paragonal",
  bloqueado: "Bloqueado",
  pingo: "Pingo",
  ataque_5: "Ataque 5",
  ataque_1: "Ataque 1",
}

export const attackLineColors: Record<AttackType, string> = {
  diagonal_maior: "#dc2626",
  diagonal_menor: "#f97316",
  paralela: "#2563eb",
  paragonal: "#7c3aed",
  bloqueado: "#6b7280",
  pingo: "#10b981",
  ataque_5: "#0891b2",
  ataque_1: "#be185d",
}

export interface Line {
  startX: number
  startY: number
  endX: number
  endY: number
}

export function getAttackLines(position: SetPosition, attackType: AttackType): Line {
  let startX = 100
  if (position === "ponta") startX = 180
  else if (position === "meio" || position === "pipe") startX = 100
  else if (position === "oposto" || position === "fundo1" || position === "segunda") startX = 20

  let endX: number
  let endY = 190

  if (attackType === "pingo") {
    endX = 100
    endY = 70
  } else if (position === "ponta") {
    switch (attackType) {
      case "paralela":
        endX = 180
        endY = 190
        break
      case "diagonal_maior":
        endX = 20
        endY = 190
        break
      case "diagonal_menor":
        endX = 30
        endY = 70
        break
      case "paragonal":
        endX = 100
        endY = 190
        break
      default:
        endX = 100
        endY = 150
    }
  } else if (position === "oposto" || position === "fundo1" || position === "segunda") {
    switch (attackType) {
      case "paralela":
        endX = 20
        endY = 190
        break
      case "diagonal_maior":
        endX = 180
        endY = 190
        break
      case "diagonal_menor":
        endX = 170
        endY = 70
        break
      case "paragonal":
        endX = 100
        endY = 190
        break
      default:
        endX = 100
        endY = 150
    }
  } else {
    switch (attackType) {
      case "ataque_1":
        endX = 180
        endY = 190
        break
      case "ataque_5":
        endX = 20
        endY = 190
        break
      default:
        endX = 100
        endY = 150
    }
  }

  return { startX, startY: 15, endX, endY }
}

export function getAttackLinesWithOrigin(playsArray: Play[], team: Team) {
  const teamPlays = playsArray.filter(
    (p) => p.team === team && p.status === "levantamento" && p.attackType && p.attackType !== "bloqueado",
  )
  const total = teamPlays.length
  const grouped: Record<string, { line: Line; count: number; attackType: string; position: string }> = {}

  for (const play of teamPlays) {
    if (play.position && play.attackType) {
      const key = `${play.position}_${play.attackType}`
      const line = getAttackLines(play.position, play.attackType)
      if (!grouped[key]) {
        grouped[key] = { line, count: 0, attackType: play.attackType, position: play.position }
      }
      grouped[key].count++
    }
  }

  return Object.values(grouped).map((item) => ({
    ...item,
    percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
  }))
}

export interface CourtAttackLine {
  line: Line
  count: number
  attackType: AttackType
  position: SetPosition
  /** Percentual relativo ao total de ataques daquele local (para leitura por posição). */
  percentage: number
}

export interface PositionAttackGroup {
  position: SetPosition
  label: string
  description: string
  total: number
  lines: CourtAttackLine[]
}

/**
 * Agrupa as direções de ataque de uma equipe POR LOCAL de ataque (posição).
 * Cada grupo traz o total de ataques do local e as linhas por tipo de ataque,
 * com o percentual calculado em relação ao total daquele local — ideal para
 * ler a tendência de direção de cada posição isoladamente.
 */
export function getAttackByPosition(playsArray: Play[], team: Team): PositionAttackGroup[] {
  const teamPlays = playsArray.filter(
    (p) => p.team === team && p.status === "levantamento" && p.attackType && p.attackType !== "bloqueado",
  )

  const byPos = new Map<SetPosition, Play[]>()
  for (const p of teamPlays) {
    if (!p.position || !p.attackType) continue
    if (!byPos.has(p.position)) byPos.set(p.position, [])
    byPos.get(p.position)!.push(p)
  }

  const result: PositionAttackGroup[] = []
  for (const meta of setPositions) {
    const posPlays = byPos.get(meta.value) ?? []
    if (posPlays.length === 0) continue

    const grouped = new Map<AttackType, number>()
    for (const p of posPlays) {
      if (!p.attackType) continue
      grouped.set(p.attackType, (grouped.get(p.attackType) ?? 0) + 1)
    }

    const lines: CourtAttackLine[] = Array.from(grouped.entries())
      .map(([attackType, count]) => ({
        line: getAttackLines(meta.value, attackType),
        count,
        attackType,
        position: meta.value,
        percentage: Math.round((count / posPlays.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)

    result.push({
      position: meta.value,
      label: meta.label,
      description: meta.description,
      total: posPlays.length,
      lines,
    })
  }

  return result
}

export function getAttackLegend(playsArray: Play[], team: Team) {
  const teamPlays = playsArray.filter(
    (p) => p.team === team && p.status === "levantamento" && p.attackType && p.attackType !== "bloqueado",
  )
  const total = teamPlays.length
  const grouped: Record<string, { count: number; percentage: number }> = {}

  for (const play of teamPlays) {
    if (play.attackType) {
      if (!grouped[play.attackType]) {
        grouped[play.attackType] = { count: 0, percentage: 0 }
      }
      grouped[play.attackType].count++
    }
  }

  const result = Object.entries(grouped).map(([attackType, data]) => ({
    attackType,
    count: data.count,
    percentage: total > 0 ? Math.round((data.count / total) * 100) : 0,
  }))

  result.sort((a, b) => b.count - a.count)
  return result
}

export interface Stats {
  positions: { A: Record<string, number>; B: Record<string, number> }
  attacks: { A: Record<string, number>; B: Record<string, number> }
  results: {
    A: { ponto: number; certo: number; erro: number; bloqueado: number }
    B: { ponto: number; certo: number; erro: number; bloqueado: number }
  }
  totals: { A: number; B: number }
  setters: { A: { setter1: number; setter2: number }; B: { setter1: number; setter2: number } }
}

export function getStats(playsArray: Play[]): Stats {
  const positions = { A: {} as Record<string, number>, B: {} as Record<string, number> }
  const attacks = { A: {} as Record<string, number>, B: {} as Record<string, number> }
  const results = {
    A: { ponto: 0, certo: 0, erro: 0, bloqueado: 0 },
    B: { ponto: 0, certo: 0, erro: 0, bloqueado: 0 },
  }
  const setters = { A: { setter1: 0, setter2: 0 }, B: { setter1: 0, setter2: 0 } }

  for (const play of playsArray) {
    if (play.status === "levantamento") {
      if (play.position) {
        positions[play.team][play.position] = (positions[play.team][play.position] || 0) + 1
      }
      if (play.attackType) {
        attacks[play.team][play.attackType] = (attacks[play.team][play.attackType] || 0) + 1
        if (play.attackType === "bloqueado") {
          results[play.team].bloqueado++
        }
      }
      if (play.result) {
        results[play.team][play.result]++
      }
      if (play.setter) {
        setters[play.team][`setter${play.setter}` as "setter1" | "setter2"]++
      }
    }
  }

  const totalA = playsArray.filter((p) => p.status === "levantamento" && p.team === "A").length
  const totalB = playsArray.filter((p) => p.status === "levantamento" && p.team === "B").length

  return { positions, attacks, results, totals: { A: totalA, B: totalB }, setters }
}

export function getStatsBySetter(playsArray: Play[], setter?: number): Stats {
  const filteredPlays = setter ? playsArray.filter((p) => p.setter === setter) : playsArray
  return getStats(filteredPlays)
}

export function getSetterName(team: Team, setterNum: number, settersA: Setters, settersB: Setters) {
  const setters = team === "A" ? settersA : settersB
  const name = setterNum === 1 ? setters.setter1 : setters.setter2
  return name || `Levantador ${setterNum}`
}
