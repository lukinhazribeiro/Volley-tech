"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/attack/ui/card"
import { Badge } from "@/components/attack/ui/badge"
import { Button } from "@/components/attack/ui/button"
import { Users, TrendingUp, Activity, Trophy, Download, Trash2, History, ChevronDown, ChevronUp, Target } from "lucide-react"
import {
  type Play,
  type Session,
} from "@/lib/attack/volley-stats"
import { exportToPDF } from "@/lib/attack/export-pdf"
import { PositionRadarChart, AttackDonutChart } from "@/components/attack/distribution-charts"

interface AthleteGame {
  sessionId: number
  sessionName: string
  date: string
  teamName: string
  lifts: number
  points: number
  correct: number
  errors: number
}

interface AthleteAggregate {
  key: string
  setterName: string
  teams: string[]
  games: AthleteGame[]
  plays: Play[]
  totalLifts: number
  points: number
  correct: number
  errors: number
  blocked: number
  positions: Record<string, number>
  attacks: Record<string, number>
}

function emptyPositions(): Record<string, number> {
  return { ponta: 0, meio: 0, oposto: 0, pipe: 0, fundo1: 0, segunda: 0 }
}

export default function PerformanceAnalysis() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loaded, setLoaded] = useState(false)
  const [expandedAthlete, setExpandedAthlete] = useState<string | null>(null)
  const [teamFilter, setTeamFilter] = useState<string>("all")

  useEffect(() => {
    const saved = localStorage.getItem("volleystats_sessions")
    if (saved) {
      try {
        setSessions(JSON.parse(saved))
      } catch {
        setSessions([])
      }
    }
    setLoaded(true)
  }, [])

  function deleteSession(id: number) {
    if (!confirm("Excluir esta sessão do histórico?")) return
    const updated = sessions.filter((s) => s.id !== id)
    setSessions(updated)
    localStorage.setItem("volleystats_sessions", JSON.stringify(updated))
  }

  // Aggregate athletes (setters) across all saved games, identified by team name + setter name
  // Agrega atletas (levantadoras) por NOME ao longo de todos os jogos salvos,
  // independente da equipe. Reúne todas as equipes em que a atleta aparece.
  const athletes = useMemo<AthleteAggregate[]>(() => {
    const map = new Map<string, AthleteAggregate>()

    for (const session of sessions) {
      const teamConfigs: { team: "A" | "B"; teamName: string }[] = [
        { team: "A", teamName: session.teamNames?.A || "Equipe A" },
        { team: "B", teamName: session.teamNames?.B || "Equipe B" },
      ]

      for (const { team, teamName } of teamConfigs) {
        const setters = team === "A" ? session.settersA : session.settersB
        const setterNames: { num: number; name: string }[] = [
          { num: 1, name: (setters?.setter1 || "").trim() },
          { num: 2, name: (setters?.setter2 || "").trim() },
        ]

        for (const { num, name } of setterNames) {
          const setterPlays = session.plays.filter(
            (p) => p.team === team && p.setter === num && p.status === "levantamento",
          )
          if (setterPlays.length === 0) continue

          const displayName = name || `Levantador ${num}`
          // Atletas com nome são unificadas pelo nome (case-insensitive) entre todos os jogos e equipes.
          // Sem nome ficam por sessão/equipe para não unir atletas diferentes por engano.
          const key = name
            ? `named||${name.toLowerCase()}`
            : `anon||${teamName}||${displayName}||${session.id}`

          let agg = map.get(key)
          if (!agg) {
            agg = {
              key,
              setterName: displayName,
              teams: [],
              games: [],
              plays: [],
              totalLifts: 0,
              points: 0,
              correct: 0,
              errors: 0,
              blocked: 0,
              positions: emptyPositions(),
              attacks: {},
            }
            map.set(key, agg)
          }

          if (!agg.teams.includes(teamName)) agg.teams.push(teamName)

          let gPoints = 0
          let gCorrect = 0
          let gErrors = 0
          for (const p of setterPlays) {
            agg.totalLifts++
            if (p.position) agg.positions[p.position] = (agg.positions[p.position] || 0) + 1
            if (p.attackType) {
              agg.attacks[p.attackType] = (agg.attacks[p.attackType] || 0) + 1
              if (p.attackType === "bloqueado") agg.blocked++
            }
            if (p.result === "ponto") {
              agg.points++
              gPoints++
            } else if (p.result === "certo") {
              agg.correct++
              gCorrect++
            } else if (p.result === "erro") {
              agg.errors++
              gErrors++
            }
            agg.plays.push(p)
          }

          agg.games.push({
            sessionId: session.id,
            sessionName: session.name,
            date: typeof session.date === "string" ? session.date : new Date(session.date).toISOString(),
            teamName,
            lifts: setterPlays.length,
            points: gPoints,
            correct: gCorrect,
            errors: gErrors,
          })
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalLifts - a.totalLifts)
  }, [sessions])

  const teamOptions = useMemo(() => {
    const set = new Set<string>()
    athletes.forEach((a) => a.teams.forEach((t) => set.add(t)))
    return Array.from(set)
  }, [athletes])

  const filteredAthletes =
    teamFilter === "all" ? athletes : athletes.filter((a) => a.teams.includes(teamFilter))

  const totalLifts = athletes.reduce((sum, a) => sum + a.totalLifts, 0)
  const multiGameAthletes = athletes.filter((a) => a.games.length > 1).length

  const efficiency = (a: AthleteAggregate) => {
    const scoring = a.points + a.correct
    const totalResults = a.points + a.correct + a.errors
    return totalResults > 0 ? Math.round((scoring / totalResults) * 100) : 0
  }

  if (loaded && sessions.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card className="border-0 shadow-lg bg-white">
          <CardContent className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100">
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum jogo salvo</h3>
            <p className="text-slate-500">
              Finalize uma leitura no coletor para que ela apareça aqui e seja incluída na análise de performance.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Análise de Performance</h1>
        <p className="text-sm text-slate-500 mt-1">
          Atletas identificadas pelo nome, com parâmetros de todos os jogos salvos em que aparecem
        </p>
      </div>

      {/* Resumo geral */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border border-orange-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">Jogos Salvos</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100">
                <History className="w-4 h-4 text-orange-600" />
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{sessions.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border border-orange-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">Atletas Identificadas</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100">
                <Users className="w-4 h-4 text-orange-600" />
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{athletes.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border border-orange-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">Em Vários Jogos</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                <Trophy className="w-4 h-4 text-amber-600" />
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{multiGameAthletes}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border border-orange-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">Total Levantamentos</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                <Activity className="w-4 h-4 text-amber-600" />
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalLifts}</p>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de jogos */}
      <Card className="bg-white border border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-orange-600" />
            Histórico de Jogos
          </CardTitle>
          <CardDescription>Todas as leituras finalizadas e salvas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions.map((session) => {
              const lifts = session.plays.filter((p) => p.status === "levantamento").length
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-900 truncate">{session.name}</h4>
                    <p className="text-sm text-slate-500">
                      {new Date(session.date).toLocaleDateString("pt-BR")} • {session.teamNames?.A} x{" "}
                      {session.teamNames?.B} • {lifts} levantamentos
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportToPDF(session.plays, session.teamNames, session.settersA, session.settersB, session)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => deleteSession(session.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filtro por equipe */}
      {teamOptions.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Equipe:</span>
          <button
            onClick={() => setTeamFilter("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${teamFilter === "all" ? "bg-orange-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-orange-50"}`}
          >
            Todas
          </button>
          {teamOptions.map((team) => (
            <button
              key={team}
              onClick={() => setTeamFilter(team)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${teamFilter === team ? "bg-orange-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-orange-50"}`}
            >
              {team}
            </button>
          ))}
        </div>
      )}

      {/* Análise por atleta */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-600" />
          Performance por Atleta
        </h2>

        {filteredAthletes.map((athlete) => {
          const eff = efficiency(athlete)
          const isExpanded = expandedAthlete === athlete.key
          const attackEntries = Object.entries(athlete.attacks).sort((a, b) => b[1] - a[1])

          return (
            <Card key={athlete.key} className="bg-white border border-orange-100 shadow-sm overflow-hidden">
              <button
                className="w-full text-left"
                onClick={() => setExpandedAthlete(isExpanded ? null : athlete.key)}
              >
                <div className="p-5 flex items-center justify-between gap-4 hover:bg-orange-50 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 font-bold text-lg">
                      {athlete.setterName.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{athlete.setterName}</h3>
                      <p className="text-sm text-slate-500 truncate">
                        {athlete.teams.join(", ")} •{" "}
                        {athlete.games.length === 1 ? "1 jogo" : `${athlete.games.length} jogos`} •{" "}
                        {athlete.totalLifts} levantamentos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-600">{eff}%</p>
                      <p className="text-xs text-slate-500">aproveitamento</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <CardContent className="border-t border-orange-100 bg-orange-50/40 p-5 space-y-6">
                  {/* Resultado geral */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                      <p className="text-2xl font-bold text-green-600">{athlete.points}</p>
                      <p className="text-xs text-slate-500">Pontos</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border border-blue-200">
                      <p className="text-2xl font-bold text-blue-600">{athlete.correct}</p>
                      <p className="text-xs text-slate-500">Certos</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border border-red-200">
                      <p className="text-2xl font-bold text-red-500">{athlete.errors}</p>
                      <p className="text-xs text-slate-500">Erros</p>
                    </div>
                  </div>

                  {/* Distribuição por posição - radar */}
                  <div className="bg-white rounded-xl border border-orange-100 p-4">
                    <h4 className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-600" />
                      Perfil de Distribuição de Levantamentos
                    </h4>
                    <p className="text-xs text-slate-400 mb-2">Incidência por posição da quadra</p>
                    <PositionRadarChart positions={athlete.positions} />
                  </div>

                  {/* Distribuição por tipo de ataque - donut */}
                  {attackEntries.length > 0 && (
                    <div className="bg-white rounded-xl border border-orange-100 p-4">
                      <h4 className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-600" />
                        Tipos de Ataque
                      </h4>
                      <p className="text-xs text-slate-400 mb-3">Proporção dos ataques após o levantamento</p>
                      <AttackDonutChart attacks={athlete.attacks} />
                    </div>
                  )}

                  {/* Evolução por jogo */}
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                      Desempenho por Jogo
                    </h4>
                    <div className="space-y-2">
                      {athlete.games.map((game, idx) => {
                        const gScoring = game.points + game.correct
                        const gTotal = game.points + game.correct + game.errors
                        const gEff = gTotal > 0 ? Math.round((gScoring / gTotal) * 100) : 0
                        return (
                          <div
                            key={`${game.sessionId}-${idx}`}
                            className="flex items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 text-sm truncate">{game.sessionName}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(game.date).toLocaleDateString("pt-BR")} • {game.teamName} • {game.lifts}{" "}
                                levantamentos
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex gap-1.5 text-xs font-semibold">
                                <span className="text-green-600">{game.points}P</span>
                                <span className="text-blue-600">{game.correct}C</span>
                                <span className="text-red-500">{game.errors}E</span>
                              </div>
                              <Badge className="bg-orange-600 text-white min-w-[52px] justify-center">{gEff}%</Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
