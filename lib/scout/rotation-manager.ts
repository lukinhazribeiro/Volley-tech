export interface PlayerPosition {
  playerNumber: number
  position: 1 | 2 | 3 | 4 | 5 | 6 // Clockwise positions: 1=opp, 2=center-back, 3=libero, 4=center-front, 5=wing, 6=setter
}

export interface CourtRotation {
  teamId: "A" | "B"
  currentRotation: PlayerPosition[]
  rotationHistory: PlayerPosition[][]
}

export interface RotationState {
  teamA: CourtRotation
  teamB: CourtRotation
}

export interface MatchAction {
  serveQuality: string
  servingTeam: "A" | "B"
}

export const POSITION_NAMES: Record<number, string> = {
  1: "I - Sacador",
  2: "II - Ponta Direita",
  3: "III - Central",
  4: "IV - Ponta Esquerda",
  5: "V - Fundo Esquerda",
  6: "VI - Oposto",
}

export function createEmptyRotation(teamId: "A" | "B"): CourtRotation {
  return {
    teamId,
    currentRotation: Array.from({ length: 6 }, (_, i) => ({
      playerNumber: 0,
      position: (i + 1) as 1 | 2 | 3 | 4 | 5 | 6,
    })),
    rotationHistory: [],
  }
}

export function rotatePositions(rotation: PlayerPosition[]): PlayerPosition[] {
  // Rotate in order: 1 -> 6 -> 5 -> 4 -> 3 -> 2 -> 1
  const rotationOrder = [1, 6, 5, 4, 3, 2] // positions in order
  const newRotation = [...rotation]

  const players = rotationOrder.map((pos) => newRotation.find((p) => p.position === (pos as 1 | 2 | 3 | 4 | 5 | 6)))

  // Shift players forward in the order
  for (let i = 0; i < rotationOrder.length; i++) {
    const nextIndex = (i + 1) % rotationOrder.length
    const nextPosition = rotationOrder[nextIndex] as 1 | 2 | 3 | 4 | 5 | 6
    const currentPlayer = players[i]
    if (currentPlayer) {
      newRotation[nextPosition - 1] = { playerNumber: currentPlayer.playerNumber, position: nextPosition }
    }
  }

  return newRotation
}

export function updatePlayerAtPosition(
  rotation: PlayerPosition[],
  position: 1 | 2 | 3 | 4 | 5 | 6,
  playerNumber: number,
): PlayerPosition[] {
  return rotation.map((p) => (p.position === position ? { playerNumber, position } : p))
}

export function handleServeSelection(rotation: PlayerPosition[], servingPlayerNumber: number): PlayerPosition[] {
  let newRotation = [...rotation]

  // Find current position of serving player
  const currentPos = newRotation.findIndex((p) => p.playerNumber === servingPlayerNumber)
  if (currentPos === -1) return newRotation // Player not in rotation

  // If player is not at position 1 (index 0), rotate until they are
  while (newRotation[0].playerNumber !== servingPlayerNumber) {
    newRotation = rotatePositions(newRotation)
  }

  return newRotation
}

export function detectServeChangeAndRotate(
  actions: MatchAction[],
  teamARotation: PlayerPosition[],
  teamBRotation: PlayerPosition[],
): { teamARotation: PlayerPosition[]; teamBRotation: PlayerPosition[] } {
  if (actions.length === 0) {
    return { teamARotation, teamBRotation }
  }

  const lastAction = actions[actions.length - 1]

  // If this is a serve action that changed teams, rotate
  if (lastAction.serveQuality === "-" || lastAction.serveQuality === "ka") {
    // Serve ended or ace - other team will serve next
    const nextServingTeam = lastAction.servingTeam === "A" ? "B" : "A"

    // Find the position to rotate to based on next server
    if (nextServingTeam === "A") {
      // Check if we need to find next server for team A
      return { teamARotation: rotatePositions(teamARotation), teamBRotation }
    } else {
      // Check if we need to find next server for team B
      return { teamARotation, teamBRotation: rotatePositions(teamBRotation) }
    }
  }

  return { teamARotation, teamBRotation }
}
