"use client"

import { useState, useEffect } from "react"
import { type StoredMatch, getMatches, deleteMatch, getMatchStatistics } from "@/lib/scout/match-storage"
import { Card } from "@/components/scout/ui/card"
import { Button } from "@/components/scout/ui/button"
import { Badge } from "@/components/scout/ui/badge"
import MatchDetailsPage from "./match-details-page"

export default function MatchHistoryPage() {
  const [matches, setMatches] = useState<StoredMatch[]>([])
  const [stats, setStats] = useState({ totalMatches: 0, totalGames: 0, averageSetsPerMatch: "0" })
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)

  useEffect(() => {
    const allMatches = getMatches()
    setMatches(allMatches)
    setStats(getMatchStatistics(allMatches))
  }, [])

  const filteredMatches = selectedCategory ? matches.filter((m) => m.category === selectedCategory) : matches

  const handleDelete = (id: string) => {
    deleteMatch(id)
    const updated = getMatches()
    setMatches(updated)
    setStats(getMatchStatistics(updated))
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

  if (selectedMatchId) {
    return <MatchDetailsPage matchId={selectedMatchId} onBack={() => setSelectedMatchId(null)} />
  }

  return (
    <div className="w-full min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">Histórico de Partidas</h1>

        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Total de Partidas</p>
            <p className="text-3xl font-bold text-orange-600">{stats.totalMatches}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Total de Sets</p>
            <p className="text-3xl font-bold text-amber-600">{stats.totalGames}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Média de Sets</p>
            <p className="text-3xl font-bold text-slate-700">{stats.averageSetsPerMatch}</p>
          </Card>
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <Button variant={selectedCategory === null ? "default" : "outline"} onClick={() => setSelectedCategory(null)}>
            Todas
          </Button>
          {["sub13", "sub15", "sub17", "sub19", "sub21", "adult"].map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
              className="capitalize"
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Matches List */}
        <div className="space-y-4">
          {filteredMatches.length > 0 ? (
            filteredMatches.map((match) => (
              <Card key={match.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedMatchId(match.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {match.teamAName} vs {match.teamBName}
                      </h3>
                      <Badge variant={match.winner === "A" ? "default" : "secondary"}>
                        Vencedor: {match.winner === "A" ? match.teamAName : match.teamBName}
                      </Badge>
                      <Badge variant="outline">{match.category}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Sets: {match.sets.map((s) => `${s.teamAScore}x${s.teamBScore}`).join(" | ")}</p>
                      <p>Realizado em {formatDate(match.completedAt)}</p>
                      <p>Duração: {formatDuration(match.totalDuration)}</p>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(match.id)
                  }}>
                    Deletar
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Nenhuma partida encontrada</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
