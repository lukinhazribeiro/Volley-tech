"use client"

import React from "react"
import type { TeamStats } from "@/lib/scout/match-parser"
import type { MatchAction } from "@/lib/scout/match-parser"
import type { Set } from "@/lib/scout/set-manager"
import { Card } from "@/components/scout/ui/card"
import { Button } from "@/components/scout/ui/button"

interface ModernStatsDashboardProps {
  stats: { statsA: TeamStats; statsB: TeamStats }
  teamAName: string
  teamBName: string
  actions?: MatchAction[] // Added actions prop for set filtering
  sets?: Set[] // Added sets prop for set filtering
}

export default function ModernStatsDashboard({
  stats,
  teamAName,
  teamBName,
  actions = [],
  sets = [],
}: ModernStatsDashboardProps) {
  const [selectedSet, setSelectedSet] = React.useState<number | "all">("all")

  const filteredStats = React.useMemo(() => {
    if (selectedSet === "all" || !actions || actions.length === 0 || !sets || sets.length === 0) {
      return stats
    }

    // Calculate which actions belong to the selected set
    let actionIndex = 0
    for (let i = 0; i < selectedSet - 1; i++) {
      if (i < sets.length) {
        actionIndex += sets[i].teamAScore + sets[i].teamBScore
      }
    }

    const setStartIndex = actionIndex
    const setEndIndex =
      selectedSet <= sets.length
        ? actionIndex + sets[selectedSet - 1].teamAScore + sets[selectedSet - 1].teamBScore
        : actions.length

    const setActions = actions.slice(setStartIndex, setEndIndex)

    // Recalculate stats for the selected set
    const statsA: TeamStats = {
      serves: { correct: 0, errors: 0, aces: 0, zones: { "7.5": 0, "8.6": 0, "9.1": 0 } },
      reception: { qualityA: 0, qualityB: 0, qualityC: 0, errors: 0 },
      distribution: { O: 0, M: 0, P: 0, F: 0, S: 0 },
      attacks: { successful: 0, errors: 0, blocked: 0, defended: 0 },
      blocks: { successful: 0, errors: 0, positions: { O: 0, M: 0, P: 0, FS: 0 } },
      points: 0,
    }
    const statsB: TeamStats = JSON.parse(JSON.stringify(statsA))

    // Count serves and aces
    setActions.forEach((action) => {
      if (action.serveQuality === "+") {
        ;(action.servingTeam === "A" ? statsA : statsB).serves.correct++
      } else if (action.serveQuality === "-") {
        ;(action.servingTeam === "A" ? statsA : statsB).serves.errors++
      } else if (action.serveQuality === "ka") {
        // Ace only counts as ace, not as correct serve
        ;(action.servingTeam === "A" ? statsA : statsB).serves.aces++
      }

      // Count attacks
      if (action.resultComplemento === "#") {
        ;(action.attackingTeam === "A" ? statsA : statsB).attacks.successful++
      }

      // Count blocks
      if (action.resultComplemento === "+") {
        ;(action.attackingTeam === "A" ? statsB : statsA).blocks.successful++
      }
    })

    return { statsA, statsB }
  }, [selectedSet, actions, sets, stats])

  const statRows = [
    {
      label: "SAQUE",
      teamA: filteredStats.statsA.serves.correct + filteredStats.statsA.serves.aces,
      teamB: filteredStats.statsB.serves.correct + filteredStats.statsB.serves.aces,
    },
    {
      label: "RECEPÇÃO",
      teamA:
        filteredStats.statsA.reception.qualityA +
        filteredStats.statsA.reception.qualityB +
        filteredStats.statsA.reception.qualityC,
      teamB:
        filteredStats.statsB.reception.qualityA +
        filteredStats.statsB.reception.qualityB +
        filteredStats.statsB.reception.qualityC,
    },
    {
      label: "ATAQUE",
      teamA: filteredStats.statsA.attacks.successful,
      teamB: filteredStats.statsB.attacks.successful,
    },
    {
      label: "BLOQUEIO",
      teamA: filteredStats.statsA.blocks.successful,
      teamB: filteredStats.statsB.blocks.successful,
    },
    {
      label: "ERROS",
      teamA:
        filteredStats.statsA.serves.errors +
        filteredStats.statsA.attacks.errors +
        filteredStats.statsA.reception.errors,
      teamB:
        filteredStats.statsB.serves.errors +
        filteredStats.statsB.attacks.errors +
        filteredStats.statsB.reception.errors,
    },
    {
      label: "PONTOS",
      teamA: filteredStats.statsA.points,
      teamB: filteredStats.statsB.points,
    },
  ]

  const maxValue = Math.max(...statRows.flatMap((row) => [row.teamA, row.teamB]), 1)

  return (
    <div className="w-full bg-gradient-to-br from-orange-50 via-amber-50 to-white p-4 rounded-lg border border-orange-100">
      {sets && sets.length > 0 && (
        <div className="flex gap-2 justify-center mb-6 flex-wrap">
          <Button
            variant={selectedSet === "all" ? "default" : "outline"}
            onClick={() => setSelectedSet("all")}
            className="font-semibold px-4 py-2 rounded-lg transition-all hover:shadow-lg"
          >
            Geral
          </Button>
          {sets.map((set, idx) => (
            <Button
              key={idx}
              variant={selectedSet === idx + 1 ? "default" : "outline"}
              onClick={() => setSelectedSet(idx + 1)}
              className="font-semibold px-4 py-2 rounded-lg transition-all hover:shadow-lg"
            >
              Set {idx + 1}
            </Button>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-orange-600 text-white p-4 rounded-lg font-bold text-center">{teamAName}</div>
        <div className="bg-amber-900 text-white p-4 rounded-lg font-bold text-center">PLACAR</div>
        <div className="bg-amber-500 text-white p-4 rounded-lg font-bold text-center">{teamBName}</div>
      </div>

      {/* Stats Rows */}
      <div className="space-y-3 mb-6">
        {statRows.map((row) => {
          const aWidth = (row.teamA / maxValue) * 100
          const bWidth = (row.teamB / maxValue) * 100

          return (
            <div key={row.label} className="flex items-center gap-4">
              <div className="w-20 bg-orange-600 text-white p-3 rounded font-bold text-center text-sm">{row.teamA}</div>
              <div className="flex-1">
                <div className="bg-orange-100 rounded-full p-1 flex items-center justify-between">
                  <div className="bg-orange-500 rounded-full p-2 transition-all" style={{ width: `${aWidth}%` }} />
                  <span className="text-slate-700 text-sm font-bold mx-2">{row.label}</span>
                  <div className="bg-amber-500 rounded-full p-2 transition-all ml-auto" style={{ width: `${bWidth}%` }} />
                </div>
              </div>
              <div className="w-20 bg-amber-500 text-white p-3 rounded font-bold text-center text-sm">{row.teamB}</div>
            </div>
          )
        })}
      </div>

      {/* Court Visualization */}
      <Card className="p-4 bg-white border-orange-200">
        <div className="aspect-video bg-gradient-to-b from-teal-700 to-teal-800 rounded-lg p-4">
          <div className="h-full border-4 border-white rounded-lg relative bg-orange-400">
            {/* Net line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-white border-t-2 border-b-2 border-white transform -translate-y-1/2" />

            {/* Court lines */}
            <div className="absolute top-0 left-1/3 bottom-0 w-1 bg-white" />
            <div className="absolute top-0 right-1/3 bottom-0 w-1 bg-white" />

            {/* Center line */}
            <div className="absolute top-0 left-1/2 bottom-0 w-1 bg-white transform -translate-x-1/2 border-dashed" />
          </div>
        </div>
      </Card>
    </div>
  )
}
