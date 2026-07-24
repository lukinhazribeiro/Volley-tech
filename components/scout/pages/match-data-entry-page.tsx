"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Menu as MenuIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/scout/ui/tabs"
import { Button } from "@/components/scout/ui/button"
import SmartDataEntry from "@/components/scout/smart-entry/smart-data-entry"
import ModernStatsDashboard from "@/components/scout/heatmaps/modern-stats-dashboard"
import PlayerStatsSpreadsheet from "@/components/scout/spreadsheets/player-stats-spreadsheet"
import MatchSetupPage from "./match-setup-page"
import { type MatchAction, calculateMatchStats } from "@/lib/scout/match-parser"
import { createEmptyStats } from "@/lib/scout/match-parser"
import { type Set, isSetComplete, getSetWinner, calculateMatchWinner } from "@/lib/scout/set-manager"
import SetDisplay from "@/components/scout/set-display"
import Card from "@/components/scout/ui/card"
import AdvancedAnalyticsCharts from "@/components/scout/charts/advanced-analytics-charts"
import { saveMatch } from "@/lib/scout/match-storage"
import { syncManager, type SyncMessage } from "@/lib/scout/sync-manager"
import ConnectionStatus from "@/components/scout/connection-status"
import { createEmptyRotation, type CourtRotation } from "@/lib/scout/rotation-manager"
import type { PlayerPosition } from "@/lib/scout/rotation-manager"
import { rotatePositions } from "@/lib/scout/rotation-manager"
import TransitionsDashboard from "@/components/scout/transitions-dashboard"
import type { Player } from "@/components/scout/team-roster-management"

interface MatchData {
  actions: MatchAction[]
  teamAName: string
  teamBName: string
  category: string
  startTime: Date
  teamARotation: CourtRotation
  teamBRotation: CourtRotation
  teamAPlayers: Player[]
  teamBPlayers: Player[]
}

interface MatchDataEntryPageProps {
  roomId?: string | null
  isSynced?: boolean
}

export default function MatchDataEntryPage({ roomId, isSynced }: MatchDataEntryPageProps) {
  const [matchStarted, setMatchStarted] = useState(false)
  const [matchData, setMatchData] = useState<MatchData>({
    actions: [],
    teamAName: "Time A",
    teamBName: "Time B",
    category: "adult",
    startTime: new Date(),
    teamARotation: createEmptyRotation("A"),
    teamBRotation: createEmptyRotation("B"),
    teamAPlayers: [],
    teamBPlayers: [],
  })

  const [sets, setSets] = useState<Set[]>([])
  const [currentSet, setCurrentSet] = useState<Set>({
    number: 1,
    teamAScore: 0,
    teamBScore: 0,
  })
  const [matchComplete, setMatchComplete] = useState(false)
  const [showMatchSummary, setShowMatchSummary] = useState(false)
  const [waitingSave, setWaitingSave] = useState(false)

  const [stats, setStats] = useState({ statsA: createEmptyStats(), statsB: createEmptyStats() })

  // Dados granulares extras do coletor inteligente (toque a toque + direção do
  // ataque inferida). NÃO alimentam os dashboards existentes; ficam guardados
  // separadamente para uso futuro, mantendo compatibilidade total.
  const [rallyExtras, setRallyExtras] = useState<unknown[]>([])
  const handleRallyExtras = (extras: unknown) => {
    setRallyExtras((prev) => [...prev, extras])
  }

  // Aba ativa da coleta, controlada para permitir o menu "cortina" (dropdown)
  // que não ocupa espaço fixo em cima do coletor.
  const [activeTab, setActiveTab] = useState("entry")

  useEffect(() => {
    if (!isSynced || !roomId) return

    const unsubscribe = syncManager.onMessage((message: SyncMessage) => {
      if (message.type === "action") {
        const action = message.data as MatchAction
        const updatedActions = [...matchData.actions, action]
        setMatchData({ ...matchData, actions: updatedActions })

        const newStats = calculateMatchStats(updatedActions)
        setStats(newStats)

        const updatedSet = {
          ...currentSet,
          teamAScore: newStats.statsA.points,
          teamBScore: newStats.statsB.points,
        }

        if (isSetComplete(updatedSet.teamAScore, updatedSet.teamBScore)) {
          const winner = getSetWinner(updatedSet.teamAScore, updatedSet.teamBScore)
          const completedSet = {
            ...updatedSet,
            winner: winner as "A" | "B",
            completedAt: new Date(),
          }

          const newSets = [...sets, completedSet]
          setSets(newSets)

          const matchWinner = calculateMatchWinner(newSets)
          if (matchWinner || newSets.length === 5) {
            setMatchComplete(true)
          } else {
            setCurrentSet({
              number: newSets.length + 1,
              teamAScore: 0,
              teamBScore: 0,
            })
          }
        } else {
          setCurrentSet(updatedSet)
        }
      }
    })

    return unsubscribe
  }, [isSynced, roomId, matchData, currentSet, sets])

  const handleSetup = (teamAName: string, teamBName: string, category: string, teamAPlayers: Player[], teamBPlayers: Player[]) => {
    setMatchData({
      actions: [],
      teamAName,
      teamBName,
      category,
      startTime: new Date(),
      teamARotation: createEmptyRotation("A"),
      teamBRotation: createEmptyRotation("B"),
      teamAPlayers,
      teamBPlayers,
    })
    setStats({ statsA: createEmptyStats(), statsB: createEmptyStats() })
    setSets([])
    setCurrentSet({ number: 1, teamAScore: 0, teamBScore: 0 })
    setMatchComplete(false)
    setMatchStarted(true)
  }

  const handleNewAction = (action: MatchAction) => {
    // Preserva o ponto já definido no coletor (ex.: ponto direto de rebote na
    // face 5b+ e erro de levantamento), para que o +1 vá para a equipe correta.
    let pointScoredBy: "A" | "B" | undefined = action.pointScoredBy
    
    // For serve actions with ace (ka)
    if (action.serveQuality === "ka") {
      pointScoredBy = action.servingTeam as "A" | "B"
    }
    // For serve actions with error (-)
    else if (action.serveQuality === "-") {
      pointScoredBy = (action.servingTeam === "A" ? "B" : "A") as "A" | "B"
    }
    // Rebote de passe que vira ponto direto: usa a equipe escolhida na face 5b+
    else if (action.passingQuality === "R" && action.pointType === "point") {
      pointScoredBy = action.pointScoredBy
    }
    // Erro de levantamento: ponto para a equipe adversária
    else if (action.resultComplemento === "%") {
      pointScoredBy = (action.attackingTeam === "A" ? "B" : "A") as "A" | "B"
    }
    // For reception errors (D)
    else if (action.passingQuality === "D") {
      pointScoredBy = action.servingTeam as "A" | "B"
    }
    // For attack actions
    else if (action.resultComplemento === "#") {
      pointScoredBy = action.attackingTeam as "A" | "B"
    } else if (action.resultComplemento === "!") {
      pointScoredBy = (action.attackingTeam === "A" ? "B" : "A") as "A" | "B"
    } else if (action.resultComplemento === "+") {
      pointScoredBy = (action.attackingTeam === "A" ? "B" : "A") as "A" | "B"
    }
    
    const enrichedAction: MatchAction = {
      ...action,
      setNumber: currentSet.number,
      pointScoredBy,
    }
    
    console.log("[v0] Action with point tracking - Set:", currentSet.number, "Point scored by:", pointScoredBy, "Action:", enrichedAction)
    
    const updatedActions = [...matchData.actions, enrichedAction]

    let newTeamARotation = matchData.teamARotation
    let newTeamBRotation = matchData.teamBRotation

    if (matchData.actions.length > 0) {
      const previousAction = matchData.actions[matchData.actions.length - 1]
      const currentAction = action

      if (previousAction.servingTeam === "A" && currentAction.servingTeam === "B") {
        newTeamBRotation = {
          ...matchData.teamBRotation,
          currentRotation: rotatePositions(matchData.teamBRotation.currentRotation),
          rotationHistory: [...matchData.teamBRotation.rotationHistory, matchData.teamBRotation.currentRotation],
        }
      } else if (previousAction.servingTeam === "B" && currentAction.servingTeam === "A") {
        newTeamARotation = {
          ...matchData.teamARotation,
          currentRotation: rotatePositions(matchData.teamARotation.currentRotation),
          rotationHistory: [...matchData.teamARotation.rotationHistory, matchData.teamARotation.currentRotation],
        }
      }
    }

    setMatchData({
      ...matchData,
      actions: updatedActions,
      teamARotation: newTeamARotation,
      teamBRotation: newTeamBRotation,
    })

    if (isSynced && roomId) {
      syncManager.broadcast({
        type: "action",
        data: enrichedAction,
      } as any)
    }

    const newStats = calculateMatchStats(updatedActions)
    setStats(newStats)

    const currentSetActions = updatedActions.filter((a) => {
      const actionIndex = updatedActions.indexOf(a)
      const setStartIndex = sets.reduce((sum, s) => {
        return sum + (s.teamAScore + s.teamBScore)
      }, 0)
      return actionIndex >= setStartIndex
    })

    const currentSetStats = calculateMatchStats(currentSetActions)

    const updatedSet = {
      ...currentSet,
      teamAScore: currentSetStats.statsA.points,
      teamBScore: currentSetStats.statsB.points,
    }

    if (isSetComplete(updatedSet.teamAScore, updatedSet.teamBScore)) {
      const winner = getSetWinner(updatedSet.teamAScore, updatedSet.teamBScore)
      const completedSet = {
        ...updatedSet,
        winner: winner as "A" | "B",
        completedAt: new Date(),
      }

      const newSets = [...sets, completedSet]
      setSets(newSets)

      const matchWinner = calculateMatchWinner(newSets)
      if (matchWinner || newSets.length === 5) {
        setShowMatchSummary(true)
        setWaitingSave(true)
      } else {
        setCurrentSet({
          number: newSets.length + 1,
          teamAScore: 0,
          teamBScore: 0,
        })
      }
    } else {
      setCurrentSet(updatedSet)
    }
  }

  const handleReset = () => {
    setMatchStarted(false)
    setMatchData({
      actions: [],
      teamAName: "Time A",
      teamBName: "Time B",
      category: "adult",
      startTime: new Date(),
      teamARotation: createEmptyRotation("A"),
      teamBRotation: createEmptyRotation("B"),
      teamAPlayers: [],
      teamBPlayers: [],
    })
    setStats({ statsA: createEmptyStats(), statsB: createEmptyStats() })
    setSets([])
    setCurrentSet({ number: 1, teamAScore: 0, teamBScore: 0 })
    setMatchComplete(false)
    setShowMatchSummary(false)
    setWaitingSave(false)
  }

  const handleRotationChange = (teamId: "A" | "B", rotation: PlayerPosition[]) => {
    setMatchData({
      ...matchData,
      [teamId === "A" ? "teamARotation" : "teamBRotation"]: {
        ...(teamId === "A" ? matchData.teamARotation : matchData.teamBRotation),
        currentRotation: rotation,
      },
    })
  }

  const handleEndSet = () => {
    if (currentSet.teamAScore > 0 || currentSet.teamBScore > 0) {
      const winner = currentSet.teamAScore > currentSet.teamBScore ? "A" : "B"
      const completedSet = {
        ...currentSet,
        winner: winner as "A" | "B",
        completedAt: new Date(),
      }

      const newSets = [...sets, completedSet]
      setSets(newSets)

      const matchWinner = calculateMatchWinner(newSets)
      if (matchWinner || newSets.length === 5) {
        setShowMatchSummary(true)
        setWaitingSave(true)
      } else {
        setCurrentSet({
          number: newSets.length + 1,
          teamAScore: 0,
          teamBScore: 0,
        })
      }
    }
  }

  const handleFinishMatch = () => {
    setShowMatchSummary(true)
    setWaitingSave(true)
  }

  const handleSaveMatch = () => {
    const winner = sets.filter((s) => s.winner === "A").length >= 3 ? "A" : "B"
    const totalDuration = Math.floor((new Date().getTime() - matchData.startTime.getTime()) / 1000)

    saveMatch({
      teamAName: matchData.teamAName,
      teamBName: matchData.teamBName,
      category: matchData.category,
      sets,
      actions: matchData.actions,
      totalDuration,
      createdAt: matchData.startTime,
      completedAt: new Date(),
      winner,
    })
    handleReset()
  }

  const handleDontSave = () => {
    handleReset()
  }

  if (!matchStarted) {
    return <MatchSetupPage onSetup={handleSetup} />
  }

  if (matchComplete || waitingSave) {
    const winner = sets.filter((s) => s.winner === "A").length >= 3 ? "A" : "B"
    const totalDuration = Math.floor((new Date().getTime() - matchData.startTime.getTime()) / 1000)

    return (
      <div className="w-full h-screen bg-background overflow-auto">
        <Tabs defaultValue="stats" className="w-full">
          <div className="flex items-center justify-between px-4 border-b p-4">
            <TabsList className="justify-start rounded-none border-b-0">
              <TabsTrigger value="stats">Estatísticas</TabsTrigger>
              <TabsTrigger value="spreadsheet">Planilha</TabsTrigger>
              <TabsTrigger value="charts">Gráficos</TabsTrigger>
              <TabsTrigger value="transitions">Transições</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="stats" className="p-4">
            <div className="space-y-6">
              <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
                <h2 className="text-2xl font-bold text-foreground mb-4 text-center">Partida Finalizada!</h2>

                <div className="mb-6 p-6 bg-white rounded-lg border-2 border-orange-100 flex flex-col items-center">
                  <h3 className="font-bold text-xl mb-4 text-center">Resultado dos Sets:</h3>
                  <div className="grid grid-cols-3 gap-3 max-w-2xl">
                    {sets.map((set, index) => (
                      <div key={index} className="text-center p-4 bg-orange-50 rounded-lg border-2 border-orange-100 shadow-sm">
                        <p className="font-bold text-base mb-1">Set {index + 1}º</p>
                        <p className="text-2xl font-bold mb-1">
                          {set.teamAScore} x {set.teamBScore}
                        </p>
                        <p className="text-sm text-orange-600 font-semibold">
                          {set.winner === "A" ? matchData.teamAName : matchData.teamBName}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center mb-4">
                  <p className="text-xl font-semibold text-foreground">
                    Vencedor:{" "}
                    <span className="text-orange-600 text-2xl">
                      {winner === "A" ? matchData.teamAName : matchData.teamBName}
                    </span>
                  </p>
                  <p className="text-base text-muted-foreground mt-2">
                    Duração: {Math.floor(totalDuration / 60)} minutos
                  </p>
                </div>
              </Card>

              <ModernStatsDashboard
                stats={stats}
                teamAName={matchData.teamAName}
                teamBName={matchData.teamBName}
                actions={matchData.actions}
                sets={sets}
              />
            </div>
          </TabsContent>

          <TabsContent value="spreadsheet" className="p-4">
            <PlayerStatsSpreadsheet
              actions={matchData.actions}
              teamAName={matchData.teamAName}
              teamBName={matchData.teamBName}
            />
          </TabsContent>

          <TabsContent value="charts" className="p-4">
            <AdvancedAnalyticsCharts
              actions={matchData.actions}
              sets={sets}
              teamAName={matchData.teamAName}
              teamBName={matchData.teamBName}
            />
          </TabsContent>

          <TabsContent value="transitions" className="p-4">
            <TransitionsDashboard
              actions={matchData.actions}
              teamAName={matchData.teamAName}
              teamBName={matchData.teamBName}
            />
          </TabsContent>
        </Tabs>

        <div className="fixed bottom-4 right-4 space-x-2">
          <Button onClick={handleSaveMatch} className="bg-green-600 hover:bg-green-700">
            Salvar Partida
          </Button>
          <Button onClick={handleDontSave} variant="outline">
            Descartar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-background">
      {isSynced && <ConnectionStatus roomId={roomId} isSynced={isSynced} />}

      <div className="border-b p-4 bg-card">
        <div className="flex items-center justify-center mb-3">
          <SetDisplay
            sets={sets}
            currentSet={currentSet}
            teamAName={matchData.teamAName}
            teamBName={matchData.teamBName}
          />
        </div>
        <div className="flex justify-center gap-2">
          <Button onClick={handleEndSet} variant="outline" size="sm">
            Encerrar Set
          </Button>
          <Button onClick={handleFinishMatch} variant="destructive" size="sm">
            Finalizar Jogo
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-[calc(100%-120px)]">
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b">
          <CurtainNav
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: "entry", label: "Coleta de Dados" },
              { value: "stats", label: "Estatísticas" },
              { value: "spreadsheet", label: "Planilha" },
              { value: "charts", label: "Gráficos" },
              { value: "transitions", label: "Transições" },
            ]}
          />
          <Button onClick={handleReset} variant="outline" size="sm">
            Nova Partida
          </Button>
        </div>

        <TabsContent value="entry" className="h-[calc(100%-45px)] overflow-auto">
          <SmartDataEntry
            onActionComplete={handleNewAction}
            teamAName={matchData.teamAName}
            teamBName={matchData.teamBName}
            teamAScore={currentSet.teamAScore}
            teamBScore={currentSet.teamBScore}
            teamAPlayers={matchData.teamAPlayers}
            teamBPlayers={matchData.teamBPlayers}
            statsA={stats.statsA}
            statsB={stats.statsB}
            setNumber={currentSet.number}
            onRallyExtras={handleRallyExtras}
          />
        </TabsContent>

        <TabsContent value="stats" className="h-[calc(100%-45px)] overflow-auto p-4">
          <ModernStatsDashboard
            stats={stats}
            teamAName={matchData.teamAName}
            teamBName={matchData.teamBName}
            actions={matchData.actions}
            sets={sets}
          />
        </TabsContent>

        <TabsContent value="spreadsheet" className="h-[calc(100%-45px)] overflow-auto p-4">
          <PlayerStatsSpreadsheet
            actions={matchData.actions}
            teamAName={matchData.teamAName}
            teamBName={matchData.teamBName}
          />
        </TabsContent>

        <TabsContent value="charts" className="h-[calc(100%-45px)] overflow-auto p-4">
          <AdvancedAnalyticsCharts
            actions={matchData.actions}
            sets={sets}
            teamAName={matchData.teamAName}
            teamBName={matchData.teamBName}
          />
        </TabsContent>

        <TabsContent value="transitions" className="h-[calc(100%-45px)] overflow-auto p-4">
          <TransitionsDashboard
            actions={matchData.actions}
            teamAName={matchData.teamAName}
            teamBName={matchData.teamBName}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface CurtainNavProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

/**
 * Menu "cortina": um botão compacto que abre um painel suspenso (dropdown) com
 * as seções. Substitui a barra de abas horizontal que ficava fixa cobrindo o
 * coletor — agora a navegação some após a escolha e libera a tela inteira para
 * os dados que o analista precisa ver.
 */
function CurtainNav({ value, onChange, options }: CurtainNavProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)?.label ?? "Menu"

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MenuIcon className="h-4 w-4" />
        <span>{current}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-56 origin-top overflow-hidden rounded-xl border border-orange-100 bg-white shadow-xl"
        >
          {options.map((o) => {
            const active = o.value === value
            return (
              <button
                key={o.value}
                role="menuitem"
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2 border-l-4 px-4 py-2.5 text-left text-sm font-semibold transition ${
                  active
                    ? "border-orange-600 bg-orange-50 text-orange-700"
                    : "border-transparent text-slate-600 hover:bg-slate-50"
                }`}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
