"use client"

import { useState, useEffect, useMemo } from "react"
import { type StoredMatch, getMatchById } from "@/lib/scout/match-storage"
import { Button } from "@/components/scout/ui/button"
import { Card } from "@/components/scout/ui/card"
import { Badge } from "@/components/scout/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/scout/ui/tabs"
import { ArrowLeft } from 'lucide-react'
import { calculateTeamStats, type TeamStats } from "@/lib/scout/match-parser"
import ModernStatsDashboard from "@/components/scout/heatmaps/modern-stats-dashboard"
import { AdvancedAnalyticsDashboard } from "@/components/scout/heatmaps/advanced-analytics-dashboard"
import AdvancedAnalyticsCharts from "@/components/scout/charts/advanced-analytics-charts"
import TransitionsDashboard from "@/components/scout/transitions-dashboard"
import { SetProgressionVisualization } from "@/components/scout/set-progression-visualization"

interface MatchDetailsPageProps {
  matchId: string
  onBack: () => void
}

export default function MatchDetailsPage({ matchId, onBack }: MatchDetailsPageProps) {
  const [match, setMatch] = useState<StoredMatch | null>(null)
  const [selectedSet, setSelectedSet] = useState<number>(0)

  useEffect(() => {
    const foundMatch = getMatchById(matchId)
    setMatch(foundMatch)
  }, [matchId])

  const teamStats = useMemo(() => {
    if (!match || !match.actions) return null

    const statsA = calculateTeamStats(match.actions, "A")
    const statsB = calculateTeamStats(match.actions, "B")

    return {
      statsA,
      statsB,
      teamA: { name: match.teamAName, actions: match.actions.filter(a => a.servingTeam === "A" || a.attackingTeam === "A"), stats: statsA },
      teamB: { name: match.teamBName, actions: match.actions.filter(a => a.servingTeam === "B" || a.attackingTeam === "B"), stats: statsB },
    }
  }, [match])

  if (!match) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Partida não encontrada</p>
          <Button onClick={onBack}>Voltar</Button>
        </div>
      </div>
    )
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const selectedSetData = match.sets[selectedSet]
  const setActions = match.actions.filter((a) => a.setNumber === selectedSet + 1)

  return (
    <div className="w-full min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Detalhes da Partida</h1>
        </div>

        {/* Match Overview */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{match.teamAName}</h2>
              <p className="text-muted-foreground">
                Sets vencidos: {match.sets.filter((s) => s.teamAScore > s.teamBScore).length}
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-foreground">{match.teamBName}</h2>
              <p className="text-muted-foreground">
                Sets vencidos: {match.sets.filter((s) => s.teamBScore > s.teamAScore).length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Badge variant="default">Vencedor: {match.winner === "A" ? match.teamAName : match.teamBName}</Badge>
            </div>
            <div className="text-center">
              <Badge variant="outline">{match.category}</Badge>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {formatDate(match.completedAt)} • Duração: {formatDuration(match.totalDuration)}
              </p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="sets" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="sets">Sets</TabsTrigger>
            <TabsTrigger value="statistics">Estatísticas</TabsTrigger>
            <TabsTrigger value="transitions">Transições</TabsTrigger>
            <TabsTrigger value="analytics">Análise Avançada</TabsTrigger>
            <TabsTrigger value="charts">Gráficos</TabsTrigger>
          </TabsList>

          {/* Sets Tab */}
          <TabsContent value="sets">
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Sets</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {match.sets.map((set, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSet(idx)}
                    className={`p-4 rounded-lg transition-all ${
                      selectedSet === idx
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    <div className="text-sm font-medium">Set {idx + 1}</div>
                    <div className="text-2xl font-bold mt-2">
                      {set.teamAScore} x {set.teamBScore}
                    </div>
                    <div className="text-xs mt-1 opacity-75">
                      Vencedor: {set.teamAScore > set.teamBScore ? match.teamAName : match.teamBName}
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {selectedSetData && (
              <>
                <Card className="p-6 mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Detalhes do Set {selectedSet + 1}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">{match.teamAName}</p>
                      <p className="text-3xl font-bold text-foreground">{selectedSetData.teamAScore}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-right">
                      <p className="text-sm text-muted-foreground mb-2">{match.teamBName}</p>
                      <p className="text-3xl font-bold text-foreground">{selectedSetData.teamBScore}</p>
                    </div>
                  </div>
                  {selectedSetData.startTime && (
                    <p className="text-sm text-muted-foreground">
                      Início: {formatDate(selectedSetData.startTime)}
                    </p>
                  )}
                </Card>

                <SetProgressionVisualization
                  actions={setActions}
                  teamAName={match.teamAName}
                  teamBName={match.teamBName}
                  setNumber={selectedSet + 1}
                />
              </>
            )}
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics">
            {teamStats && (
              <ModernStatsDashboard
                stats={{ statsA: teamStats.statsA, statsB: teamStats.statsB }}
                teamAName={match.teamAName}
                teamBName={match.teamBName}
                actions={match.actions}
                sets={match.sets}
              />
            )}
          </TabsContent>

          {/* Transitions Tab */}
          <TabsContent value="transitions">
            <TransitionsDashboard
              actions={match.actions}
              teamAName={match.teamAName}
              teamBName={match.teamBName}
            />
          </TabsContent>

          {/* Advanced Analytics Tab */}
          <TabsContent value="analytics">
            {teamStats && (
              <AdvancedAnalyticsDashboard
                teamA={teamStats.teamA}
                teamB={teamStats.teamB}
              />
            )}
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts">
            <AdvancedAnalyticsCharts
              actions={match.actions}
              teamAName={match.teamAName}
              teamBName={match.teamBName}
              sets={match.sets}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
