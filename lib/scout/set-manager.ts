export interface Set {
  number: number
  teamAScore: number
  teamBScore: number
  winner?: "A" | "B"
  completedAt?: Date
}

export function isSetComplete(teamAScore: number, teamBScore: number): boolean {
  const minPoints = 40
  const minDifference = 2

  if (teamAScore < minPoints && teamBScore < minPoints) {
    return false
  }

  return Math.abs(teamAScore - teamBScore) >= minDifference
}

export function getSetWinner(teamAScore: number, teamBScore: number): "A" | "B" | null {
  if (!isSetComplete(teamAScore, teamBScore)) {
    return null
  }

  return teamAScore > teamBScore ? "A" : "B"
}

export function calculateMatchWinner(sets: Set[]): "A" | "B" | null {
  const teamAWins = sets.filter((s) => s.winner === "A").length
  const teamBWins = sets.filter((s) => s.winner === "B").length

  const maxSetsToWin = 3

  if (teamAWins >= maxSetsToWin) return "A"
  if (teamBWins >= maxSetsToWin) return "B"

  return null
}

export function canStartNewSet(sets: Set[]): boolean {
  return sets.length === 0 || (sets.length < 5 && calculateMatchWinner(sets) === null)
}
