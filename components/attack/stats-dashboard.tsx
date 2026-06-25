"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/attack/ui/card"
import { Badge } from "@/components/attack/ui/badge"
import { Activity, Target, TrendingUp, History, CheckCircle2, BarChart3 } from "lucide-react"
import {
  type Play,
  type Session,
  type SetPosition,
  type AttackType,
  positionLabels,
  attackTypeLabels,
} from "@/lib/attack/volley-stats"
import { PositionBarChart, AttackDonutChart } from "@/components/attack/distribution-charts"

export default function StatsDashboard() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentPlays, setCurrentPlays] = useState<Play[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const savedSessions = localStorage.getItem("volleystats_sessions")
    let parsedSessions: Session[] = []
    if (savedSessions) {
      try {
        parsedSessions = JSON.parse(savedSessions)
      } catch {
        parsedSessions = []
      }
    }
    setSessions(parsedSessions)

    const savedCurrent = localStorage.getItem("volleystats_current")
    let parsedCurrent: Play[] = []
    if (savedCurrent) {
      try {
        parsedCurrent = JSON.parse(savedCurrent)
      } catch {
        parsedCurrent = []
      }
    }
    setCurrentPlays(parsedCurrent)

    // Por padrão, seleciona todos os jogos salvos (e o jogo atual, se houver jogadas)
    const initial = new Set<string>(parsedSessions.map((s) => String(s.id)))
    if (parsedCurrent.some((p) => p.status === "levantamento")) initial.add("current")
    setSelectedIds(initial)
    setLoaded(true)
  }, [])

  const hasCurrent = currentPlays.some((p) => p.status === "levantamento")

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Jogadas agregadas dos jogos selecionados
  const plays = useMemo<Play[]>(() => {
    const acc: Play[] = []
    if (selectedIds.has("current")) acc.push(...currentPlays)
    for (const session of sessions) {
      if (selectedIds.has(String(session.id))) acc.push(...session.plays)
    }
    return acc
  }, [selectedIds, sessions, currentPlays])

  const selectedGamesCount = selectedIds.size

  const positionStats: Record<SetPosition, number> = {
    ponta: 0,
    meio: 0,
    oposto: 0,
    pipe: 0,
    fundo1: 0,
    segunda: 0,
  }
  plays
    .filter((play) => play.status === "levantamento" && play.position)
    .forEach((play) => {
      if (play.position) positionStats[play.position]++
    })

  const attackTypeStats: Record<AttackType, number> = {
    diagonal_maior: 0,
    diagonal_menor: 0,
    paralela: 0,
    paragonal: 0,
    bloqueado: 0,
    pingo: 0,
    ataque_5: 0,
    ataque_1: 0,
  }
  plays
    .filter((play) => play.status === "levantamento" && play.attackType)
    .forEach((play) => {
      if (play.attackType) attackTypeStats[play.attackType]++
    })

  const positionAttackMatrix: Record<SetPosition, Record<string, number>> = {
    ponta: {},
    meio: {},
    oposto: {},
    pipe: {},
    fundo1: {},
    segunda: {},
  }
  plays
    .filter((play) => play.status === "levantamento" && play.position && play.attackType)
    .forEach((play) => {
      if (play.position && play.attackType) {
        positionAttackMatrix[play.position][play.attackType] =
          (positionAttackMatrix[play.position][play.attackType] || 0) + 1
      }
    })

  const totalPlays = plays.filter((play) => play.status === "levantamento").length

  // Avaliação geral (resultados)
  const results = { ponto: 0, certo: 0, erro: 0 }
  plays
    .filter((play) => play.status === "levantamento" && play.result)
    .forEach((play) => {
      if (play.result && play.result in results) results[play.result as keyof typeof results]++
    })
  const scoring = results.ponto + results.certo
  const totalResults = results.ponto + results.certo + results.erro
  const efficiency = totalResults > 0 ? Math.round((scoring / totalResults) * 100) : 0
  const avgLiftsPerGame = selectedGamesCount > 0 ? Math.round(totalPlays / selectedGamesCount) : 0

  const getPercentage = (value: number): string => {
    if (totalPlays === 0) return "0"
    return ((value / totalPlays) * 100).toFixed(1)
  }

  const topPosition = Object.entries(positionStats).sort((a, b) => b[1] - a[1])[0]
  const topAttack = Object.entries(attackTypeStats).sort((a, b) => b[1] - a[1])[0]

  const noGamesAtAll = loaded && sessions.length === 0 && !hasCurrent

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Estatísticas dos Jogos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Avaliação e média geral dos jogos salvos selecionados
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2 border-primary text-primary self-start sm:self-auto">
          <Activity className="w-4 h-4 mr-2" />
          {totalPlays} levantamentos
        </Badge>
      </div>

      {noGamesAtAll ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100">
              <Target className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum jogo registrado</h3>
            <p className="text-muted-foreground">
              Registre jogadas ou finalize uma leitura no coletor para ver as estatísticas aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Seletor de jogos */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-orange-600" />
                Selecione os jogos para avaliar
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                A avaliação e a média geral consideram apenas os jogos marcados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {hasCurrent && (
                  <button
                    onClick={() => toggle("current")}
                    className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-colors ${
                      selectedIds.has("current")
                        ? "bg-orange-50 border-orange-300"
                        : "bg-card border-border hover:bg-orange-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckCircle2
                        className={`w-5 h-5 shrink-0 ${selectedIds.has("current") ? "text-orange-600" : "text-slate-300"}`}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">Jogo atual (não salvo)</p>
                        <p className="text-xs text-muted-foreground">
                          {currentPlays.filter((p) => p.status === "levantamento").length} levantamentos em andamento
                        </p>
                      </div>
                    </div>
                  </button>
                )}
                {sessions.map((session) => {
                  const lifts = session.plays.filter((p) => p.status === "levantamento").length
                  const isSel = selectedIds.has(String(session.id))
                  return (
                    <button
                      key={session.id}
                      onClick={() => toggle(String(session.id))}
                      className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-colors ${
                        isSel ? "bg-orange-50 border-orange-300" : "bg-card border-border hover:bg-orange-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${isSel ? "text-orange-600" : "text-slate-300"}`} />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{session.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {new Date(session.date).toLocaleDateString("pt-BR")} • {session.teamNames?.A} x{" "}
                            {session.teamNames?.B} • {lifts} levantamentos
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {totalPlays === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-10 text-center">
                <p className="text-muted-foreground">
                  Selecione ao menos um jogo com levantamentos para ver a avaliação.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Avaliação / Média geral */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card border-border shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">Aproveitamento Geral</p>
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100">
                        <BarChart3 className="w-4 h-4 text-green-600" />
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-foreground">{efficiency}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {results.ponto}P · {results.certo}C · {results.erro}E
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">Jogos Avaliados</p>
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100">
                        <History className="w-4 h-4 text-orange-600" />
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-foreground">{selectedGamesCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Média {avgLiftsPerGame} lev./jogo</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">Posição Mais Usada</p>
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100">
                        <Target className="w-4 h-4 text-orange-600" />
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{positionLabels[topPosition[0] as SetPosition]}</p>
                    <p className="text-sm text-orange-600 font-semibold mt-1">{getPercentage(topPosition[1])}% das jogadas</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">Ataque Mais Comum</p>
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                        <TrendingUp className="w-4 h-4 text-amber-600" />
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{attackTypeLabels[topAttack[0] as AttackType]}</p>
                    <p className="text-sm text-amber-600 font-semibold mt-1">{getPercentage(topAttack[1])}% dos ataques</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    Incidência de Levantamentos por Posição
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Distribuição dos levantamentos nos jogos selecionados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PositionBarChart positions={positionStats} />
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-6 h-6 text-amber-600" />
                    Tipos de Ataque Realizados
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Distribuição dos tipos de ataque após os levantamentos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AttackDonutChart attacks={attackTypeStats} />
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-6 h-6 text-orange-600" />
                    Matriz: Posição × Tipo de Ataque
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Relação entre posição do levantamento e tipo de ataque realizado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Object.entries(positionAttackMatrix).map(([position, attacks]) => {
                      const positionTotal = Object.values(attacks).reduce((a, b) => a + b, 0)
                      if (positionTotal === 0) return null
                      return (
                        <div key={position} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-foreground">{positionLabels[position as SetPosition]}</h4>
                            <Badge variant="outline" className="border-primary text-primary">
                              {positionTotal} total
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Object.entries(attacks).map(([attackType, count]) => {
                              if (count === 0) return null
                              const attackPercentage = ((count / positionTotal) * 100).toFixed(0)
                              return (
                                <div key={attackType} className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-slate-600">
                                      {attackTypeLabels[attackType as AttackType]}
                                    </span>
                                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                                      {attackPercentage}%
                                    </Badge>
                                  </div>
                                  <p className="text-lg font-bold text-slate-900">{count}</p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
