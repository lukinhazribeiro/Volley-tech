"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/scout/ui/card"
import { Button } from "@/components/scout/ui/button"

interface TeamStats {
  name: string
  actions: any[]
  stats: any
}

interface StatCardProps {
  title: string
  data: Array<{ label: string; value: number; color: string }>
  total: number
}

function ModernStatCard({ title, data, total }: StatCardProps) {
  return (
    <Card className="bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-center text-sm font-bold uppercase tracking-wider text-slate-700">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Values display */}
        <div className="flex justify-around items-end gap-2">
          {data.map((item, idx) => (
            <div key={idx} className="text-center flex-1">
              <div
                className="text-3xl font-bold mb-1 drop-shadow-sm"
                style={{ color: item.color }}
              >
                {item.value}
              </div>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Percentage bars */}
        <div className="flex gap-2 h-14 rounded-lg overflow-hidden border-2 border-slate-300 shadow-inner">
          {data.map((item, idx) => {
            const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0
            return (
              <div
                key={idx}
                className="flex items-center justify-center text-white font-bold text-sm transition-all hover:opacity-90 relative group"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: item.color,
                  minWidth: percentage > 5 ? 'auto' : '0'
                }}
              >
                {percentage > 8 && (
                  <span className="drop-shadow-lg">{percentage}%</span>
                )}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity"></div>
              </div>
            )
          })}
        </div>

        {/* Total display */}
        <div className="text-center pt-2 border-t-2 border-slate-200">
          <span className="text-sm font-semibold text-slate-600">
            Total: <span className="text-slate-900 font-bold">{total}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function ModernHorizontalBars({ title, data, total }: { title: string; data: Array<{ label: string; value: number; color: string }>; total: number }) {
  return (
    <Card className="bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-center text-sm font-bold uppercase tracking-wider text-slate-700">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((item, idx) => {
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-600 uppercase tracking-wide">{item.label}</span>
                <span className="text-slate-900">{item.value}</span>
              </div>
              <div className="h-10 bg-slate-200 rounded-lg overflow-hidden border-2 border-slate-300 shadow-inner">
                <div
                  className="h-full flex items-center justify-end pr-3 text-white font-bold text-sm transition-all duration-500 hover:opacity-90"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  }}
                >
                  {percentage > 15 && <span className="drop-shadow-lg">{percentage}%</span>}
                </div>
              </div>
            </div>
          )
        })}
        <div className="text-center pt-2 border-t-2 border-slate-200">
          <span className="text-sm font-semibold text-slate-600">
            Total: <span className="text-slate-900 font-bold">{total}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdvancedAnalyticsDashboard({ teamA, teamB }: { teamA: TeamStats; teamB: TeamStats }) {
  const [selectedTeam, setSelectedTeam] = useState<"A" | "B">("A")

  const team = selectedTeam === "A" ? teamA : teamB

  const COLORS = {
    success: "#10b981",
    warning: "#f59e0b", 
    error: "#ef4444",
    info: "#3b82f6",
    secondary: "#8b5cf6",
  }

  const receptionData = [
    { label: "A", value: team.stats?.reception?.qualityA || 0, color: COLORS.success },
    { label: "B+C", value: (team.stats?.reception?.qualityB || 0) + (team.stats?.reception?.qualityC || 0), color: COLORS.warning },
    { label: "Erro", value: team.stats?.reception?.errors || 0, color: COLORS.error },
  ]
  const totalReception = receptionData.reduce((sum, d) => sum + d.value, 0)

  const serveZoneData = [
    { label: "7:5", value: team.stats?.serves?.zones?.["7.5"] || 0, color: COLORS.success },
    { label: "8:6", value: team.stats?.serves?.zones?.["8.6"] || 0, color: COLORS.warning },
    { label: "9:1", value: team.stats?.serves?.zones?.["9.1"] || 0, color: COLORS.error },
  ]
  const totalServes = serveZoneData.reduce((sum, d) => sum + d.value, 0)

  const attackEfficiencyData = [
    { label: "Ponto", value: team.stats?.attacks?.successful || 0, color: COLORS.success },
    { label: "Erro", value: team.stats?.attacks?.errors || 0, color: COLORS.error },
    { label: "Bloqueio", value: team.stats?.attacks?.blocked || 0, color: COLORS.warning },
  ]
  const totalAttackEfficiency = attackEfficiencyData.reduce((sum, d) => sum + d.value, 0)

  const attackPositionData = [
    { label: "Ponta", value: team.stats?.distribution?.P || 0, color: COLORS.success },
    { label: "Meio", value: team.stats?.distribution?.M || 0, color: COLORS.info },
    { label: "Oposto", value: team.stats?.distribution?.O || 0, color: COLORS.warning },
    { label: "F/S", value: (team.stats?.distribution?.F || 0) + (team.stats?.distribution?.S || 0), color: COLORS.secondary },
  ]
  const totalAttacks = attackPositionData.reduce((sum, d) => sum + d.value, 0)

  const blockingPositionData = [
    { label: "Ponta", value: team.stats?.blocks?.positions?.P || 0, color: COLORS.success },
    { label: "Meio", value: team.stats?.blocks?.positions?.M || 0, color: COLORS.info },
    { label: "Oposto", value: team.stats?.blocks?.positions?.O || 0, color: COLORS.warning },
  ]
  const totalBlocking = blockingPositionData.reduce((sum, d) => sum + d.value, 0)

  const transitionData = [
    { label: "K1", value: team.stats?.transitions?.k1 || 0, color: COLORS.info },
    { label: "K2", value: team.stats?.transitions?.k2 || 0, color: COLORS.error },
    { label: "K3", value: team.stats?.transitions?.k3 || 0, color: COLORS.success },
  ]
  const totalTransitions = transitionData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="w-full bg-gradient-to-br from-orange-50 via-amber-50 to-white min-h-screen p-6">
      <div className="mb-8 flex gap-4 justify-center">
        <Button
          onClick={() => setSelectedTeam("A")}
          variant={selectedTeam === "A" ? "default" : "outline"}
          className={`px-8 py-3 rounded-xl font-bold text-base transition-all shadow-lg hover:shadow-xl ${
            selectedTeam === "A" 
              ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white scale-105" 
              : "bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {teamA.name}
        </Button>
        <Button
          onClick={() => setSelectedTeam("B")}
          variant={selectedTeam === "B" ? "default" : "outline"}
          className={`px-8 py-3 rounded-xl font-bold text-base transition-all shadow-lg hover:shadow-xl ${
            selectedTeam === "B" 
              ? "bg-gradient-to-r from-red-600 to-red-700 text-white scale-105" 
              : "bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {teamB.name}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <ModernStatCard title="Recepção Eficaz" data={receptionData} total={totalReception} />
        <ModernStatCard title="Saque por Zona" data={serveZoneData} total={totalServes} />
        <ModernStatCard title="Eficácia do Ataque" data={attackEfficiencyData} total={totalAttackEfficiency} />
        <ModernHorizontalBars title="Distribuição" data={attackPositionData} total={totalAttacks} />
        <ModernHorizontalBars title="Bloqueio por Posição" data={blockingPositionData} total={totalBlocking} />
        <ModernStatCard title="Transição" data={transitionData} total={totalTransitions} />
      </div>
    </div>
  )
}
