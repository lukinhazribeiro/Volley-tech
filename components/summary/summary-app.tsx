"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/summary/ui/button"
import { Card, CardContent } from "@/components/summary/ui/card"
import { Badge } from "@/components/summary/ui/badge"
import { Input } from "@/components/summary/ui/input"
import { VolleyTechLogo } from "@/components/hub/volley-tech-logo"
import {
  RotateCw,
  Plus,
  Minus,
  Play,
  Settings,
  ShieldCheck,
  Clock,
  Trophy,
  Flag,
  FileDown,
  Square,
  UserPlus,
  Users,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/summary/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/summary/ui/dialog"
import { GameReport } from "@/components/summary/game-report"
import { TeamsManager } from "@/components/summary/teams-manager"
import { CompetitionsManager } from "@/components/summary/competitions-manager"
import {
  getTeams,
  getCompetitions,
  getMatches,
  saveMatch,
  deleteMatch,
  type SavedTeam,
  type Competition,
} from "@/lib/summary/registry"

type Player = {
  number: number
  name: string
  isLibero: boolean
  isCaptain: boolean
}

type Team = {
  name: string
  players: Player[]
  formation: (Player | null)[]
  activeLibero: Player | null
  score: number
  serving: boolean
  sets: 0 | 1 | 2 | 3 | 4 | 5
  timeouts: 0 | 1 | 2
}

type Substitution = {
  setNumber: number
  team: "A" | "B"
  playerOut: Player
  playerIn: Player
  timestamp: Date
}

type Timeout = {
  setNumber: number
  team: "A" | "B"
  scoreA: number
  scoreB: number
  timestamp: Date
}

type Penalty = {
  setNumber: number
  team: "A" | "B"
  type: "yellow" | "red"
  scoreA: number
  scoreB: number
  timestamp: Date
}

type SetResult = {
  setNumber: number
  teamAScore: number
  teamBScore: number
  winner: "A" | "B"
  teamAFormation: (Player | null)[]
  teamBFormation: (Player | null)[]
  substitutions: Substitution[]
  timeouts: Timeout[]
  penalties: Penalty[]
}

type SavedMatch = {
  id: string
  date: string
  championshipName: string
  teamA: Team
  teamB: Team
  setHistory: SetResult[]
  winnerName: string
  scoreline: string
}

const POSITION_COORDS = [
  { id: 1, x: "75%", y: "80%", label: "P1" },
  { id: 2, x: "75%", y: "20%", label: "P2" },
  { id: 3, x: "50%", y: "20%", label: "P3" },
  { id: 4, x: "25%", y: "20%", label: "P4" },
  { id: 5, x: "25%", y: "80%", label: "P5" },
  { id: 6, x: "50%", y: "80%", label: "P6" },
]

export default function SummaryApp() {
  const [championshipName, setChampionshipName] = useState("")

  const [teamA, setTeamA] = useState<Team>({
    name: "Equipe A",
    players: Array(14)
      .fill(null)
      .map((_, i) => ({ number: i + 1, name: "", isLibero: false, isCaptain: false })),
    formation: [null, null, null, null, null, null],
    activeLibero: null,
    score: 0,
    serving: true,
    sets: 0,
    timeouts: 0,
  })

  const [teamB, setTeamB] = useState<Team>({
    name: "Equipe B",
    players: Array(14)
      .fill(null)
      .map((_, i) => ({ number: i + 1, name: "", isLibero: false, isCaptain: false })),
    formation: [null, null, null, null, null, null],
    activeLibero: null,
    score: 0,
    serving: false,
    sets: 0,
    timeouts: 0,
  })

  const [gameStarted, setGameStarted] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const [setupMode, setSetupMode] = useState(true)
  const [selectedBenchPlayer, setSelectedBenchPlayer] = useState<{ player: Player; team: "A" | "B" } | null>(null)
  const [maxSets, setMaxSets] = useState<3 | 5>(3)
  const [currentSet, setCurrentSet] = useState(1)

  const [setHistory, setSetHistory] = useState<SetResult[]>([])
  const [showFinalDashboard, setShowFinalDashboard] = useState(false)
  const [showReport, setShowReport] = useState(false)

  const [substitutions, setSubstitutions] = useState<Substitution[]>([])
  const [timeouts, setTimeouts] = useState<Timeout[]>([])
  const [penalties, setPenalties] = useState<Penalty[]>([])
  const [showSetFormationModal, setShowSetFormationModal] = useState(false)
  const [pendingSetNumber, setPendingSetNumber] = useState<number | null>(null)
  const [selectedPlayerForSub, setSelectedPlayerForSub] = useState<{ team: "A" | "B"; player: Player } | null>(null)
  const [showManualEndSetDialog, setShowManualEndSetDialog] = useState(false)

  const [savedMatches, setSavedMatches] = useState<SavedMatch[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [viewingMatch, setViewingMatch] = useState<SavedMatch | null>(null)

  // Equipes pré-cadastradas e competições
  const [showTeamsManager, setShowTeamsManager] = useState(false)
  const [showCompetitionsManager, setShowCompetitionsManager] = useState(false)
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>("")

  const refreshRegistry = async () => {
    try {
      const [teams, comps] = await Promise.all([getTeams(), getCompetitions()])
      setSavedTeams(teams)
      setCompetitions(comps)
    } catch (err) {
      console.error("[v0] Erro ao carregar equipes/competições:", err)
    }
  }

  const refreshMatches = async () => {
    try {
      const records = await getMatches()
      // Reconstrói a súmula completa a partir do JSON salvo, usando o id do banco.
      setSavedMatches(records.map((r) => ({ ...(r.data as unknown as SavedMatch), id: r.id, date: r.date })))
    } catch (err) {
      console.error("[v0] Erro ao carregar histórico de jogos:", err)
    }
  }

  useEffect(() => {
    refreshRegistry()
    refreshMatches()
  }, [])

  // Equipes disponíveis para seleção: se a competição definir equipes participantes,
  // limita às equipes vinculadas; caso contrário, mostra todas as cadastradas.
  const selectedCompetition = competitions.find((c) => c.id === selectedCompetitionId)
  const availableTeams =
    selectedCompetition && selectedCompetition.teamIds.length > 0
      ? savedTeams.filter((t) => selectedCompetition.teamIds.includes(t.id))
      : savedTeams

  // Carrega um elenco pré-cadastrado na equipe da partida (formação/capitão/líbero ficam por partida).
  const loadSavedTeamRoster = (teamId: "A" | "B", savedTeamId: string) => {
    const savedTeam = savedTeams.find((t) => t.id === savedTeamId)
    if (!savedTeam) return
    const setTeam = teamId === "A" ? setTeamA : setTeamB
    const team = teamId === "A" ? teamA : teamB
    const players: Player[] = savedTeam.players.map((p) => ({
      number: p.number,
      name: p.name,
      isLibero: false,
      isCaptain: false,
    }))
    setTeam({
      ...team,
      name: savedTeam.name,
      players,
      formation: [null, null, null, null, null, null],
      activeLibero: null,
    })
  }

  const [substitutionPairs, setSubstitutionPairs] = useState<
    { team: "A" | "B"; player1: number; player2: number; setNumber: number }[]
  >([])

  // A impressão agora é feita através do botão nativo no GameReport component

  const updatePlayer = (
    teamId: "A" | "B",
    index: number,
    field: "number" | "name" | "isLibero" | "isCaptain",
    value: any,
  ) => {
    const teamState = teamId === "A" ? setTeamA : setTeamB
    teamState((prevTeam) => {
      const newPlayers = [...prevTeam.players]

      if (field === "isCaptain" && value === true) {
        newPlayers.forEach((p, i) => {
          if (i !== index) p.isCaptain = false
        })
      }

      newPlayers[index] = { ...newPlayers[index], [field]: value }

      return { ...prevTeam, players: newPlayers }
    })
  }

  const rotateTeam = (team: "A" | "B") => {
    const teamState = team === "A" ? setTeamA : setTeamB
    teamState((prevTeam) => {
      const formation = prevTeam.formation
      const rotated = [formation[1], formation[2], formation[3], formation[4], formation[5], formation[0]]
      return { ...prevTeam, formation: rotated }
    })
  }

  // CHANGE: Corrigindo lógica de pontuação para evitar erros ao trocar saque
  const addPoint = (team: "A" | "B") => {
    if (!gameStarted) return

    const scoringTeam = team === "A" ? teamA : teamB
    const otherTeam = team === "A" ? teamB : teamA
    const wasServing = scoringTeam.serving

    if (!wasServing) {
      // Equipe conquista o saque - deve rotacionar
      const formation = scoringTeam.formation
      const rotated = [formation[1], formation[2], formation[3], formation[4], formation[5], formation[0]]

      if (team === "A") {
        setTeamA({ ...teamA, formation: rotated, score: teamA.score + 1, serving: true })
        setTeamB({ ...teamB, serving: false })
      } else {
        setTeamB({ ...teamB, formation: rotated, score: teamB.score + 1, serving: true })
        setTeamA({ ...teamA, serving: false })
      }
    } else {
      // Equipe já estava sacando - apenas adiciona ponto
      if (team === "A") {
        setTeamA({ ...teamA, score: teamA.score + 1 })
      } else {
        setTeamB({ ...teamB, score: teamB.score + 1 })
      }
    }

    // Verificar fim do set
    checkSetEnd()
  }

  const removePoint = (team: "A" | "B") => {
    if (!gameStarted) return

    const teamState = team === "A" ? setTeamA : setTeamB
    teamState((prevTeam) => {
      if (prevTeam.score > 0) {
        return { ...prevTeam, score: prevTeam.score - 1 }
      }
      return prevTeam
    })
  }

  const addTimeout = (team: "A" | "B") => {
    const currentTeam = team === "A" ? teamA : teamB
    if (currentTeam.timeouts >= 2) {
      alert(`${currentTeam.name} já utilizou os 2 tempos técnicos disponíveis neste set`)
      return
    }

    const newTimeout: Timeout = {
      setNumber: currentSet,
      team,
      scoreA: teamA.score,
      scoreB: teamB.score,
      timestamp: new Date(),
    }
    setTimeouts([...timeouts, newTimeout])

    const teamState = team === "A" ? setTeamA : setTeamB
    teamState((prevTeam) => ({ ...prevTeam, timeouts: (prevTeam.timeouts + 1) as 1 | 2 }))
  }

  const addPenalty = (team: "A" | "B", type: "yellow" | "red") => {
    const newPenalty: Penalty = {
      setNumber: currentSet,
      team,
      type,
      scoreA: teamA.score,
      scoreB: teamB.score,
      timestamp: new Date(),
    }
    setPenalties([...penalties, newPenalty])

    // Optional: Add logic for red card point consequence if desired,
    // but for now just logging it as requested.
    // Red card usually gives a point to the opponent and service.
  }

  const checkSetEnd = () => {
    const SET_POINTS_LIMIT = 25 // Standard volleyball set winning score
    const MIN_DIFFERENCE = 2 // Must win by at least 2 points

    let winner: "A" | "B" | null = null

    if (teamA.score >= SET_POINTS_LIMIT && teamA.score - teamB.score >= MIN_DIFFERENCE) {
      winner = "A"
    } else if (teamB.score >= SET_POINTS_LIMIT && teamB.score - teamA.score >= MIN_DIFFERENCE) {
      winner = "B"
    }

    // Handling the case where a set might go beyond 25-25, like 26-24 or 30-28
    if (winner === null) {
      if (teamA.score > SET_POINTS_LIMIT + 5 || teamB.score > SET_POINTS_LIMIT + 5) {
        // Arbitrary high score to prevent infinite loops if logic fails
        alert("Set score seems unusually high. Please manually check the end of set condition.")
      }
    }

    if (winner) {
      endSet(winner)
    }
  }

  const endSet = (winner: "A" | "B") => {
    const newSetResult: SetResult = {
      setNumber: currentSet,
      teamAScore: teamA.score,
      teamBScore: teamB.score,
      winner,
      teamAFormation: [...teamA.formation],
      teamBFormation: [...teamB.formation],
      substitutions: substitutions.filter((s) => s.setNumber === currentSet),
      timeouts: timeouts.filter((t) => t.setNumber === currentSet),
      penalties: penalties.filter((p) => p.setNumber === currentSet),
    }

    setSetHistory([...setHistory, newSetResult])

    if (teamA.sets + (winner === "A" ? 1 : 0) === maxSets || teamB.sets + (winner === "B" ? 1 : 0) === maxSets) {
      // Game ends
      setShowFinalDashboard(true)
      setGameStarted(false)
    } else {
      // Proceed to next set
      if (winner === "A") {
        setTeamA({ ...teamA, sets: (teamA.sets + 1) as 1 | 2 | 3 | 4 | 5, score: 0, timeouts: 0 })
        setTeamB({ ...teamB, score: 0, timeouts: 0 })
      } else {
        setTeamB({ ...teamB, sets: (teamB.sets + 1) as 1 | 2 | 3 | 4 | 5, score: 0, timeouts: 0 })
        setTeamA({ ...teamA, score: 0, timeouts: 0 })
      }

      setPendingSetNumber(currentSet + 1)
      setShowSetFormationModal(true)
    }
  }

  // Handler for manual end set
  const handleManualEndSet = (winner: "A" | "B") => {
    endSet(winner)
    setShowManualEndSetDialog(false)
    // setGameStarted(false) // Ensure game state is updated correctly - REMOVED
  }

  const confirmNewSetFormation = () => {
    if (pendingSetNumber) {
      setCurrentSet(pendingSetNumber)
      setShowSetFormationModal(false)
      setPendingSetNumber(null)
      setSubstitutionPairs(substitutionPairs.filter((pair) => pair.setNumber < pendingSetNumber))
      setGameStarted(true)
    }
  }

  const startGame = () => {
    setGameStarted(true)
    setSetupMode(false)
  }

  const endGame = () => {
    setShowFinalDashboard(true)
    setGameStarted(false)
  }

  const [savingMatch, setSavingMatch] = useState(false)

  const saveMatchToHistory = async () => {
    if (savingMatch) return
    setSavingMatch(true)
    const finalSetsA = setHistory.filter((s) => s.winner === "A").length
    const finalSetsB = setHistory.filter((s) => s.winner === "B").length
    const winnerName = finalSetsA >= finalSetsB ? teamA.name : teamB.name
    const scoreline = `${finalSetsA} - ${finalSetsB}`
    const matchData = {
      championshipName,
      teamA: { ...teamA },
      teamB: { ...teamB },
      setHistory: [...setHistory],
      winnerName,
      scoreline,
    }
    try {
      await saveMatch({
        competitionId: selectedCompetitionId || null,
        championshipName,
        winnerName,
        scoreline,
        data: matchData as unknown as Record<string, unknown>,
      })
      await refreshMatches()
      alert("Jogo salvo no histórico da sua conta!")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível salvar o jogo.")
    } finally {
      setSavingMatch(false)
    }
  }

  const deleteSavedMatch = async (id: string) => {
    if (!confirm("Excluir este jogo do histórico?")) return
    try {
      await deleteMatch(id)
      await refreshMatches()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível excluir o jogo.")
    }
  }

  const restartGame = () => {
    setShowFinalDashboard(false)
    setShowReport(false)
    setSetupMode(true)
    setCurrentSet(1)
    setSetHistory([])
    setSubstitutions([])
    setTimeouts([])
    setPenalties([]) // Reset penalties
    setSubstitutionPairs([]) // Reset substitution pairs on restart
    setTeamA({
      ...teamA,
      name: "Equipe A",
      score: 0,
      sets: 0,
      timeouts: 0,
      formation: [null, null, null, null, null, null],
      serving: true,
      activeLibero: null,
      players: Array(14)
        .fill(null)
        .map((_, i) => ({ number: i + 1, name: "", isLibero: false, isCaptain: false })),
    })
    setTeamB({
      ...teamB,
      name: "Equipe B",
      score: 0,
      sets: 0,
      timeouts: 0,
      formation: [null, null, null, null, null, null],
      serving: false,
      activeLibero: null,
      players: Array(14)
        .fill(null)
        .map((_, i) => ({ number: i + 1, name: "", isLibero: false, isCaptain: false })),
    })
    setChampionshipName("")
    setSelectedCompetitionId("")
    setSelectedPlayerForSub(null) // Reset selected player on restart
  }

  // CHANGE: renderSetupPanel function modified
  const renderSetupPanel = (teamId: "A" | "B") => {
    const team = teamId === "A" ? teamA : teamB
    const setTeam = teamId === "A" ? setTeamA : setTeamB
    const color = teamId === "A" ? "blue" : "orange"

    const validPlayers = team.players.filter((p) => p.name.trim() !== "" && p.number > 0)

    // Helper function to add player to formation
    const addToFormation = (positionIndex: number, playerNumber: number) => {
      const playerToAdd = team.players.find((p) => p.number === playerNumber)

      if (playerToAdd && !team.formation.includes(playerToAdd) && !playerToAdd.isLibero) {
        const newFormation = [...team.formation]
        newFormation[positionIndex] = playerToAdd
        setTeam({ ...team, formation: newFormation })
      }
    }

    // Helper function to remove player from formation
    const removeFromFormation = (positionIndex: number) => {
      const newFormation = [...team.formation]
      newFormation[positionIndex] = null
      setTeam({ ...team, formation: newFormation })
    }

    // Helper function to auto-fill formation
    const autoFillFormation = () => {
      const availablePlayers = team.players.filter(
        (p) => p.name && p.number && !team.formation.includes(p) && !p.isLibero,
      )

      const newFormation = [...team.formation]
      let playerIndex = 0
      for (let i = 0; i < newFormation.length; i++) {
        if (newFormation[i] === null && playerIndex < availablePlayers.length) {
          newFormation[i] = availablePlayers[playerIndex]
          playerIndex++
        }
      }
      setTeam({ ...team, formation: newFormation })
    }

    // Helper function to clear formation
    const clearFormation = () => {
      setTeam({ ...team, formation: [null, null, null, null, null, null] })
    }

    return (
      <Card className="border-2 border-slate-200 shadow-xl bg-white overflow-hidden relative">
        <div className={`absolute top-0 left-0 w-2 h-full ${teamId === "A" ? "bg-blue-600" : "bg-orange-600"}`} />
        <CardContent className="p-6">
          <div
            className={`mb-6 p-4 rounded-xl ${teamId === "A" ? "bg-blue-50 border-2 border-blue-200" : "bg-orange-50 border-2 border-orange-200"}`}
          >
            <label
              className={`text-sm font-bold uppercase tracking-wider mb-2 block ${teamId === "A" ? "text-blue-800" : "text-orange-800"}`}
            >
              {teamId === "A" ? "EQUIPE A" : "EQUIPE B"}
            </label>

            {availableTeams.length > 0 && (
              <div className="mb-3">
                <Select onValueChange={(value) => loadSavedTeamRoster(teamId, value)}>
                  <SelectTrigger
                    className={`w-full h-11 bg-white border-2 ${teamId === "A" ? "border-blue-300" : "border-orange-300"}`}
                  >
                    <span className="flex items-center gap-2 text-slate-600">
                      <Users className="size-4" />
                      {selectedCompetition && selectedCompetition.teamIds.length > 0
                        ? "Carregar equipe da competição"
                        : "Carregar equipe cadastrada"}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="bg-white border-2 border-slate-200 shadow-xl z-[100]">
                    {availableTeams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.players.length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Input
              value={team.name}
              onChange={(e) => setTeam({ ...team, name: e.target.value })}
              placeholder={`Nome da ${teamId === "A" ? "Equipe A" : "Equipe B"}`}
              className={`text-lg font-bold bg-white border-2 ${teamId === "A" ? "border-blue-300 focus:border-blue-500" : "border-orange-300 focus:border-orange-500"}`}
            />
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="size-4" />
              Elenco Completo (até 14 jogadores)
            </h3>
            <p className="text-xs text-slate-600 mb-3 bg-slate-100 p-2 rounded">
              Preencha nome e número dos atletas. Mínimo: 6 jogadores.
            </p>
            <div className="space-y-2 bg-slate-100 p-3 rounded-xl border border-slate-200">
              {team.players.map((player, idx) => (
                <div
                  key={idx}
                  className="flex gap-2 items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm"
                >
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    value={player.number || ""}
                    onChange={(e) => updatePlayer(teamId, idx, "number", Number.parseInt(e.target.value) || 0)}
                    placeholder="#"
                    className="w-16 text-center font-bold text-lg bg-slate-50 border-2 border-slate-300"
                  />
                  <Input
                    value={player.name}
                    onChange={(e) => updatePlayer(teamId, idx, "name", e.target.value)}
                    placeholder="Nome do jogador"
                    className="flex-1 font-medium bg-slate-50 border-2 border-slate-300"
                  />
                  <label className="flex items-center gap-1 text-xs bg-red-50 px-2 py-1 rounded border border-red-200">
                    <input
                      type="checkbox"
                      checked={player.isLibero}
                      onChange={(e) => updatePlayer(teamId, idx, "isLibero", e.target.checked)}
                      className="rounded"
                    />
                    <ShieldCheck className="size-4 text-red-600" />
                    <span className="text-red-700 font-bold hidden sm:inline">L</span>
                  </label>
                  <label className="flex items-center gap-1 text-xs bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                    <input
                      type="checkbox"
                      checked={player.isCaptain}
                      onChange={(e) => updatePlayer(teamId, idx, "isCaptain", e.target.checked)}
                      className="rounded"
                    />
                    <span className="font-bold text-yellow-700">C</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t-2 border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="size-4" />
                Formação Inicial (6 titulares)
              </h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={autoFillFormation}
                  className="text-xs bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                >
                  Preencher Auto
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearFormation}
                  className="text-xs bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                >
                  Limpar
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-slate-100 p-4 rounded-xl border border-slate-200">
              {POSITION_COORDS.map((pos, idx) => (
                <div key={pos.id} className="bg-white p-3 rounded-lg border-2 border-slate-200 shadow-sm">
                  <div
                    className={`text-xs font-bold mb-2 px-2 py-1 rounded inline-block ${teamId === "A" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}`}
                  >
                    {pos.label}
                  </div>
                  {team.formation[idx] ? (
                    <div
                      className={`flex items-center justify-between p-3 rounded-lg border-2 ${teamId === "A" ? "bg-blue-50 border-blue-300" : "bg-orange-50 border-orange-300"}`}
                    >
                      <span className={`text-sm font-bold ${teamId === "A" ? "text-blue-900" : "text-orange-900"}`}>
                        #{team.formation[idx]?.number} - {team.formation[idx]?.name}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromFormation(idx)}
                        className="h-7 w-7 p-0 bg-red-100 text-red-600 hover:bg-red-200 rounded-full"
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <Select onValueChange={(value) => addToFormation(idx, Number.parseInt(value))}>
                      <SelectTrigger className="w-full h-12 text-sm bg-white border-2 border-slate-300 font-medium">
                        <span className="text-slate-500">Selecionar jogador</span>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-2 border-slate-300 shadow-xl z-[100]">
                        {team.players
                          .filter((p) => p.name.trim() !== "" && !team.formation.includes(p) && !p.isLibero)
                          .map((p) => (
                            <SelectItem
                              key={p.number}
                              value={p.number.toString()}
                              className="text-slate-900 font-medium hover:bg-slate-100 cursor-pointer py-3"
                            >
                              #{p.number} - {p.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t-2 border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="size-4 text-red-600" />
              Líbero (Opcional)
            </h3>
            <p className="text-xs text-slate-600 mb-3 bg-slate-100 p-2 rounded">
              O líbero é um jogador especializado em defesa que pode entrar e sair livremente sem contar como
              substituição.
            </p>
            <Select
              value={team.activeLibero?.number.toString() || "none"}
              onValueChange={(value) => {
                if (value === "none") {
                  setTeam({ ...team, activeLibero: null })
                } else {
                  const libero = team.players.find((p) => p.number === Number.parseInt(value) && p.isLibero)
                  if (libero) {
                    setTeam({ ...team, activeLibero: libero })
                  }
                }
              }}
            >
              {/* SelectTrigger com melhor contraste e fundo branco */}
              <SelectTrigger className="w-full bg-white border-2 border-slate-300 h-12 text-lg font-medium">
                <span className="flex items-center gap-2">
                  {team.activeLibero ? (
                    <>
                      <ShieldCheck className="size-4 text-red-600" />#{team.activeLibero.number} -{" "}
                      {team.activeLibero.name}
                    </>
                  ) : (
                    <span className="text-slate-400">Nenhum líbero selecionado</span>
                  )}
                </span>
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-slate-300 shadow-xl">
                <SelectItem value="none" className="text-slate-900 font-medium hover:bg-slate-100 cursor-pointer py-3">
                  Nenhum líbero
                </SelectItem>
                {team.players
                  .filter((p) => p.isLibero && p.name.trim() !== "")
                  .map((p) => (
                    <SelectItem
                      key={p.number}
                      value={p.number.toString()}
                      className="text-slate-900 font-medium hover:bg-slate-100 cursor-pointer py-3"
                    >
                      #{p.number} - {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    )
  }

  const makeSubstitution = (team: "A" | "B", playerOut: Player, playerIn: Player) => {
    const targetTeam = team === "A" ? teamA : teamB
    const setTargetTeam = team === "A" ? setTeamA : setTeamB

    // Verificar se existe par de substituição ativo neste set
    const existingPair = substitutionPairs.find(
      (pair) =>
        pair.team === team &&
        pair.setNumber === currentSet &&
        ((pair.player1 === playerOut.number && pair.player2 === playerIn.number) ||
          (pair.player1 === playerIn.number && pair.player2 === playerOut.number)),
    )

    if (existingPair) {
      // Permitir a troca inversa
      const newFormation = targetTeam.formation.map((p) => (p === playerOut ? playerIn : p))

      const newSubstitution: Substitution = {
        setNumber: currentSet,
        team,
        playerOut,
        playerIn,
        timestamp: new Date(),
      }

      setSubstitutions([...substitutions, newSubstitution])
      setTargetTeam({ ...targetTeam, formation: newFormation })
    } else {
      // Verificar se algum dos jogadores já está em um par de substituição
      const playerOutInPair = substitutionPairs.find(
        (pair) =>
          pair.team === team &&
          pair.setNumber === currentSet &&
          (pair.player1 === playerOut.number || pair.player2 === playerOut.number),
      )

      const playerInInPair = substitutionPairs.find(
        (pair) =>
          pair.team === team &&
          pair.setNumber === currentSet &&
          (pair.player1 === playerIn.number || pair.player2 === playerIn.number),
      )

      if (playerOutInPair) {
        alert(
          `Jogador #${playerOut.number} já está em um par de substituição com outro jogador neste set. Só pode voltar trocando com esse jogador específico.`,
        )
        return
      }

      if (playerInInPair) {
        alert(
          `Jogador #${playerIn.number} já está em um par de substituição com outro jogador neste set. Só pode entrar trocando com esse jogador específico.`,
        )
        return
      }

      // Criar novo par de substituição
      const newFormation = targetTeam.formation.map((p) => (p === playerOut ? playerIn : p))

      const newSubstitution: Substitution = {
        setNumber: currentSet,
        team,
        playerOut,
        playerIn,
        timestamp: new Date(),
      }

      setSubstitutions([...substitutions, newSubstitution])
      setSubstitutionPairs([
        ...substitutionPairs,
        { team, player1: playerOut.number, player2: playerIn.number, setNumber: currentSet },
      ])
      setTargetTeam({ ...targetTeam, formation: newFormation })
    }
  }

  const handlePlayerClick = (team: "A" | "B", player: Player) => {
    console.log("[v0] handlePlayerClick called:", team, player.number, player.name)
    if (selectedPlayerForSub && selectedPlayerForSub.player === player) {
      setSelectedPlayerForSub(null)
    } else {
      setSelectedPlayerForSub({ team, player })
    }
  }

  const handleBenchPlayerClick = (team: "A" | "B", benchPlayer: Player) => {
    console.log("[v0] handleBenchPlayerClick called:", team, benchPlayer.number, selectedPlayerForSub)
    if (selectedPlayerForSub && selectedPlayerForSub.team === team) {
      makeSubstitution(team, selectedPlayerForSub.player, benchPlayer)
      setSelectedPlayerForSub(null)
    } else {
      alert("Selecione primeiro um jogador em quadra (clique na bolinha do jogador) para realizar a substituição.")
    }
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm/50 backdrop-blur-xl bg-white/80">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {championshipName && (
                <div className="flex items-center gap-1 text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full w-fit mt-0.5 border border-yellow-100">
                  <Trophy className="size-3" />
                  {championshipName}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {gameStarted && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReport(true)}
                    className="hidden md:flex border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm hover:shadow transition-all"
                  >
                    <FileDown className="mr-2 size-4" />
                    Súmula
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={endGame}
                    className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 hover:shadow-red-600/30 transition-all hover:-translate-y-0.5"
                  >
                    <Flag className="mr-2 size-4" />
                    Encerrar Jogo
                  </Button>
                </>
              )}
              {!gameStarted && !setupMode && (
                <Button
                  variant="outline"
                  onClick={restartGame}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm bg-transparent"
                >
                  <RotateCw className="mr-2 size-4" />
                  Reiniciar
                </Button>
              )}
              {setupMode && !showIntro && (
                <Button
                  variant="outline"
                  onClick={() => setShowIntro(true)}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm bg-transparent"
                >
                  <RotateCw className="mr-2 size-4" />
                  Voltar
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {showHistory ? (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-900">Histórico de Jogos</h2>
                <p className="text-slate-500 mt-1">Partidas encerradas e salvas</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setShowHistory(false)
                  setViewingMatch(null)
                }}
              >
                Voltar
              </Button>
            </div>

            {viewingMatch ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    {viewingMatch.championshipName && (
                      <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                        {viewingMatch.championshipName}
                      </p>
                    )}
                    <h3 className="text-xl font-bold text-slate-900">
                      {viewingMatch.teamA.name} x {viewingMatch.teamB.name}
                    </h3>
                    <p className="text-sm text-slate-500">{new Date(viewingMatch.date).toLocaleString("pt-BR")}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setViewingMatch(null)}>
                    Voltar à lista
                  </Button>
                </div>

                <Card className="border-0 shadow-lg bg-white">
                  <CardContent className="p-4 overflow-x-auto">
                    <GameReport
                      teamA={viewingMatch.teamA}
                      teamB={viewingMatch.teamB}
                      setHistory={viewingMatch.setHistory}
                      championshipName={viewingMatch.championshipName}
                    />
                  </CardContent>
                </Card>
              </div>
            ) : savedMatches.length === 0 ? (
              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="p-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100">
                    <Trophy className="w-8 h-8 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum jogo salvo</h3>
                  <p className="text-slate-500">Encerre uma partida e use &quot;Salvar no Histórico&quot;.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {savedMatches.map((match) => (
                  <Card key={match.id} className="border border-orange-100 shadow-sm bg-white">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        {match.championshipName && (
                          <p className="text-xs font-bold uppercase tracking-wider text-orange-600 truncate">
                            {match.championshipName}
                          </p>
                        )}
                        <h3 className="font-bold text-slate-900 truncate">
                          {match.teamA.name} x {match.teamB.name}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {new Date(match.date).toLocaleDateString("pt-BR")} • {match.scoreline} • Venceu: {match.winnerName}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                          onClick={() => setViewingMatch(match)}
                        >
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => deleteSavedMatch(match.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : showTeamsManager ? (
          <TeamsManager
            onBack={() => {
              setShowTeamsManager(false)
              refreshRegistry()
            }}
          />
        ) : showCompetitionsManager ? (
          <CompetitionsManager
            onBack={() => {
              setShowCompetitionsManager(false)
              refreshRegistry()
            }}
          />
        ) : showIntro ? (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col items-center justify-center py-8 px-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg text-center">
              <VolleyTechLogo className="h-14 w-14 text-white mb-3" />
              <h1 className="text-4xl font-bold mb-2">Summary Game</h1>
              <p className="text-sm text-orange-100">Súmula digital oficial para partidas de voleibol</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setShowIntro(false)}
                className="group w-full p-6 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-lg shadow-lg transition-all hover:-translate-y-1 active:translate-y-0 text-left flex items-center gap-4"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Settings className="w-7 h-7" />
                </span>
                <span>
                  <span className="block text-xl font-bold mb-1">Nova Súmula</span>
                  <span className="block text-sm text-orange-100">Configure as equipes, elenco e formação inicial</span>
                </span>
              </button>

              <button
                onClick={() => setShowReport(true)}
                className="group w-full p-6 bg-amber-50 hover:bg-amber-100 text-slate-900 rounded-lg shadow-lg border border-orange-200 hover:border-orange-400 transition-all hover:-translate-y-1 active:translate-y-0 text-left flex items-center gap-4"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <FileDown className="w-7 h-7" />
                </span>
                <span>
                  <span className="block text-xl font-bold mb-1">Ver Súmula</span>
                  <span className="block text-sm text-slate-500">Visualize ou exporte a súmula da partida atual</span>
                </span>
              </button>

              <button
                onClick={() => setShowHistory(true)}
                className="group w-full p-6 bg-white hover:bg-orange-50 text-slate-900 rounded-lg shadow-lg border border-orange-200 hover:border-orange-400 transition-all hover:-translate-y-1 active:translate-y-0 text-left flex items-center gap-4"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <Trophy className="w-7 h-7" />
                </span>
                <span>
                  <span className="block text-xl font-bold mb-1">Histórico de Jogos</span>
                  <span className="block text-sm text-slate-500">
                    {savedMatches.length > 0
                      ? `${savedMatches.length} ${savedMatches.length === 1 ? "jogo encerrado salvo" : "jogos encerrados salvos"}`
                      : "Jogos encerrados aparecem aqui"}
                  </span>
                </span>
              </button>

              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setShowTeamsManager(true)}
                  className="group p-6 bg-white hover:bg-orange-50 text-slate-900 rounded-lg shadow-lg border border-orange-200 hover:border-orange-400 transition-all hover:-translate-y-1 active:translate-y-0 text-left flex items-center gap-4"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <Users className="w-7 h-7" />
                  </span>
                  <span>
                    <span className="block text-lg font-bold mb-1">Equipes</span>
                    <span className="block text-sm text-slate-500">
                      {savedTeams.length > 0
                        ? `${savedTeams.length} ${savedTeams.length === 1 ? "equipe" : "equipes"}`
                        : "Cadastre seus elencos"}
                    </span>
                  </span>
                </button>

                <button
                  onClick={() => setShowCompetitionsManager(true)}
                  className="group p-6 bg-white hover:bg-orange-50 text-slate-900 rounded-lg shadow-lg border border-orange-200 hover:border-orange-400 transition-all hover:-translate-y-1 active:translate-y-0 text-left flex items-center gap-4"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <Flag className="w-7 h-7" />
                  </span>
                  <span>
                    <span className="block text-lg font-bold mb-1">Competições</span>
                    <span className="block text-sm text-slate-500">
                      {competitions.length > 0
                        ? `${competitions.length} ${competitions.length === 1 ? "competição" : "competições"}`
                        : "Organize as partidas"}
                    </span>
                  </span>
                </button>
              </div>
            </div>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-slate-700 mb-4">O que você pode registrar:</h3>
                <div className="grid md:grid-cols-2 gap-4 text-slate-600 text-sm">
                  <ul className="space-y-1">
                    <li>• Placar e sets em tempo real</li>
                    <li>• Rotações e formação em quadra</li>
                    <li>• Substituições por set</li>
                  </ul>
                  <ul className="space-y-1">
                    <li>• Tempos técnicos (timeouts)</li>
                    <li>• Líbero e capitão</li>
                    <li>• Súmula em PDF</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : setupMode ? (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-4 mb-12">
              <div className="inline-flex items-center justify-center p-3 bg-orange-50 rounded-2xl mb-4 ring-8 ring-orange-50/50">
                <Settings className="size-8 text-orange-600" />
              </div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">SÚMULA DE JOGO</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
                Configure as equipes, elenco e formação inicial para começar a partida oficial.
              </p>
            </div>

            {/* Championship Name Input */}
            <Card className="border-0 shadow-xl shadow-slate-200/60 bg-white overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-yellow-400 to-yellow-600" />
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-yellow-100 p-4 rounded-2xl text-yellow-700 group-hover:scale-110 transition-transform duration-500">
                    <Trophy className="size-8" />
                  </div>
                  <div className="flex-1 w-full space-y-3">
                    {competitions.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                          Competição
                        </label>
                        <Select
                          value={selectedCompetitionId}
                          onValueChange={(value) => {
                            setSelectedCompetitionId(value)
                            const comp = competitions.find((c) => c.id === value)
                            if (comp) {
                              setChampionshipName(
                                [comp.name, comp.category, comp.season].filter(Boolean).join(" - "),
                              )
                            }
                          }}
                        >
                          <SelectTrigger className="h-12 text-base bg-white border-yellow-200">
                            <span className={selectedCompetitionId ? "text-slate-900" : "text-slate-400"}>
                              {selectedCompetitionId
                                ? competitions.find((c) => c.id === selectedCompetitionId)?.name
                                : "Selecionar competição cadastrada"}
                            </span>
                          </SelectTrigger>
                          <SelectContent className="bg-white border-2 border-slate-200 shadow-xl z-[100]">
                            {competitions.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {[c.name, c.category, c.season].filter(Boolean).join(" - ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Nome do Campeonato / Torneio
                      </label>
                      <Input
                        value={championshipName}
                        onChange={(e) => setChampionshipName(e.target.value)}
                        placeholder="Ex: Superliga 2025, Campeonato Regional..."
                        className="h-12 text-lg border-yellow-200 focus:border-yellow-400 focus:ring-yellow-400"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
              {renderSetupPanel("A")}
              {renderSetupPanel("B")}
            </div>

            <Card className="border-0 shadow-xl shadow-slate-200/60 bg-gradient-to-br from-slate-50 to-white">
              <CardContent className="p-8 text-center">
                <h3 className="text-lg font-bold text-slate-700 mb-4">Formato da Partida</h3>
                <div className="flex justify-center gap-4 mb-6">
                  <Button
                    variant={maxSets === 3 ? "default" : "outline"}
                    onClick={() => setMaxSets(3)}
                    className={maxSets === 3 ? "bg-orange-600 hover:bg-orange-700" : ""}
                  >
                    Melhor de 3 Sets
                  </Button>
                  <Button
                    variant={maxSets === 5 ? "default" : "outline"}
                    onClick={() => setMaxSets(5)}
                    className={maxSets === 5 ? "bg-orange-600 hover:bg-orange-700" : ""}
                  >
                    Melhor de 5 Sets
                  </Button>
                </div>
                <Button
                  onClick={startGame}
                  size="lg"
                  className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white px-12 py-6 text-xl font-black shadow-2xl shadow-orange-600/30 hover:shadow-orange-600/50 hover:-translate-y-1 transition-all"
                >
                  <Play className="mr-3 size-6" />
                  INICIAR PARTIDA
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : showFinalDashboard ? (
          // TODO: Implement Final Dashboard View
          <div className="text-center py-20 space-y-4">
            <h2 className="text-4xl font-black text-slate-900">Fim de Jogo!</h2>
            <p className="text-lg text-slate-500">O jogo foi encerrado. Visualize a súmula ou reinicie.</p>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Button onClick={() => setShowReport(true)} className="bg-orange-600 hover:bg-orange-700 text-white">
                Ver Súmula
              </Button>
                <Button
                  onClick={saveMatchToHistory}
                  disabled={savingMatch}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Trophy className="w-4 h-4 mr-1" />
                  {savingMatch ? "Salvando..." : "Salvar no Histórico"}
              </Button>
              <Button variant="outline" onClick={restartGame}>
                Reiniciar Jogo
              </Button>
            </div>
          </div>
        ) : gameStarted ? (
          <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr_350px] gap-6 max-w-[1800px] mx-auto p-4 h-[calc(100vh-100px)] items-center">
            {/* Left Column: Team B Controls (Top Team) */}
            <div className="space-y-4 order-2 lg:order-1 h-full flex flex-col justify-center">
              <Card className="border-0 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] bg-white overflow-hidden relative transform hover:-translate-y-1 transition-transform duration-300">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-500 to-orange-600" />
                <CardContent className="p-6 flex flex-col items-center justify-center relative gap-4">
                  <div className="absolute top-4 left-4">
                    {teamB.serving && (
                      <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/30 animate-pulse">
                        SAQUE
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-500 mb-1 truncate max-w-full px-2">{teamB.name}</h2>
                  <div className="text-8xl font-black text-slate-900 tracking-tighter tabular-nums drop-shadow-sm">
                    {teamB.score}
                  </div>

                  {teamB.activeLibero && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 w-full">
                      <ShieldCheck className="size-4 text-red-600" />
                      <div className="flex-1">
                        <div className="text-xs font-bold text-red-900">LÍBERO</div>
                        <div className="text-sm font-bold text-red-700">
                          #{teamB.activeLibero.number} {teamB.activeLibero.name}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Score Controls */}
                  <div className="flex gap-4 w-full justify-center">
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-12 rounded-xl border-slate-200 hover:border-orange-200 hover:bg-orange-50 text-slate-600 hover:text-orange-600 transition-colors bg-transparent"
                      onClick={() => removePoint("B")}
                    >
                      <Minus className="size-6" />
                    </Button>
                    <Button
                      size="icon"
                      className="size-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all hover:-translate-y-0.5"
                      onClick={() => addPoint("B")}
                    >
                      <Plus className="size-8" />
                    </Button>
                  </div>

                  <div className="w-full h-px bg-slate-100 my-2" />

                  {/* Technical Timeouts */}
                  <div className="w-full">
                    <Button
                      variant="outline"
                      className="w-full h-12 text-sm font-bold border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm bg-transparent flex justify-between items-center px-4"
                      onClick={() => addTimeout("B")}
                      disabled={teamB.timeouts >= 2}
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="size-4 text-orange-500" />
                        Tempo Técnico
                      </span>
                      <div className="flex gap-1">
                        <div
                          className={`size-3 rounded-full ${teamB.timeouts >= 1 ? "bg-orange-500" : "bg-slate-200"}`}
                        />
                        <div
                          className={`size-3 rounded-full ${teamB.timeouts >= 2 ? "bg-orange-500" : "bg-slate-200"}`}
                        />
                      </div>
                    </Button>
                  </div>

                  {/* Penalties */}
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-400 text-yellow-600 hover:bg-yellow-50 bg-transparent h-10"
                      onClick={() => addPenalty("B", "yellow")}
                      title="Cartão Amarelo"
                    >
                      <Square className="size-4 fill-yellow-400 mr-2" /> CA
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-400 text-red-600 hover:bg-red-50 bg-transparent h-10"
                      onClick={() => addPenalty("B", "red")}
                      title="Cartão Vermelho"
                    >
                      <Square className="size-4 fill-red-500 mr-2" /> CV
                    </Button>
                  </div>

                  {/* CHANGE: Corrigido erro de sintaxe na renderização condicional dos jogadores reservas */}
                  <div className="w-full h-px bg-slate-100 my-2" />

                  <div className="w-full space-y-2">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Substituições</div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {teamB.players
                        .filter((p) => p.name && p.number && !teamB.formation.includes(p) && !p.isLibero)
                        .map((benchPlayer) => (
                          <div key={benchPlayer.number} className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className={`flex-1 justify-start text-xs h-8 border-slate-200 bg-transparent ${
                                selectedPlayerForSub?.team === "B"
                                  ? "border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100"
                                  : "hover:bg-orange-50 hover:border-orange-300"
                              }`}
                              onClick={() => handleBenchPlayerClick("B", benchPlayer)} // Updated click handler
                            >
                              <UserPlus className="size-3 mr-1" />
                              {selectedPlayerForSub?.team === "B" ? "Trocar com " : ""}#{benchPlayer.number}{" "}
                              {benchPlayer.name}
                            </Button>
                          </div>
                        ))}
                      {teamB.players.filter((p) => p.name && p.number && !teamB.formation.includes(p) && !p.isLibero)
                        .length === 0 && (
                        <div className="text-xs text-slate-400 text-center py-2">Nenhum reserva disponível</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sets Won Display */}
              <Card className="p-4 flex justify-between items-center bg-white border-slate-100 shadow-sm">
                <span className="font-bold text-slate-500 uppercase text-sm">Sets Vencidos</span>
                <span className="text-3xl font-black text-orange-600">{teamB.sets}</span>
              </Card>
            </div>

            {/* Center Column: Court & Game Info */}
            <div className="space-y-4 order-1 lg:order-2 h-full flex flex-col">
              {/* Game Info Header */}
              <Card className="border border-orange-200 shadow-lg bg-white p-4 relative overflow-hidden shrink-0">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-500 to-orange-600" />
                <div className="relative z-10 flex justify-between items-center px-4">
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">SET ATUAL</div>
                    <div className="text-4xl font-black tracking-tighter text-slate-900">{currentSet}</div>
                  </div>
                  <div className="h-10 w-px bg-slate-200" />
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">FORMATO</div>
                    <div className="text-xl font-bold text-slate-900">Melhor de {maxSets}</div>
                  </div>
                  <div className="h-10 w-px bg-slate-200" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowManualEndSetDialog(true)} // Open manual end set dialog
                    className="text-slate-600 hover:text-orange-700 hover:bg-orange-50"
                  >
                    Encerrar Set
                  </Button>
                </div>
              </Card>

              {/* 3D Court Visualization - Expanded to fill available space */}
              <div className="relative perspective-[1200px] group flex-1 min-h-0">
                <div
                  className="relative w-full h-full bg-white rounded-xl shadow-2xl border-8 border-white transform-style-3d rotate-x-12 transition-transform duration-700 ease-out group-hover:rotate-x-0"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Court Floor Texture/Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-b from-orange-50 via-orange-100/50 to-blue-50 rounded-lg overflow-hidden">
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: "radial-gradient(#64748b 1px, transparent 1px)",
                        backgroundSize: "20px 20px",
                      }}
                    ></div>
                  </div>

                  {/* Court Lines */}
                  <div className="absolute inset-4 border-4 border-slate-800/80 shadow-sm">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800/80 shadow-sm" />
                    <div className="absolute top-[calc(50%-16.6%)] left-0 right-0 h-0.5 bg-slate-400/60 border-t border-dashed border-slate-800/60" />
                    <div className="absolute bottom-[calc(50%-16.6%)] left-0 right-0 h-0.5 bg-slate-400/60 border-t border-dashed border-slate-800/60" />
                  </div>

                  {/* Net (Visual Only) */}
                  <div className="absolute top-1/2 left-0 right-0 h-4 -mt-2 bg-slate-900/10 backdrop-blur-sm z-0 transform translate-z-10" />

                  {/* Team B (Top) Players */}
                  <div className="absolute inset-0 top-0 h-1/2">
                    {POSITION_COORDS.map((pos) => {
                      const y = 100 - Number.parseInt(pos.y) + "%"
                      const x = 100 - Number.parseInt(pos.x) + "%"
                      const player = teamB.formation[pos.id - 1]
                      const isSelected = selectedPlayerForSub?.team === "B" && selectedPlayerForSub?.player === player

                      return (
                        <div
                          key={`B-${pos.id}`}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-in-out cursor-pointer"
                          style={{ left: x, top: y }}
                          onClick={() => player && handlePlayerClick("B", player)}
                        >
                          {player ? (
                            <div className="relative flex flex-col items-center">
                              <div
                                className={`
                                size-14 lg:size-16 xl:size-20 rounded-full flex items-center justify-center
                                bg-gradient-to-br from-orange-400 to-orange-600
                                text-white font-black text-xl lg:text-2xl xl:text-3xl shadow-[0_10px_20px_-5px_rgba(234,88,12,0.5)]
                                border-4 ${isSelected ? "border-yellow-400 ring-4 ring-yellow-400/50 scale-110" : "border-white ring-2 ring-slate-200"}
                                transform transition-transform duration-300 hover:scale-110
                                ${player.isLibero ? "from-red-500 to-red-600" : ""}
                              `}
                              >
                                {player.number}
                                {player.isCaptain && (
                                  <div className="absolute -top-1 bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-bold shadow-sm border border-white">
                                    C
                                  </div>
                                )}
                              </div>
                              <div className="mt-1 bg-slate-800/90 text-white text-xs lg:text-sm font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap max-w-[80px] lg:max-w-[100px] truncate text-center">
                                {player.name.split(" ")[0]}
                              </div>
                              <div className="absolute -right-5 top-1/3 text-[10px] font-bold text-slate-500 bg-white/80 px-1 rounded">
                                P{pos.id}
                              </div>
                            </div>
                          ) : (
                            <div className="size-14 lg:size-16 xl:size-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50/50">
                              <span className="text-sm font-bold text-slate-400">P{pos.id}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Team A (Bottom) Players */}
                  <div className="absolute inset-0 z-10" style={{ top: "50%" }}>
                    {POSITION_COORDS.map((pos) => {
                      const player = teamA.formation[pos.id - 1]
                      const isSelected = selectedPlayerForSub?.team === "A" && selectedPlayerForSub?.player === player

                      return (
                        <div
                          key={`A-${pos.id}`}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-in-out cursor-pointer z-20"
                          style={{ left: pos.x, top: pos.y }}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (player) handlePlayerClick("A", player)
                          }}
                        >
                          {player ? (
                            <div className="relative flex flex-col items-center">
                              <div
                                className={`
                                size-14 lg:size-16 xl:size-20 rounded-full flex items-center justify-center
                                bg-gradient-to-br from-blue-500 to-blue-700
                                text-white font-black text-xl lg:text-2xl xl:text-3xl shadow-[0_10px_20px_-5px_rgba(37,99,235,0.5)]
                                border-4 ${isSelected ? "border-yellow-400 ring-4 ring-yellow-400/50 scale-110" : "border-white ring-2 ring-slate-200"}
                                transform transition-transform duration-300 hover:scale-110
                                ${player.isLibero ? "from-red-500 to-red-600" : ""}
                              `}
                              >
                                {player.number}
                                {player.isCaptain && (
                                  <div className="absolute -top-1 bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-bold shadow-sm border border-white">
                                    C
                                  </div>
                                )}
                              </div>
                              <div className="mt-1 bg-slate-800/90 text-white text-xs lg:text-sm font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap max-w-[80px] lg:max-w-[100px] truncate text-center">
                                {player.name.split(" ")[0]}
                              </div>
                              <div className="absolute -right-5 top-1/3 text-[10px] font-bold text-slate-500 bg-white/80 px-1 rounded">
                                P{pos.id}
                              </div>
                            </div>
                          ) : (
                            <div className="size-14 lg:size-16 xl:size-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50/50">
                              <span className="text-sm font-bold text-slate-400">P{pos.id}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Floating Action Buttons on Court */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-30">
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full shadow-lg bg-white/90 backdrop-blur hover:bg-white"
                  onClick={() => rotateTeam("B")}
                  title="Rodar Equipe B"
                >
                  <RotateCw className="size-4 text-orange-600" />
                </Button>
                <div className="h-4" /> {/* Spacer for net */}
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full shadow-lg bg-white/90 backdrop-blur hover:bg-white"
                  onClick={() => rotateTeam("A")}
                  title="Rodar Equipe A"
                >
                  <RotateCw className="size-4 text-blue-600" />
                </Button>
              </div>
            </div>

            {/* Right Column: Team A Controls (Bottom Team) */}
            <div className="space-y-4 order-3 lg:order-3 h-full flex flex-col justify-center">
              <Card className="border-0 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] bg-white overflow-hidden relative transform hover:-translate-y-1 transition-transform duration-300">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-blue-600" />
                <CardContent className="p-6 flex flex-col items-center justify-center relative gap-4">
                  <div className="absolute top-4 left-4">
                    {teamA.serving && (
                      <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg shadow-blue-500/30 animate-pulse">
                        SAQUE
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-500 mb-1 truncate max-w-full px-2">{teamA.name}</h2>
                  <div className="text-8xl font-black text-slate-900 tracking-tighter tabular-nums drop-shadow-sm">
                    {teamA.score}
                  </div>

                  {teamA.activeLibero && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 w-full">
                      <ShieldCheck className="size-4 text-red-600" />
                      <div className="flex-1">
                        <div className="text-xs font-bold text-red-900">LÍBERO</div>
                        <div className="text-sm font-bold text-red-700">
                          #{teamA.activeLibero.number} {teamA.activeLibero.name}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Score Controls */}
                  <div className="flex gap-4 w-full justify-center">
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-12 rounded-xl border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors bg-transparent"
                      onClick={() => removePoint("A")}
                    >
                      <Minus className="size-6" />
                    </Button>
                    <Button
                      size="icon"
                      className="size-12 rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all hover:-translate-y-0.5"
                      onClick={() => addPoint("A")}
                    >
                      <Plus className="size-8" />
                    </Button>
                  </div>

                  <div className="w-full h-px bg-slate-100 my-2" />

                  {/* Technical Timeouts */}
                  <div className="w-full">
                    <Button
                      variant="outline"
                      className="w-full h-12 text-sm font-bold border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm bg-transparent flex justify-between items-center px-4"
                      onClick={() => addTimeout("A")}
                      disabled={teamA.timeouts >= 2}
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="size-4 text-blue-500" />
                        Tempo Técnico
                      </span>
                      <div className="flex gap-1">
                        <div
                          className={`size-3 rounded-full ${teamA.timeouts >= 1 ? "bg-blue-500" : "bg-slate-200"}`}
                        />
                        <div
                          className={`size-3 rounded-full ${teamA.timeouts >= 2 ? "bg-blue-500" : "bg-slate-200"}`}
                        />
                      </div>
                    </Button>
                  </div>

                  {/* Penalties */}
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-400 text-yellow-600 hover:bg-yellow-50 bg-transparent h-10"
                      onClick={() => addPenalty("A", "yellow")}
                      title="Cartão Amarelo"
                    >
                      <Square className="size-4 fill-yellow-400 mr-2" /> CA
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-400 text-red-600 hover:bg-red-50 bg-transparent h-10"
                      onClick={() => addPenalty("A", "red")}
                      title="Cartão Vermelho"
                    >
                      <Square className="size-4 fill-red-500 mr-2" /> CV
                    </Button>
                  </div>

                  {/* Substitutions */}
                  <div className="w-full h-px bg-slate-100 my-2" />

                  <div className="w-full space-y-2">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Substituições</div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {teamA.players
                        .filter((p) => p.name && p.number && !teamA.formation.includes(p) && !p.isLibero)
                        .map((benchPlayer) => (
                          <div key={benchPlayer.number} className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className={`flex-1 justify-start text-xs h-8 border-slate-200 bg-transparent ${
                                selectedPlayerForSub?.team === "A"
                                  ? "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                  : "hover:bg-blue-50 hover:border-blue-300"
                              }`}
                              onClick={() => handleBenchPlayerClick("A", benchPlayer)} // Updated click handler
                            >
                              <UserPlus className="size-3 mr-1" />
                              {selectedPlayerForSub?.team === "A" ? "Trocar com " : ""}#{benchPlayer.number}{" "}
                              {benchPlayer.name}
                            </Button>
                          </div>
                        ))}
                      {teamA.players.filter((p) => p.name && p.number && !teamA.formation.includes(p) && !p.isLibero)
                        .length === 0 && (
                        <div className="text-xs text-slate-400 text-center py-2">Nenhum reserva disponível</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sets Won Display */}
              <Card className="p-4 flex justify-between items-center bg-white border-slate-100 shadow-sm">
                <span className="font-bold text-slate-500 uppercase text-sm">Sets Vencidos</span>
                <span className="text-3xl font-black text-blue-600">{teamA.sets}</span>
              </Card>
            </div>
          </div>
        ) : null}

        {/* Game Report Modal */}
        {showReport && (
          <Dialog open={showReport} onOpenChange={setShowReport}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto p-0">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="text-2xl font-bold">Súmula do Jogo</DialogTitle>
                <DialogDescription>Visualize e exporte a súmula completa da partida</DialogDescription>
              </DialogHeader>
              <div className="p-6">
                <GameReport teamA={teamA} teamB={teamB} setHistory={setHistory} championshipName={championshipName} />
              </div>
              <div className="flex justify-end gap-3 p-6 pt-0 border-t">
                <Button variant="outline" onClick={() => setShowReport(false)}>
                  Fechar
                </Button>
                {/* <Button onClick={exportPDF} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <FileDown className="mr-2 size-4" />
                  Exportar PDF
                </Button> */}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showSetFormationModal && (
          // CHANGE: Modal completo para configurar formação do próximo set
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
              <div className="p-8 border-b border-slate-200">
                <h2 className="text-3xl font-black text-slate-900">Formação para o Set {pendingSetNumber}</h2>
                <p className="text-slate-600 mt-2">Configure a formação inicial para ambas as equipes no próximo set</p>
              </div>

              <div className="p-8 grid lg:grid-cols-2 gap-8">
                {/* Team A Formation */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-blue-600 flex items-center gap-2">
                    <Users className="size-5" />
                    {teamA.name}
                  </h3>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Formação Inicial (6 jogadores)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {teamA.formation.map((player, idx) => (
                        <div key={idx} className="relative">
                          <select
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm font-medium bg-white"
                            value={player?.number || ""}
                            onChange={(e) => {
                              const playerNumber = Number.parseInt(e.target.value)
                              if (playerNumber) {
                                const newPlayer = teamA.players.find((p) => p.number === playerNumber)
                                if (newPlayer) {
                                  const newFormation = [...teamA.formation]
                                  newFormation[idx] = newPlayer
                                  setTeamA({ ...teamA, formation: newFormation })
                                }
                              } else {
                                const newFormation = [...teamA.formation]
                                newFormation[idx] = null
                                setTeamA({ ...teamA, formation: newFormation })
                              }
                            }}
                          >
                            <option value="">P{idx + 1} - Selecione</option>
                            {teamA.players
                              .filter((p) => p.name && p.number && !p.isLibero)
                              .map((p) => (
                                <option key={p.number} value={p.number} disabled={teamA.formation.includes(p)}>
                                  #{p.number} - {p.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Líbero (Opcional)</label>
                    <select
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm font-medium bg-white"
                      value={teamA.activeLibero?.number || ""}
                      onChange={(e) => {
                        const playerNumber = Number.parseInt(e.target.value)
                        if (playerNumber) {
                          const libero = teamA.players.find((p) => p.number === playerNumber)
                          setTeamA({ ...teamA, activeLibero: libero || null })
                        } else {
                          setTeamA({ ...teamA, activeLibero: null })
                        }
                      }}
                    >
                      <option value="">Nenhum</option>
                      {teamA.players
                        .filter((p) => p.name && p.number && p.isLibero)
                        .map((p) => (
                          <option key={p.number} value={p.number}>
                            #{p.number} - {p.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Team B Formation */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-orange-600 flex items-center gap-2">
                    <Users className="size-5" />
                    {teamB.name}
                  </h3>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Formação Inicial (6 jogadores)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {teamB.formation.map((player, idx) => (
                        <div key={idx} className="relative">
                          <select
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm font-medium bg-white"
                            value={player?.number || ""}
                            onChange={(e) => {
                              const playerNumber = Number.parseInt(e.target.value)
                              if (playerNumber) {
                                const newPlayer = teamB.players.find((p) => p.number === playerNumber)
                                if (newPlayer) {
                                  const newFormation = [...teamB.formation]
                                  newFormation[idx] = newPlayer
                                  setTeamB({ ...teamB, formation: newFormation })
                                }
                              } else {
                                const newFormation = [...teamB.formation]
                                newFormation[idx] = null
                                setTeamB({ ...teamB, formation: newFormation })
                              }
                            }}
                          >
                            <option value="">P{idx + 1} - Selecione</option>
                            {teamB.players
                              .filter((p) => p.name && p.number && !p.isLibero)
                              .map((p) => (
                                <option key={p.number} value={p.number} disabled={teamB.formation.includes(p)}>
                                  #{p.number} - {p.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Líbero (Opcional)</label>
                    <select
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm font-medium bg-white"
                      value={teamB.activeLibero?.number || ""}
                      onChange={(e) => {
                        const playerNumber = Number.parseInt(e.target.value)
                        if (playerNumber) {
                          const libero = teamB.players.find((p) => p.number === playerNumber)
                          setTeamB({ ...teamB, activeLibero: libero || null })
                        } else {
                          setTeamB({ ...teamB, activeLibero: null })
                        }
                      }}
                    >
                      <option value="">Nenhum</option>
                      {teamB.players
                        .filter((p) => p.name && p.number && p.isLibero)
                        .map((p) => (
                          <option key={p.number} value={p.number}>
                            #{p.number} - {p.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-200 flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSetFormationModal(false)
                    setPendingSetNumber(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmNewSetFormation}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Confirmar e Iniciar Set {pendingSetNumber}
                </Button>
              </div>
            </div>
          </div>
        )}

        <Dialog open={showManualEndSetDialog} onOpenChange={setShowManualEndSetDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Encerrar Set Manualmente</DialogTitle>
              <DialogDescription>
                Deseja encerrar o set atual independente da pontuação? Selecione a equipe vencedora deste set.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <Button
                onClick={() => handleManualEndSet("B")}
                className="h-24 flex flex-col gap-2 bg-orange-500 hover:bg-orange-600 text-white"
              >
                <span className="text-2xl font-black">{teamB.score}</span>
                <span>Vencedor: {teamB.name}</span>
              </Button>
              <Button
                onClick={() => handleManualEndSet("A")}
                className="h-24 flex flex-col gap-2 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <span className="text-2xl font-black">{teamA.score}</span>
                <span>Vencedor: {teamA.name}</span>
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowManualEndSetDialog(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  )
}
