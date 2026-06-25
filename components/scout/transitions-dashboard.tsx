"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/scout/ui/card"
import { Activity, TrendingUp, Zap } from 'lucide-react'
import type { MatchAction } from "@/lib/scout/match-parser"

interface TransitionsDashboardProps {
  actions: MatchAction[]
  teamAName: string
  teamBName: string
}

interface TransitionStats {
  k1: number
  k2: number
  k3: number
  total: number
}

export default function TransitionsDashboard({ actions, teamAName, teamBName }: TransitionsDashboardProps) {
  const transitionStats = useMemo(() => {
    const teamAStats: TransitionStats = {
      k1: 0,
      k2: 0,
      k3: 0,
      total: 0,
    }

    const teamBStats: TransitionStats = {
      k1: 0,
      k2: 0,
      k3: 0,
      total: 0,
    }

    const transitionActions = actions.filter((action) => action.transitionType && action.pointScoredBy)

    transitionActions.forEach((action) => {
      const stats = action.pointScoredBy === "A" ? teamAStats : teamBStats
      const transitionType = action.transitionType?.toLowerCase() || ""

      if (transitionType === "k1") {
        stats.k1++
      } else if (transitionType === "k2") {
        stats.k2++
      } else if (transitionType === "k3") {
        stats.k3++
      }
      stats.total++
    })

    return { teamAStats, teamBStats }
  }, [actions])

  const calculatePercentage = (value: number, total: number) => {
    return total === 0 ? 0 : Math.round((value / total) * 100)
  }

  const HeroStat = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => (
    <div className={`relative overflow-hidden rounded-2xl ${color} p-6 text-white shadow-lg`}>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Icon className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium uppercase tracking-wider opacity-90">{label}</p>
        </div>
        <p className="text-5xl font-bold tracking-tight">{value}</p>
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
    </div>
  )

  const TeamComparisonCard = ({
    teamName,
    stats,
    isTeamA,
  }: {
    teamName: string
    stats: TransitionStats
    isTeamA: boolean
  }) => {
    const bgGradient = isTeamA
      ? "bg-gradient-to-br from-orange-600 via-orange-700 to-orange-800"
      : "bg-gradient-to-br from-red-600 via-red-700 to-red-800"

    return (
      <Card className="overflow-hidden border-0 shadow-xl">
        <CardHeader className={`${bgGradient} text-white pb-8`}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl font-bold">{teamName}</CardTitle>
            <div className="text-right">
              <p className="text-sm opacity-80 uppercase tracking-wider">Total</p>
              <p className="text-4xl font-bold">{stats.total}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 bg-gradient-to-b from-slate-50 to-white">
          <div className="space-y-6">
            {/* K1 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 rounded-lg">
                    <Activity className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">K1 - Recepção</h3>
                    <p className="text-xs text-slate-600">Transição após recepção</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-700">{stats.k1}</p>
                  <p className="text-sm text-slate-600 font-medium">{calculatePercentage(stats.k1, stats.total)}%</p>
                </div>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${calculatePercentage(stats.k1, stats.total)}%` }}
                />
              </div>
            </div>

            {/* K2 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-100 rounded-lg">
                    <Zap className="w-5 h-5 text-orange-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">K2 - Defesa</h3>
                    <p className="text-xs text-slate-600">Transição após defesa</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-orange-700">{stats.k2}</p>
                  <p className="text-sm text-slate-600 font-medium">{calculatePercentage(stats.k2, stats.total)}%</p>
                </div>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${calculatePercentage(stats.k2, stats.total)}%` }}
                />
              </div>
            </div>

            {/* K3 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">K3 - Continuidade</h3>
                    <p className="text-xs text-slate-600">Continuidade do rally</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-700">{stats.k3}</p>
                  <p className="text-sm text-slate-600 font-medium">{calculatePercentage(stats.k3, stats.total)}%</p>
                </div>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${calculatePercentage(stats.k3, stats.total)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-bold text-slate-900 tracking-tight">Análise de Transições</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Distribuição detalhada dos tipos de transição K1, K2 e K3 por equipe durante a partida
          </p>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <HeroStat
            label="Total Geral"
            value={transitionStats.teamAStats.total + transitionStats.teamBStats.total}
            icon={Activity}
            color="bg-gradient-to-br from-slate-700 to-slate-900"
          />
          <HeroStat
            label="Total K1"
            value={transitionStats.teamAStats.k1 + transitionStats.teamBStats.k1}
            icon={Activity}
            color="bg-gradient-to-br from-blue-600 to-blue-800"
          />
          <HeroStat
            label="Total K2"
            value={transitionStats.teamAStats.k2 + transitionStats.teamBStats.k2}
            icon={Zap}
            color="bg-gradient-to-br from-orange-600 to-orange-800"
          />
          <HeroStat
            label="Total K3"
            value={transitionStats.teamAStats.k3 + transitionStats.teamBStats.k3}
            icon={TrendingUp}
            color="bg-gradient-to-br from-green-600 to-green-800"
          />
        </div>

        {/* Direct Comparison */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
            <CardTitle className="text-2xl font-bold text-center">Comparação Direta Entre Equipes</CardTitle>
          </CardHeader>
          <CardContent className="p-8 bg-white">
            <div className="space-y-8">
              {/* K1 Comparison */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Activity className="w-4 h-4 text-blue-700" />
                    </div>
                    <span className="font-bold text-slate-900">K1 - Recepção</span>
                  </div>
                  <span className="text-sm text-slate-600 font-medium">
                    {teamAName}: {transitionStats.teamAStats.k1} | {teamBName}: {transitionStats.teamBStats.k1}
                  </span>
                </div>
                <div className="flex gap-0.5 h-12 rounded-lg overflow-hidden shadow-inner">
                  <div
                    className="bg-blue-500 flex items-center justify-center text-white font-bold transition-all duration-700"
                    style={{
                      width: `${calculatePercentage(
                        transitionStats.teamAStats.k1,
                        transitionStats.teamAStats.k1 + transitionStats.teamBStats.k1
                      )}%`,
                    }}
                  >
                    {transitionStats.teamAStats.k1 + transitionStats.teamBStats.k1 > 0 &&
                      `${calculatePercentage(
                        transitionStats.teamAStats.k1,
                        transitionStats.teamAStats.k1 + transitionStats.teamBStats.k1
                      )}%`}
                  </div>
                  <div
                    className="bg-blue-800 flex items-center justify-center text-white font-bold transition-all duration-700"
                    style={{
                      width: `${calculatePercentage(
                        transitionStats.teamBStats.k1,
                        transitionStats.teamAStats.k1 + transitionStats.teamBStats.k1
                      )}%`,
                    }}
                  >
                    {transitionStats.teamAStats.k1 + transitionStats.teamBStats.k1 > 0 &&
                      `${calculatePercentage(
                        transitionStats.teamBStats.k1,
                        transitionStats.teamAStats.k1 + transitionStats.teamBStats.k1
                      )}%`}
                  </div>
                </div>
              </div>

              {/* K2 Comparison */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Zap className="w-4 h-4 text-orange-700" />
                    </div>
                    <span className="font-bold text-slate-900">K2 - Defesa</span>
                  </div>
                  <span className="text-sm text-slate-600 font-medium">
                    {teamAName}: {transitionStats.teamAStats.k2} | {teamBName}: {transitionStats.teamBStats.k2}
                  </span>
                </div>
                <div className="flex gap-0.5 h-12 rounded-lg overflow-hidden shadow-inner">
                  <div
                    className="bg-orange-500 flex items-center justify-center text-white font-bold transition-all duration-700"
                    style={{
                      width: `${calculatePercentage(
                        transitionStats.teamAStats.k2,
                        transitionStats.teamAStats.k2 + transitionStats.teamBStats.k2
                      )}%`,
                    }}
                  >
                    {transitionStats.teamAStats.k2 + transitionStats.teamBStats.k2 > 0 &&
                      `${calculatePercentage(
                        transitionStats.teamAStats.k2,
                        transitionStats.teamAStats.k2 + transitionStats.teamBStats.k2
                      )}%`}
                  </div>
                  <div
                    className="bg-orange-800 flex items-center justify-center text-white font-bold transition-all duration-700"
                    style={{
                      width: `${calculatePercentage(
                        transitionStats.teamBStats.k2,
                        transitionStats.teamAStats.k2 + transitionStats.teamBStats.k2
                      )}%`,
                    }}
                  >
                    {transitionStats.teamAStats.k2 + transitionStats.teamBStats.k2 > 0 &&
                      `${calculatePercentage(
                        transitionStats.teamBStats.k2,
                        transitionStats.teamAStats.k2 + transitionStats.teamBStats.k2
                      )}%`}
                  </div>
                </div>
              </div>

              {/* K3 Comparison */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-green-700" />
                    </div>
                    <span className="font-bold text-slate-900">K3 - Continuidade</span>
                  </div>
                  <span className="text-sm text-slate-600 font-medium">
                    {teamAName}: {transitionStats.teamAStats.k3} | {teamBName}: {transitionStats.teamBStats.k3}
                  </span>
                </div>
                <div className="flex gap-0.5 h-12 rounded-lg overflow-hidden shadow-inner">
                  <div
                    className="bg-green-500 flex items-center justify-center text-white font-bold transition-all duration-700"
                    style={{
                      width: `${calculatePercentage(
                        transitionStats.teamAStats.k3,
                        transitionStats.teamAStats.k3 + transitionStats.teamBStats.k3
                      )}%`,
                    }}
                  >
                    {transitionStats.teamAStats.k3 + transitionStats.teamBStats.k3 > 0 &&
                      `${calculatePercentage(
                        transitionStats.teamAStats.k3,
                        transitionStats.teamAStats.k3 + transitionStats.teamBStats.k3
                      )}%`}
                  </div>
                  <div
                    className="bg-green-800 flex items-center justify-center text-white font-bold transition-all duration-700"
                    style={{
                      width: `${calculatePercentage(
                        transitionStats.teamBStats.k3,
                        transitionStats.teamAStats.k3 + transitionStats.teamBStats.k3
                      )}%`,
                    }}
                  >
                    {transitionStats.teamAStats.k3 + transitionStats.teamBStats.k3 > 0 &&
                      `${calculatePercentage(
                        transitionStats.teamBStats.k3,
                        transitionStats.teamAStats.k3 + transitionStats.teamBStats.k3
                      )}%`}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TeamComparisonCard teamName={teamAName} stats={transitionStats.teamAStats} isTeamA={true} />
          <TeamComparisonCard teamName={teamBName} stats={transitionStats.teamBStats} isTeamA={false} />
        </div>
      </div>
    </div>
  )
}
