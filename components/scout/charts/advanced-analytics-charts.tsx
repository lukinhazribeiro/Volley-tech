"use client"

import React from "react"
import { Card } from "@/components/scout/ui/card"
import { Button } from "@/components/scout/ui/button"
import type { MatchAction } from "@/lib/scout/match-parser"
import type { Set } from "@/lib/scout/set-manager"

interface AdvancedAnalyticsChartsProps {
  actions: MatchAction[]
  teamAName: string
  teamBName: string
  sets?: Set[] // Added sets prop for filtering by set
}

interface RegionData {
  name: string
  value: number
  percentage: number
  color: string
}

function RegionalPercentagePanel({
  title,
  regions,
  showZones = false,
}: { title: string; regions: RegionData[]; showZones?: boolean }) {
  const total = regions.reduce((sum, r) => sum + r.value, 0)

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
      <h3 className="font-bold mb-4 text-center text-sm uppercase tracking-wide text-slate-700">{title}</h3>
      <div className="space-y-4">
        {/* Horizontal bar showing distribution with gradient effects */}
        <div className="flex rounded-lg overflow-hidden border-2 border-slate-300 h-16 shadow-md">
          {regions.map((region, idx) => (
            <div
              key={idx}
              style={{
                width: `${region.percentage}%`,
                backgroundColor: region.color,
              }}
              className="flex items-center justify-center text-white font-bold text-sm transition-all hover:opacity-90 relative group"
              title={`${region.name}: ${region.value} (${region.percentage}%)`}
            >
              {region.percentage > 8 && <span className="drop-shadow-lg">{region.percentage}%</span>}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white transition-opacity"></div>
            </div>
          ))}
        </div>

        {/* Region labels and values with enhanced styling */}
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${regions.length}, 1fr)` }}>
          {regions.map((region, idx) => (
            <div
              key={idx}
              className="text-center p-3 rounded-lg bg-white border-2 transition-all hover:border-slate-400 hover:shadow-md"
              style={{ borderColor: region.color + "40" }}
            >
              <div className="font-semibold text-xs uppercase tracking-wide text-slate-600 mb-2">{region.name}</div>
              <div className="text-2xl font-bold" style={{ color: region.color }}>
                {region.value}
              </div>
              <div className="text-sm font-semibold mt-1" style={{ color: region.color + "80" }}>
                {region.percentage}%
              </div>
            </div>
          ))}
        </div>

        {/* Zone indicators (for serve zones) */}
        {showZones && (
          <div className="flex justify-around text-xs font-semibold text-slate-600 mt-3 pt-3 border-t-2 border-slate-200">
            <span className="flex items-center gap-1">
              <span className="text-lg">↑</span> 7.5
            </span>
            <span className="flex items-center gap-1">
              <span className="text-lg">↑</span> 8.6
            </span>
            <span className="flex items-center gap-1">
              <span className="text-lg">↑</span> 9.1
            </span>
          </div>
        )}

        {/* Total */}
        <div className="text-center pt-3 border-t-2 border-slate-200 text-sm font-semibold text-slate-600">
          Total: <span className="text-slate-900 font-bold">{total}</span> ações
        </div>
      </div>
    </Card>
  )
}

const COLORS = {
  success: "#10b981", // Emerald green (acerto)
  warning: "#f59e0b", // Amber
  error: "#ef4444", // Red (erro)
  info: "#ea580c", // Orange (marca)
  secondary: "#0d9488", // Teal
  accent: "#fb923c", // Light orange
}

export default function AdvancedAnalyticsCharts({ actions, teamAName, teamBName, sets }: AdvancedAnalyticsChartsProps) {
  const [selectedTeam, setSelectedTeam] = React.useState<"A" | "B">("A")
  const [selectedSet, setSelectedSet] = React.useState<number | "all">("all")

  const filteredActions = React.useMemo(() => {
    if (selectedSet === "all" || !sets || sets.length === 0) return actions

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

    return actions.slice(setStartIndex, setEndIndex)
  }, [actions, selectedSet, sets])

  const getTeamActions = (team: "A" | "B") =>
    filteredActions.filter((a) => a.servingTeam === team || a.attackingTeam === team)

  const calculateReceptionStats = (team: "A" | "B") => {
    const teamActions = getTeamActions(team)
    const receivingTeam = team === "A" ? "B" : "A"
    const receptionActions = teamActions.filter((a) => a.servingTeam !== team && a.passingQuality)

    const stats = {
      A: receptionActions.filter((a) => a.passingQuality === "A").length,
      B: receptionActions.filter((a) => a.passingQuality === "B").length,
      C: receptionActions.filter((a) => a.passingQuality === "C").length,
      D: receptionActions.filter((a) => a.passingQuality === "D").length,
    }

    const total = stats.A + stats.B + stats.C + stats.D
    return stats
  }

  const calculateServeStats = (team: "A" | "B") => {
    // Apenas ações em que a equipe efetivamente sacou
    const serveActions = filteredActions.filter((a) => a.servingTeam === team)
    return {
      correct: serveActions.filter((a) => a.serveQuality === "+").length,
      error: serveActions.filter((a) => a.serveQuality === "-").length,
      ace: serveActions.filter((a) => a.serveQuality === "ka").length,
    }
  }

  const calculateAttackStats = (team: "A" | "B") => {
    const attackActions = getTeamActions(team).filter((a) => a.attackingTeam === team && a.resultComplemento)
    return {
      successful: attackActions.filter((a) => a.resultComplemento === "#").length,
      error: attackActions.filter((a) => a.resultComplemento === "!").length,
      blocked: attackActions.filter((a) => a.resultComplemento === "+").length,
    }
  }

  const calculateAttackPositionStats = (team: "A" | "B") => {
    const attackActions = getTeamActions(team).filter(
      (a) => a.attackingTeam === team && a.attackPosition && a.resultComplemento,
    )

    const positions: Record<string, number> = {
      P: 0,
      M: 0,
      O: 0,
      F: 0,
      S: 0,
    }

    attackActions.forEach((a) => {
      if (a.attackPosition && positions.hasOwnProperty(a.attackPosition)) {
        positions[a.attackPosition]++
      }
    })

    return positions
  }

  const calculateServeZoneStats = (team: "A" | "B") => {
    const serveActions = getTeamActions(team).filter((a) => a.servingTeam === team && a.serveZone)
    const zones: Record<string, number> = { "7.5": 0, "8.6": 0, "9.1": 0 }

    serveActions.forEach((a) => {
      if (a.serveZone) zones[a.serveZone]++
    })

    return zones
  }

  const calculateBlockStats = (team: "A" | "B") => {
    // Bloqueio é creditado à equipe adversária ao ataque, na posição do ataque
    const blockActions = filteredActions.filter(
      (a) =>
        a.blockingPosition &&
        a.attackingTeam &&
        a.attackingTeam !== team &&
        (a.resultComplemento === "+" || a.resultComplemento === "REC"),
    )
    const positions: Record<string, number> = { O: 0, P: 0, M: 0, F: 0, S: 0 }
    blockActions.forEach((a) => {
      if (a.blockingPosition && positions.hasOwnProperty(a.blockingPosition)) {
        positions[a.blockingPosition]++
      }
    })
    return positions
  }

  const calculateDefenseStats = (team: "A" | "B") => {
    // Defesa é creditada à equipe que defendeu (REC = própria equipe atacante,
    // demais = equipe adversária ao ataque) quando há defensivePlayer
    const defenseActions = filteredActions.filter((a) => {
      if (!a.defensivePlayer || a.defensivePlayer <= 0 || !a.attackingTeam) return false
      const defenseTeam = a.resultComplemento === "REC" ? a.attackingTeam : a.attackingTeam === "A" ? "B" : "A"
      return defenseTeam === team
    })
    return {
      D: defenseActions.filter((a) => a.resultComplemento !== "V" && a.resultComplemento !== "REC").length,
      V: defenseActions.filter((a) => a.resultComplemento === "V").length,
      R: defenseActions.filter((a) => a.resultComplemento === "REC").length,
    }
  }

  const receptionStats = calculateReceptionStats(selectedTeam)
  const serveStats = calculateServeStats(selectedTeam)
  const attackStats = calculateAttackStats(selectedTeam)
  const attackPositions = calculateAttackPositionStats(selectedTeam)
  const serveZones = calculateServeZoneStats(selectedTeam)
  const blockStats = calculateBlockStats(selectedTeam)
  const defenseStats = calculateDefenseStats(selectedTeam)

  const receptionRegions: RegionData[] = [
    {
      name: "A",
      value: receptionStats.A,
      percentage:
        receptionStats.A + receptionStats.B + receptionStats.C + receptionStats.D > 0
          ? Math.round(
              (receptionStats.A / (receptionStats.A + receptionStats.B + receptionStats.C + receptionStats.D)) * 100,
            )
          : 0,
      color: COLORS.success,
    },
    {
      name: "B+C",
      value: receptionStats.B + receptionStats.C,
      percentage:
        receptionStats.A + receptionStats.B + receptionStats.C + receptionStats.D > 0
          ? Math.round(
              ((receptionStats.B + receptionStats.C) / (receptionStats.A + receptionStats.B + receptionStats.C + receptionStats.D)) * 100,
            )
          : 0,
      color: COLORS.warning,
    },
    {
      name: "Erro",
      value: receptionStats.D,
      percentage:
        receptionStats.A + receptionStats.B + receptionStats.C + receptionStats.D > 0
          ? Math.round(
              (receptionStats.D / (receptionStats.A + receptionStats.B + receptionStats.C + receptionStats.D)) * 100,
            )
          : 0,
      color: COLORS.error,
    },
  ]

  const serveRegions: RegionData[] = [
    {
      name: "Correto",
      value: serveStats.correct,
      percentage:
        serveStats.correct + serveStats.error + serveStats.ace > 0
          ? Math.round((serveStats.correct / (serveStats.correct + serveStats.error + serveStats.ace)) * 100)
          : 0,
      color: COLORS.success,
    },
    {
      name: "Erro",
      value: serveStats.error,
      percentage:
        serveStats.correct + serveStats.error + serveStats.ace > 0
          ? Math.round((serveStats.error / (serveStats.correct + serveStats.error + serveStats.ace)) * 100)
          : 0,
      color: COLORS.error,
    },
    {
      name: "Ace",
      value: serveStats.ace,
      percentage:
        serveStats.correct + serveStats.error + serveStats.ace > 0
          ? Math.round((serveStats.ace / (serveStats.correct + serveStats.error + serveStats.ace)) * 100)
          : 0,
      color: COLORS.info,
    },
  ]

  const attackRegions: RegionData[] = [
    {
      name: "Ponto",
      value: attackStats.successful,
      percentage:
        attackStats.successful + attackStats.error + attackStats.blocked > 0
          ? Math.round(
              (attackStats.successful / (attackStats.successful + attackStats.error + attackStats.blocked)) * 100,
            )
          : 0,
      color: COLORS.success,
    },
    {
      name: "Erro",
      value: attackStats.error,
      percentage:
        attackStats.successful + attackStats.error + attackStats.blocked > 0
          ? Math.round((attackStats.error / (attackStats.successful + attackStats.error + attackStats.blocked)) * 100)
          : 0,
      color: COLORS.error,
    },
    {
      name: "Bloqueio",
      value: attackStats.blocked,
      percentage:
        attackStats.successful + attackStats.error + attackStats.blocked > 0
          ? Math.round((attackStats.blocked / (attackStats.successful + attackStats.error + attackStats.blocked)) * 100)
          : 0,
      color: COLORS.warning,
    },
  ]

  const positionRegions: RegionData[] = [
    {
      name: "Ponta",
      value: attackPositions["P"],
      percentage:
        Object.values(attackPositions).reduce((a, b) => a + b, 0) > 0
          ? Math.round((attackPositions["P"] / Object.values(attackPositions).reduce((a, b) => a + b, 0)) * 100)
          : 0,
      color: COLORS.success,
    },
    {
      name: "Meio",
      value: attackPositions["M"],
      percentage:
        Object.values(attackPositions).reduce((a, b) => a + b, 0) > 0
          ? Math.round((attackPositions["M"] / Object.values(attackPositions).reduce((a, b) => a + b, 0)) * 100)
          : 0,
      color: COLORS.info,
    },
    {
      name: "Oposto",
      value: attackPositions["O"],
      percentage:
        Object.values(attackPositions).reduce((a, b) => a + b, 0) > 0
          ? Math.round((attackPositions["O"] / Object.values(attackPositions).reduce((a, b) => a + b, 0)) * 100)
          : 0,
      color: COLORS.warning,
    },
    {
      name: "F/S",
      value: attackPositions["F"] + attackPositions["S"],
      percentage:
        Object.values(attackPositions).reduce((a, b) => a + b, 0) > 0
          ? Math.round(((attackPositions["F"] + attackPositions["S"]) / Object.values(attackPositions).reduce((a, b) => a + b, 0)) * 100)
          : 0,
      color: COLORS.secondary,
    },
  ]

  const zoneRegions: RegionData[] = [
    {
      name: "7.5",
      value: serveZones["7.5"],
      percentage:
        Object.values(serveZones).reduce((a, b) => a + b, 0) > 0
          ? Math.round((serveZones["7.5"] / Object.values(serveZones).reduce((a, b) => a + b, 0)) * 100)
          : 0,
      color: COLORS.success,
    },
    {
      name: "8.6",
      value: serveZones["8.6"],
      percentage:
        Object.values(serveZones).reduce((a, b) => a + b, 0) > 0
          ? Math.round((serveZones["8.6"] / Object.values(serveZones).reduce((a, b) => a + b, 0)) * 100)
          : 0,
      color: COLORS.warning,
    },
    {
      name: "9.1",
      value: serveZones["9.1"],
      percentage:
        Object.values(serveZones).reduce((a, b) => a + b, 0) > 0
          ? Math.round((serveZones["9.1"] / Object.values(serveZones).reduce((a, b) => a + b, 0)) * 100)
          : 0,
      color: COLORS.error,
    },
  ]

  const blockTotal = Object.values(blockStats).reduce((a, b) => a + b, 0)
  const blockRegions: RegionData[] = [
    {
      name: "Oposto",
      value: blockStats["O"],
      percentage: blockTotal > 0 ? Math.round((blockStats["O"] / blockTotal) * 100) : 0,
      color: COLORS.warning,
    },
    {
      name: "Ponta",
      value: blockStats["P"],
      percentage: blockTotal > 0 ? Math.round((blockStats["P"] / blockTotal) * 100) : 0,
      color: COLORS.success,
    },
    {
      name: "Meio",
      value: blockStats["M"],
      percentage: blockTotal > 0 ? Math.round((blockStats["M"] / blockTotal) * 100) : 0,
      color: COLORS.info,
    },
    {
      name: "F/S",
      value: blockStats["F"] + blockStats["S"],
      percentage: blockTotal > 0 ? Math.round(((blockStats["F"] + blockStats["S"]) / blockTotal) * 100) : 0,
      color: COLORS.secondary,
    },
  ]

  const defenseTotal = defenseStats.D + defenseStats.V + defenseStats.R
  const defenseRegions: RegionData[] = [
    {
      name: "Defesa",
      value: defenseStats.D,
      percentage: defenseTotal > 0 ? Math.round((defenseStats.D / defenseTotal) * 100) : 0,
      color: COLORS.success,
    },
    {
      name: "Volume",
      value: defenseStats.V,
      percentage: defenseTotal > 0 ? Math.round((defenseStats.V / defenseTotal) * 100) : 0,
      color: COLORS.info,
    },
    {
      name: "Recuperação",
      value: defenseStats.R,
      percentage: defenseTotal > 0 ? Math.round((defenseStats.R / defenseTotal) * 100) : 0,
      color: COLORS.accent,
    },
  ]

  return (
    <div className="w-full space-y-6 p-6 bg-gradient-to-br from-orange-50 via-amber-50 to-white min-h-screen">
      <div className="flex gap-3 justify-center flex-wrap">
        <Button
          variant={selectedSet === "all" ? "default" : "outline"}
          onClick={() => setSelectedSet("all")}
          className="font-semibold px-6 py-2 rounded-lg transition-all hover:shadow-lg"
        >
          Todos os Sets
        </Button>
        {sets &&
          sets.map((set, idx) => (
            <Button
              key={idx}
              variant={selectedSet === idx + 1 ? "default" : "outline"}
              onClick={() => setSelectedSet(idx + 1)}
              className="font-semibold px-6 py-2 rounded-lg transition-all hover:shadow-lg"
            >
              Set {idx + 1}
            </Button>
          ))}
      </div>

      <div className="flex gap-3 justify-center">
        <Button
          variant={selectedTeam === "A" ? "default" : "outline"}
          onClick={() => setSelectedTeam("A")}
          className="font-semibold px-6 py-2 rounded-lg transition-all hover:shadow-lg"
        >
          {teamAName}
        </Button>
        <Button
          variant={selectedTeam === "B" ? "default" : "outline"}
          onClick={() => setSelectedTeam("B")}
          className="font-semibold px-6 py-2 rounded-lg transition-all hover:shadow-lg"
        >
          {teamBName}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <RegionalPercentagePanel title="QUALIDADE DE PASSE" regions={receptionRegions} />
        <RegionalPercentagePanel title="SAQUE" regions={serveRegions} />
        <RegionalPercentagePanel title="EFICÁCIA DO ATAQUE" regions={attackRegions} />
        <RegionalPercentagePanel title="DISTRIBUIÇÃO DO ATAQUE" regions={positionRegions} />
        <RegionalPercentagePanel title="SAQUE POR ZONA" regions={zoneRegions} showZones={true} />
        <RegionalPercentagePanel title="BLOQUEIO POR POSIÇÃO" regions={blockRegions} />
        <RegionalPercentagePanel title="DEFESA" regions={defenseRegions} />
      </div>
    </div>
  )
}
