"use client"

import type { TeamStats } from "@/lib/scout/match-parser"
import { Card } from "@/components/scout/ui/card"

interface ServeZoneAnalysisProps {
  stats: { statsA: TeamStats; statsB: TeamStats }
  teamAName: string
  teamBName: string
}

export default function ServeZoneAnalysis({ stats, teamAName, teamBName }: ServeZoneAnalysisProps) {
  const calculatePercentage = (value: number, total: number) => {
    return total === 0 ? 0 : Math.round((value / total) * 100)
  }

  const zones = ["7.5", "8.6", "9.1"] as const

  const getZoneStats = (teamStats: TeamStats) => {
    const total = teamStats.serves.zones["7.5"] + teamStats.serves.zones["8.6"] + teamStats.serves.zones["9.1"]
    return {
      total,
      zones: zones.map((zone) => ({
        zone,
        count: teamStats.serves.zones[zone],
        percentage: calculatePercentage(teamStats.serves.zones[zone], total),
      })),
    }
  }

  const teamAStats = getZoneStats(stats.statsA)
  const teamBStats = getZoneStats(stats.statsB)

  const maxValue = Math.max(...teamAStats.zones.map((z) => z.count), ...teamBStats.zones.map((z) => z.count), 1)

  return (
    <div className="w-full space-y-6 p-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Distribuição de Saques por Zona</h2>
        <p className="text-sm text-slate-600 mt-2">Comparação entre as três zonas de recepção</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time A */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200">
          <h3 className="text-xl font-bold text-blue-900 mb-4">{teamAName}</h3>
          <div className="space-y-4">
            {teamAStats.zones.map((stat) => (
              <div key={stat.zone} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">Zona {stat.zone}</span>
                  <div className="text-right">
                    <span className="text-xl font-bold text-blue-600">{stat.count}</span>
                    <span className="text-sm text-slate-500 ml-2">({stat.percentage}%)</span>
                  </div>
                </div>
                <div className="h-8 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center transition-all"
                    style={{ width: `${(stat.count / maxValue) * 100}%` }}
                  >
                    {stat.count > 0 && <span className="text-white text-xs font-bold">{stat.count}</span>}
                  </div>
                </div>
              </div>
            ))}
            <div className="pt-4 border-t-2 border-blue-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Total</span>
                <span className="text-xl font-bold text-blue-600">{teamAStats.total}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Time B */}
        <Card className="p-6 bg-gradient-to-br from-red-50 to-white border-2 border-red-200">
          <h3 className="text-xl font-bold text-red-900 mb-4">{teamBName}</h3>
          <div className="space-y-4">
            {teamBStats.zones.map((stat) => (
              <div key={stat.zone} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">Zona {stat.zone}</span>
                  <div className="text-right">
                    <span className="text-xl font-bold text-red-600">{stat.count}</span>
                    <span className="text-sm text-slate-500 ml-2">({stat.percentage}%)</span>
                  </div>
                </div>
                <div className="h-8 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center transition-all"
                    style={{ width: `${(stat.count / maxValue) * 100}%` }}
                  >
                    {stat.count > 0 && <span className="text-white text-xs font-bold">{stat.count}</span>}
                  </div>
                </div>
              </div>
            ))}
            <div className="pt-4 border-t-2 border-red-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Total</span>
                <span className="text-xl font-bold text-red-600">{teamBStats.total}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Legenda */}
      <Card className="p-4 bg-slate-100 border border-slate-300">
        <h4 className="font-bold text-slate-900 mb-2">Legenda de Zonas:</h4>
        <div className="grid grid-cols-3 gap-4 text-sm text-slate-700">
          <div>
            <strong>Zona 7.5:</strong> Fundo da quadra (entre linhas laterais)
          </div>
          <div>
            <strong>Zona 8.6:</strong> Linha de fundo (meio da quadra)
          </div>
          <div>
            <strong>Zona 9.1:</strong> Fundo diagonal (posição 1/5)
          </div>
        </div>
      </Card>
    </div>
  )
}
