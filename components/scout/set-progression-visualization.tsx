"use client"

import { Card } from "@/components/scout/ui/card"
import { Badge } from "@/components/scout/ui/badge"
import type { MatchAction } from "@/lib/scout/match-parser"

interface SetProgressionProps {
  actions: MatchAction[]
  teamAName: string
  teamBName: string
  setNumber: number
}

export function SetProgressionVisualization({
  actions,
  teamAName,
  teamBName,
  setNumber,
}: SetProgressionProps) {
  const setActions = actions.filter(action => action.setNumber === setNumber && action.pointScoredBy)

  console.log("[v0] SetProgressionVisualization - Total actions:", actions.length, "Set actions:", setActions.length)

  // Build point progression
  const pointProgression: Array<{
    teamA: number
    teamB: number
    scoredBy: "A" | "B"
    type: string
  }> = []

  let scoreA = 0
  let scoreB = 0

  setActions.forEach((action) => {
    if (action.pointScoredBy) {
      if (action.pointScoredBy === "A") {
        scoreA++
      } else {
        scoreB++
      }

      let pointType = "Ponto"
      if (action.pointType === "serve") pointType = "Ace"
      else if (action.pointType === "attack") pointType = "Ataque"
      else if (action.pointType === "block") pointType = "Bloqueio"
      else if (action.pointType === "error") pointType = "Erro"

      pointProgression.push({
        teamA: scoreA,
        teamB: scoreB,
        scoredBy: action.pointScoredBy,
        type: pointType,
      })
    }
  })

  // Calculate runs (pontos seguidos)
  const runs: Array<{ team: "A" | "B"; count: number; startScore: string; endScore: string }> = []
  let currentRun: { team: "A" | "B"; count: number; startIdx: number } | null = null

  pointProgression.forEach((point, idx) => {
    if (!currentRun || currentRun.team !== point.scoredBy) {
      if (currentRun && currentRun.count >= 3) {
        const startPoint = pointProgression[currentRun.startIdx]
        const endPoint = pointProgression[currentRun.startIdx + currentRun.count - 1]
        runs.push({
          team: currentRun.team,
          count: currentRun.count,
          startScore: `${startPoint.teamA}x${startPoint.teamB}`,
          endScore: `${endPoint.teamA}x${endPoint.teamB}`,
        })
      }
      currentRun = { team: point.scoredBy, count: 1, startIdx: idx }
    } else {
      currentRun.count++
    }
  })

  // Check last run
  if (currentRun && currentRun.count >= 3) {
    const startPoint = pointProgression[currentRun.startIdx]
    const endPoint = pointProgression[currentRun.startIdx + currentRun.count - 1]
    runs.push({
      team: currentRun.team,
      count: currentRun.count,
      startScore: `${startPoint.teamA}x${startPoint.teamB}`,
      endScore: `${endPoint.teamA}x${endPoint.teamB}`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Set Progression Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Desenvolvimento do Set {setNumber}
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="default" className="bg-blue-600">
              {teamAName}
            </Badge>
            <Badge variant="secondary" className="bg-red-600 text-white">
              {teamBName}
            </Badge>
          </div>
          
          {/* Timeline of points */}
          <div className="flex flex-wrap gap-1 mt-4">
            {pointProgression.map((point, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-center w-10 h-10 rounded text-xs font-bold ${
                  point.scoredBy === "A"
                    ? "bg-blue-600 text-white"
                    : "bg-red-600 text-white"
                }`}
                title={`${point.type}: ${point.teamA}x${point.teamB}`}
              >
                {point.scoredBy}
              </div>
            ))}
          </div>
          
          {pointProgression.length === 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              Nenhum ponto registrado neste set.
            </p>
          )}
        </div>
      </Card>

      {/* Runs Analysis */}
      {runs.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Sequências de Pontos (3+ consecutivos)
          </h3>
          <div className="space-y-3">
            {runs.map((run, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg ${
                  run.team === "A" ? "bg-blue-50 dark:bg-blue-950" : "bg-red-50 dark:bg-red-950"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={run.team === "A" ? "default" : "secondary"}>
                      {run.team === "A" ? teamAName : teamBName}
                    </Badge>
                    <span className="text-2xl font-bold text-foreground">
                      {run.count} pontos seguidos
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {run.startScore} → {run.endScore}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
