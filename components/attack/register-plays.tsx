"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/attack/ui/button"
import { Check, X, History, Download, User, Users, ArrowLeft } from "lucide-react"
import {
  type Team,
  type SetPosition,
  type AttackType,
  type ResultType,
  type NoSetReason,
  type Play,
  type Session,
  type Setters,
  type TeamNames,
  setPositions,
  attackTypes,
  specialAttackTypes,
  attackTypeLabels,
  attackLineColors,
  getStats,
  getStatsBySetter,
  getSetterName,
  getAttackLinesWithOrigin,
  getAttackLegend,
  getAttackByPosition,
} from "@/lib/attack/volley-stats"
import { exportToPDF } from "@/lib/attack/export-pdf"
import { LastPlaysPanel } from "@/components/attack/last-plays-panel"
import { SetterComparisonChart } from "@/components/attack/distribution-charts"

const today = () => new Date().toLocaleDateString("pt-BR")

export default function RegisterPlays() {
  const [settersA, setSettersA] = useState<Setters>({ setter1: "", setter2: "", active: 1 })
  const [settersB, setSettersB] = useState<Setters>({ setter1: "", setter2: "", active: 1 })
  const [showSetterConfig, setShowSetterConfig] = useState(false)
  const [teamNames, setTeamNames] = useState<TeamNames>({ A: "Equipe A", B: "Equipe B" })
  const [showTeamNameConfig, setShowTeamNameConfig] = useState(false)

  const [currentPhase, setCurrentPhase] = useState(0)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<SetPosition | null>(null)
  const [selectedAttackType, setSelectedAttackType] = useState<AttackType | null>(null)

  const [currentSessionPlays, setCurrentSessionPlays] = useState<Play[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [viewMode, setViewMode] = useState<"collector" | "history">("collector")
  const [selectedSessionForStats, setSelectedSessionForStats] = useState<Session | null>(null)
  const [mainTab, setMainTab] = useState<"collector" | "teamA" | "teamB">("collector")
  const [loaded, setLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("volleystats_current")
    if (saved) setCurrentSessionPlays(JSON.parse(saved))
    const savedSessions = localStorage.getItem("volleystats_sessions")
    if (savedSessions) setSessions(JSON.parse(savedSessions))
    const savedTeamNames = localStorage.getItem("volleystats_teamnames")
    if (savedTeamNames) setTeamNames(JSON.parse(savedTeamNames))
    setLoaded(true)
  }, [])

  // Persist current plays + team names
  useEffect(() => {
    if (!loaded) return
    localStorage.setItem("volleystats_current", JSON.stringify(currentSessionPlays))
    localStorage.setItem("volleystats_teamnames", JSON.stringify(teamNames))
  }, [currentSessionPlays, teamNames, loaded])

  const getActiveSetter = (team: Team) => (team === "A" ? settersA.active : settersB.active)

  function switchSetter(team: Team) {
    if (team === "A") setSettersA((s) => ({ ...s, active: s.active === 1 ? 2 : 1 }))
    else setSettersB((s) => ({ ...s, active: s.active === 1 ? 2 : 1 }))
  }

  function resetCollector() {
    setCurrentPhase(0)
    setSelectedTeam(null)
    setSelectedPosition(null)
    setSelectedAttackType(null)
  }

  function selectTeam(team: Team) {
    setSelectedTeam(team)
    setCurrentPhase(1)
  }

  function selectStatus(hasSet: boolean) {
    if (hasSet) {
      setCurrentPhase(2)
    } else {
      // Sem levantamento: pedir o motivo (erro de levantamento ou erro de saque adversário)
      setCurrentPhase(5)
    }
  }

  function selectNoSetReason(reason: NoSetReason) {
    if (!selectedTeam) return
    const play: Play = {
      id: Date.now(),
      team: selectedTeam,
      status: "sem_sequencia",
      noSetReason: reason,
      timestamp: new Date(),
      setter: getActiveSetter(selectedTeam),
    }
    setCurrentSessionPlays((prev) => [play, ...prev])
    resetCollector()
  }

  function selectPosition(position: SetPosition) {
    setSelectedPosition(position)
    // "Segunda" (bola de segunda do levantador) vai direto para o resultado:
    // Ponto, Bloqueio, Certo ou Erro — sem escolher direção do ataque.
    if (position === "segunda") {
      setCurrentPhase(6)
    } else {
      setCurrentPhase(3)
    }
  }

  function selectSegundaResult(kind: "ponto" | "bloqueio" | "certo" | "erro") {
    if (!selectedTeam || !selectedPosition) return
    const base = {
      id: Date.now(),
      team: selectedTeam,
      status: "levantamento" as const,
      position: selectedPosition,
      timestamp: new Date(),
      setter: getActiveSetter(selectedTeam),
    }
    // "Bloqueio" credita o ponto ao adversário (igual ao attackType "bloqueado").
    // Os demais são registrados como resultado da jogada.
    const play: Play =
      kind === "bloqueio"
        ? { ...base, attackType: "bloqueado" }
        : { ...base, result: kind as ResultType }
    setCurrentSessionPlays((prev) => [play, ...prev])
    resetCollector()
  }

  function selectAttackType(attackType: AttackType) {
    setSelectedAttackType(attackType)
    if (attackType === "bloqueado") {
      if (!selectedTeam || !selectedPosition) return
      const newPlay: Play = {
        id: Date.now(),
        team: selectedTeam,
        status: "levantamento",
        position: selectedPosition,
        attackType,
        timestamp: new Date(),
        setter: getActiveSetter(selectedTeam),
      }
      setCurrentSessionPlays((prev) => [newPlay, ...prev])
      resetCollector()
    } else {
      setCurrentPhase(4)
    }
  }

  function selectResult(result: ResultType) {
    if (!selectedTeam || !selectedPosition || !selectedAttackType) return
    const play: Play = {
      id: Date.now(),
      team: selectedTeam,
      status: "levantamento",
      position: selectedPosition,
      attackType: selectedAttackType,
      result,
      timestamp: new Date(),
      setter: getActiveSetter(selectedTeam),
    }
    setCurrentSessionPlays((prev) => [play, ...prev])
    resetCollector()
  }

  function finalizeSession() {
    if (currentSessionPlays.length === 0) {
      alert("Nenhuma jogada registrada!")
      return
    }
    const sessionName = prompt("Nome da sessão:", `${teamNames.A} x ${teamNames.B} - ${today()}`)
    if (!sessionName) return

    const newSession: Session = {
      id: Date.now(),
      name: sessionName,
      plays: [...currentSessionPlays],
      date: new Date(),
      teamNames: { ...teamNames },
      settersA: { ...settersA },
      settersB: { ...settersB },
    }
    const updated = [newSession, ...sessions]
    setSessions(updated)
    localStorage.setItem("volleystats_sessions", JSON.stringify(updated))

    setCurrentSessionPlays([])
    setSettersA({ setter1: "", setter2: "", active: 1 })
    setSettersB({ setter1: "", setter2: "", active: 1 })
    setTeamNames({ A: "Equipe A", B: "Equipe B" })
    resetCollector()
    localStorage.removeItem("volleystats_current")
    alert("Sessão salva! Nova leitura iniciada.")
  }

  function deleteSession(id: number) {
    if (!confirm("Excluir esta sessão?")) return
    const updated = sessions.filter((s) => s.id !== id)
    setSessions(updated)
    localStorage.setItem("volleystats_sessions", JSON.stringify(updated))
  }

  function undoLastPlay() {
    if (currentSessionPlays.length === 0) return
    setCurrentSessionPlays((prev) => prev.slice(1))
  }

  const phaseLabel =
    currentPhase === 0
      ? "Selecione a equipe"
      : currentPhase === 1
        ? "Houve levantamento?"
        : currentPhase === 5
          ? "Motivo (sem levantamento)"
          : currentPhase === 2
            ? "Posição do levantamento"
            : currentPhase === 3
              ? "Tipo de ataque"
              : currentPhase === 6
                ? "Resultado da segunda"
                : "Resultado"

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-bold text-slate-800">Análise de Voleibol</h1>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowTeamNameConfig((v) => !v)}>
                <Users className="w-4 h-4 mr-1" />
                Equipes
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowSetterConfig((v) => !v)}>
                <User className="w-4 h-4 mr-1" />
                Levantadores
              </Button>
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={finalizeSession}>
                <Check className="w-4 h-4 mr-1" />
                Finalizar Leitura
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setViewMode("history")
                  setMainTab("collector")
                }}
              >
                <History className="w-4 h-4 mr-1" />
                Histórico ({sessions.length})
              </Button>
              {currentSessionPlays.length > 0 && (
                <Button variant="destructive" size="sm" onClick={undoLastPlay}>
                  Desfazer
                </Button>
              )}
            </div>
          </div>

          {showTeamNameConfig && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-700 mb-3">Nomes das Equipes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded">A</span>
                  <input
                    type="text"
                    placeholder="Nome da Equipe A"
                    value={teamNames.A}
                    onChange={(e) => setTeamNames((t) => ({ ...t, A: e.target.value }))}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-sm font-medium rounded">B</span>
                  <input
                    type="text"
                    placeholder="Nome da Equipe B"
                    value={teamNames.B}
                    onChange={(e) => setTeamNames((t) => ({ ...t, B: e.target.value }))}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          )}

          {showSetterConfig && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-700 mb-3">Configurar Levantadores</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">{teamNames.A}</h4>
                  <div className="space-y-2">
                    {[1, 2].map((num) => (
                      <div key={num} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Levantador ${num} (nome/número)`}
                          value={num === 1 ? settersA.setter1 : settersA.setter2}
                          onChange={(e) =>
                            setSettersA((s) => ({
                              ...s,
                              [num === 1 ? "setter1" : "setter2"]: e.target.value,
                            }))
                          }
                          className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md"
                        />
                        <button
                          className={`px-3 py-1 text-sm rounded-md ${settersA.active === num ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}
                          onClick={() => setSettersA((s) => ({ ...s, active: num }))}
                        >
                          Em quadra
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-800 mb-2">{teamNames.B}</h4>
                  <div className="space-y-2">
                    {[1, 2].map((num) => (
                      <div key={num} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Levantador ${num} (nome/número)`}
                          value={num === 1 ? settersB.setter1 : settersB.setter2}
                          onChange={(e) =>
                            setSettersB((s) => ({
                              ...s,
                              [num === 1 ? "setter1" : "setter2"]: e.target.value,
                            }))
                          }
                          className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md"
                        />
                        <button
                          className={`px-3 py-1 text-sm rounded-md ${settersB.active === num ? "bg-red-500 text-white" : "bg-slate-200 text-slate-600"}`}
                          onClick={() => setSettersB((s) => ({ ...s, active: num }))}
                        >
                          Em quadra
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Clique em "Em quadra" para indicar qual levantador está jogando. As jogadas serão registradas para o
                levantador ativo.
              </p>
            </div>
          )}
        </div>

        {/* Tabs - ocultas no histórico para não sobrepor o coletor */}
        {viewMode === "collector" && !selectedSessionForStats && (
          <div className="flex border-b border-slate-200 mb-4 bg-white rounded-t-lg">
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${mainTab === "collector" ? "border-orange-600 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              onClick={() => {
                setMainTab("collector")
                setViewMode("collector")
                setSelectedSessionForStats(null)
              }}
            >
              Coletor
            </button>
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${mainTab === "teamA" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              onClick={() => {
                setMainTab("teamA")
                setViewMode("collector")
                setSelectedSessionForStats(null)
              }}
            >
              {teamNames.A}
            </button>
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${mainTab === "teamB" ? "border-red-500 text-red-500" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              onClick={() => {
                setMainTab("teamB")
                setViewMode("collector")
                setSelectedSessionForStats(null)
              }}
            >
              {teamNames.B}
            </button>
          </div>
        )}

        {viewMode === "history" && !selectedSessionForStats ? (
          <HistoryView
            sessions={sessions}
            onView={(s) => {
              setSelectedSessionForStats(s)
              setMainTab("collector")
            }}
            onExport={(s) => exportToPDF(currentSessionPlays, teamNames, settersA, settersB, s)}
            onDelete={deleteSession}
            onBack={() => {
              setViewMode("collector")
              setMainTab("collector")
            }}
          />
        ) : selectedSessionForStats ? (
          <SessionStatsView
            session={selectedSessionForStats}
            onExport={(s) => exportToPDF(currentSessionPlays, teamNames, settersA, settersB, s)}
            onBack={() => {
              setSelectedSessionForStats(null)
              setViewMode("history")
            }}
          />
        ) : mainTab === "collector" ? (
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            {selectedTeam && (
              <div
                className={`mb-4 p-2 rounded-lg text-center text-sm ${selectedTeam === "A" ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}
              >
                <span className="font-medium">Levantador em quadra:</span>{" "}
                {getSetterName(selectedTeam, getActiveSetter(selectedTeam), settersA, settersB)}
                <button
                  className="ml-2 px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
                  onClick={() => switchSetter(selectedTeam)}
                >
                  Substituir
                </button>
              </div>
            )}

            <div className="flex justify-center gap-2 mb-6">
              {[0, 1, 2, 3, 4].map((phase) => (
                <div
                  key={phase}
                  className={`w-3 h-3 rounded-full transition-colors ${currentPhase >= phase ? "bg-orange-600" : "bg-orange-200"}`}
                />
              ))}
            </div>

            <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/60 p-6">
            <p className="text-center text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">{phaseLabel}</p>

            {currentPhase === 0 && (
              <div className="flex justify-center gap-4">
                <button
                  className="w-24 h-24 rounded-2xl border-2 border-blue-700 bg-blue-600 hover:bg-blue-700 text-white font-bold text-2xl shadow-sm transition-transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center"
                  onClick={() => selectTeam("A")}
                >
                  A
                  <span className="text-[10px] font-medium opacity-80 mt-0.5 max-w-[5rem] truncate">
                    {teamNames.A}
                  </span>
                </button>
                <button
                  className="w-24 h-24 rounded-2xl border-2 border-red-600 bg-red-500 hover:bg-red-600 text-white font-bold text-2xl shadow-sm transition-transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center"
                  onClick={() => selectTeam("B")}
                >
                  B
                  <span className="text-[10px] font-medium opacity-80 mt-0.5 max-w-[5rem] truncate">
                    {teamNames.B}
                  </span>
                </button>
              </div>
            )}

            {currentPhase === 1 && (
              <div className="flex justify-center gap-4">
                <button
                  className="w-24 h-24 rounded-2xl border-2 border-green-700 bg-green-600 hover:bg-green-700 text-white shadow-sm transition-transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-1"
                  onClick={() => selectStatus(true)}
                >
                  <Check className="w-7 h-7" />
                  <span className="text-xs font-medium">Sim</span>
                </button>
                <button
                  className="w-24 h-24 rounded-2xl border-2 border-red-600 bg-red-500 hover:bg-red-600 text-white shadow-sm transition-transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-1"
                  onClick={() => selectStatus(false)}
                >
                  <X className="w-7 h-7" />
                  <span className="text-xs font-medium">Não</span>
                </button>
              </div>
            )}

            {currentPhase === 5 && selectedTeam && (
              <div className="flex flex-col sm:flex-row justify-center gap-3 max-w-lg mx-auto">
                <button
                  className="flex-1 min-h-24 rounded-2xl border-2 border-red-600 bg-red-500 hover:bg-red-600 text-white font-semibold shadow-sm transition-transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-1 px-3 py-4"
                  onClick={() => selectNoSetReason("erro_levantamento")}
                >
                  <span className="text-sm">Erro de levantamento</span>
                  <span className="text-[11px] font-medium opacity-80">
                    Ponto para {selectedTeam === "A" ? teamNames.B : teamNames.A}
                  </span>
                </button>
                <button
                  className="flex-1 min-h-24 rounded-2xl border-2 border-green-700 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm transition-transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-1 px-3 py-4"
                  onClick={() => selectNoSetReason("erro_saque_adversario")}
                >
                  <span className="text-sm">Erro de saque adversário</span>
                  <span className="text-[11px] font-medium opacity-80">
                    Ponto para {selectedTeam === "A" ? teamNames.A : teamNames.B}
                  </span>
                </button>
              </div>
            )}

            {currentPhase === 2 && (
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                {setPositions.map((pos) => (
                  <button
                    key={pos.value}
                    className="aspect-square flex flex-col items-center justify-center rounded-2xl bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 hover:border-orange-400 text-center transition-all hover:scale-105 active:scale-95"
                    onClick={() => selectPosition(pos.value)}
                  >
                    <span className="block font-semibold text-slate-800">{pos.label}</span>
                    <span className="text-xs text-slate-500">{pos.description}</span>
                  </button>
                ))}
              </div>
            )}

            {currentPhase === 3 && (
              <div className="max-w-md mx-auto">
                <div className="grid grid-cols-3 gap-3">
                  {(selectedPosition === "meio" || selectedPosition === "pipe" ? specialAttackTypes : attackTypes).map(
                    (att) => (
                      <button
                        key={att.value}
                        className="aspect-square flex items-center justify-center rounded-2xl bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 hover:border-orange-400 text-sm font-medium text-slate-800 text-center transition-all hover:scale-105 active:scale-95 px-2"
                        onClick={() => selectAttackType(att.value)}
                      >
                        {att.label}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {currentPhase === 4 && (
              <div className="flex justify-center gap-3">
                <button
                  className="w-24 h-24 rounded-2xl border-2 border-green-700 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm transition-transform hover:scale-105 active:scale-95"
                  onClick={() => selectResult("ponto")}
                >
                  Ponto
                </button>
                <button
                  className="w-24 h-24 rounded-2xl border-2 border-blue-700 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-transform hover:scale-105 active:scale-95"
                  onClick={() => selectResult("certo")}
                >
                  Certo
                </button>
                <button
                  className="w-24 h-24 rounded-2xl border-2 border-red-600 bg-red-500 hover:bg-red-600 text-white font-semibold shadow-sm transition-transform hover:scale-105 active:scale-95"
                  onClick={() => selectResult("erro")}
                >
                  Erro
                </button>
              </div>
            )}

            {currentPhase === 6 && (
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                <button
                  className="h-24 rounded-2xl border-2 border-green-700 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm transition-transform hover:scale-105 active:scale-95"
                  onClick={() => selectSegundaResult("ponto")}
                >
                  Ponto
                </button>
                <button
                  className="h-24 rounded-2xl border-2 border-slate-600 bg-slate-500 hover:bg-slate-600 text-white font-semibold shadow-sm transition-transform hover:scale-105 active:scale-95"
                  onClick={() => selectSegundaResult("bloqueio")}
                >
                  Bloqueio
                </button>
                <button
                  className="h-24 rounded-2xl border-2 border-blue-700 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-transform hover:scale-105 active:scale-95"
                  onClick={() => selectSegundaResult("certo")}
                >
                  Certo
                </button>
                <button
                  className="h-24 rounded-2xl border-2 border-red-600 bg-red-500 hover:bg-red-600 text-white font-semibold shadow-sm transition-transform hover:scale-105 active:scale-95"
                  onClick={() => selectSegundaResult("erro")}
                >
                  Erro
                </button>
              </div>
            )}
            </div>

            {currentSessionPlays.length > 0 && (
              <LastPlaysPanel plays={currentSessionPlays} teamNames={teamNames} />
            )}
          </div>
        ) : (
          <TeamStatsView
            team={mainTab === "teamA" ? "A" : "B"}
            currentSessionPlays={currentSessionPlays}
            teamNames={teamNames}
            settersA={settersA}
            settersB={settersB}
          />
        )}
      </div>
    </div>
  )
}

function HistoryView({
  sessions,
  onView,
  onExport,
  onDelete,
  onBack,
}: {
  sessions: Session[]
  onView: (s: Session) => void
  onExport: (s: Session) => void
  onDelete: (id: number) => void
  onBack: () => void
}) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Histórico de Leituras</h2>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar ao Coletor
          </Button>
        </div>
        {sessions.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Nenhuma sessão salva</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded border hover:border-blue-300"
              >
                <div>
                  <h3 className="font-semibold text-slate-800">{session.name}</h3>
                  <p className="text-sm text-slate-500">
                    {new Date(session.date).toLocaleString("pt-BR")} • {session.plays.length} jogadas
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm rounded bg-blue-600 text-white" onClick={() => onView(session)}>
                    Ver
                  </button>
                  <button
                    className="px-3 py-1 text-sm rounded bg-slate-600 text-white"
                    onClick={() => onExport(session)}
                  >
                    PDF
                  </button>
                  <button
                    className="px-3 py-1 text-sm rounded bg-red-500 text-white"
                    onClick={() => onDelete(session.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SessionStatsView({
  session,
  onExport,
  onBack,
}: {
  session: Session
  onExport: (s: Session) => void
  onBack: () => void
}) {
  const sessionStats = getStats(session.plays)
  const teams: { key: Team; name: string; accent: string }[] = [
    { key: "A", name: session.teamNames.A, accent: "blue" },
    { key: "B", name: session.teamNames.B, accent: "red" },
  ]
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">{session.name}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onExport(session)}>
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={onBack}>
              Voltar
            </Button>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          {new Date(session.date).toLocaleString("pt-BR")} • {session.plays.length} jogadas
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-sm text-blue-600">{session.teamNames.A}</p>
            <p className="text-3xl font-bold text-blue-700">{sessionStats.totals.A}</p>
            <p className="text-xs text-blue-500">jogadas</p>
          </div>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
            <p className="text-sm text-red-600">{session.teamNames.B}</p>
            <p className="text-3xl font-bold text-red-700">{sessionStats.totals.B}</p>
            <p className="text-xs text-red-500">jogadas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teams.map(({ key, name, accent }) =>
            sessionStats.totals[key] > 0 ? (
              <div key={key} className={`border rounded-lg p-4 ${accent === "blue" ? "border-blue-200" : "border-red-200"}`}>
                <h3 className={`font-semibold mb-3 ${accent === "blue" ? "text-blue-800" : "text-red-800"}`}>{name} - Levantamentos</h3>
                {setPositions.map((pos) => {
                  const count = sessionStats.positions[key]?.[pos.value] || 0
                  const pct = sessionStats.totals[key] > 0 ? (count / sessionStats.totals[key]) * 100 : 0
                  return (
                    <div key={pos.value} className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{pos.label}</span>
                        <span className="font-medium">
                          {count} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className={`rounded-full p-1 ${accent === "blue" ? "bg-blue-100" : "bg-red-100"}`}>
                        <div
                          className={`p-1.5 ${accent === "blue" ? "bg-blue-600" : "bg-red-500"} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%`, minWidth: count > 0 ? "0.75rem" : "0" }}
                        />
                      </div>
                    </div>
                  )
                })}
                <h4 className={`font-semibold mt-4 mb-3 ${accent === "blue" ? "text-blue-800" : "text-red-800"}`}>Resultados</h4>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-green-100 rounded">
                    <p className="font-bold text-green-700">{sessionStats.results[key].ponto}</p>
                    <p className="text-green-600">Pontos</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded">
                    <p className="font-bold text-blue-700">{sessionStats.results[key].certo}</p>
                    <p className="text-blue-600">Certos</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded">
                    <p className="font-bold text-red-700">{sessionStats.results[key].erro}</p>
                    <p className="text-red-600">Erros</p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded">
                    <p className="font-bold text-orange-700">{sessionStats.results[key].bloqueado}</p>
                    <p className="text-orange-600">Bloq.</p>
                  </div>
                </div>
              </div>
            ) : null,
          )}
        </div>
      </div>
    </div>
  )
}

function TeamStatsView({
  team,
  currentSessionPlays,
  teamNames,
  settersA,
  settersB,
}: {
  team: Team
  currentSessionPlays: Play[]
  teamNames: TeamNames
  settersA: Setters
  settersB: Setters
}) {
  const teamPlays = currentSessionPlays.filter((p) => p.team === team && p.status === "levantamento")
  const teamStats = getStats(teamPlays)
  const statsL1 = getStatsBySetter(teamPlays, 1)
  const statsL2 = getStatsBySetter(teamPlays, 2)
  const hasL1 = statsL1.totals[team] > 0
  const hasL2 = statsL2.totals[team] > 0

  // Filtro do gráfico de direções: "todos" (visão geral sobreposta) ou por local de ataque.
  const attackByPosition = getAttackByPosition(teamPlays, team)
  const [courtFilter, setCourtFilter] = useState<SetPosition | "todos">("todos")
  const activeGroup = attackByPosition.find((g) => g.position === courtFilter)
  const courtLines =
    courtFilter === "todos" ? getAttackLinesWithOrigin(teamPlays, team) : (activeGroup?.lines ?? [])
  const courtLegend =
    courtFilter === "todos"
      ? getAttackLegend(teamPlays, team)
      : (activeGroup?.lines ?? []).map((l) => ({
          attackType: l.attackType,
          count: l.count,
          percentage: l.percentage,
        }))

  const resultCards = [
    {
      key: "ponto" as const,
      label: "Pontos",
      symbol: <Check className="w-4 h-4 text-white" />,
      card: "bg-green-50 border-green-200",
      circle: "bg-green-600",
      value: "text-green-700",
      labelColor: "text-green-600",
      pctColor: "text-green-500",
    },
    {
      key: "certo" as const,
      label: "Certos",
      symbol: <span className="text-white font-bold text-sm">~</span>,
      card: "bg-blue-50 border-blue-200",
      circle: "bg-blue-600",
      value: "text-blue-700",
      labelColor: "text-blue-600",
      pctColor: "text-blue-500",
    },
    {
      key: "erro" as const,
      label: "Erros",
      symbol: <X className="w-4 h-4 text-white" />,
      card: "bg-red-50 border-red-200",
      circle: "bg-red-500",
      value: "text-red-700",
      labelColor: "text-red-600",
      pctColor: "text-red-500",
    },
    {
      key: "bloqueado" as const,
      label: "Bloqueados",
      symbol: <span className="text-white font-bold text-sm">#</span>,
      card: "bg-orange-50 border-orange-200",
      circle: "bg-orange-500",
      value: "text-orange-700",
      labelColor: "text-orange-600",
      pctColor: "text-orange-500",
    },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${team === "A" ? "bg-blue-600" : "bg-red-500"}`}
          >
            {team}
          </div>
          <h2 className="text-lg font-bold text-slate-800">{teamNames[team]}</h2>
        </div>
        <span className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-700">
          {teamStats.totals[team]} jogadas
        </span>
      </div>

      {teamStats.totals[team] === 0 ? (
        <p className="text-slate-500 text-center py-8">Nenhuma jogada registrada para esta equipe</p>
      ) : (
        <>
          {(hasL1 || hasL2) && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <h4 className="text-sm font-medium text-slate-600 mb-2">Estatísticas por Levantador</h4>
              <div className="grid grid-cols-2 gap-3">
                {hasL1 && (
                  <div className="p-3 bg-white rounded border border-slate-200">
                    <div className="font-medium text-slate-800">{getSetterName(team, 1, settersA, settersB)}</div>
                    <div className={`text-2xl font-bold ${team === "A" ? "text-blue-600" : "text-red-500"}`}>
                      {statsL1.totals[team]}
                    </div>
                    <div className="text-xs text-slate-500">jogadas</div>
                  </div>
                )}
                {hasL2 && (
                  <div className="p-3 bg-white rounded border border-slate-200">
                    <div className="font-medium text-slate-800">{getSetterName(team, 2, settersA, settersB)}</div>
                    <div className={`text-2xl font-bold ${team === "A" ? "text-blue-600" : "text-red-500"}`}>
                      {statsL2.totals[team]}
                    </div>
                    <div className="text-xs text-slate-500">jogadas</div>
                  </div>
                )}
              </div>

              {hasL1 && hasL2 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <h5 className="text-xs font-medium text-slate-500 mb-2">Comparativo de Distribuição</h5>
                  <SetterComparisonChart
                    l1Name={getSetterName(team, 1, settersA, settersB)}
                    l2Name={getSetterName(team, 2, settersA, settersB)}
                    l1Positions={statsL1.positions[team] ?? {}}
                    l2Positions={statsL2.positions[team] ?? {}}
                    l1Total={statsL1.totals[team]}
                    l2Total={statsL2.totals[team]}
                  />
                </div>
              )}
            </div>
          )}

          {/* Quadra */}
          <div className="mb-6">
            <h3 className="font-semibold text-slate-700 mb-1">Quadra - Direções de Ataque</h3>
            <p className="text-xs text-slate-400 mb-3">
              {courtFilter === "todos"
                ? "Todas as direções sobrepostas. Filtre por local para leitura individual."
                : `Direções dos ataques originados na ${activeGroup?.label ?? ""} (${activeGroup?.description ?? ""}).`}
            </p>

            {/* Filtro por local de ataque */}
            {attackByPosition.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                <button
                  onClick={() => setCourtFilter("todos")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${courtFilter === "todos" ? "bg-orange-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-orange-50"}`}
                >
                  Ver todos
                </button>
                {attackByPosition.map((g) => (
                  <button
                    key={g.position}
                    onClick={() => setCourtFilter(g.position)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${courtFilter === g.position ? "bg-orange-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-orange-50"}`}
                  >
                    {g.label} <span className="opacity-70">({g.total})</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-center" style={{ perspective: "800px" }}>
              <div style={{ transform: "rotateX(45deg) rotateZ(0deg)", transformStyle: "preserve-3d" }}>
                <svg
                  viewBox="0 0 200 220"
                  className="w-full max-w-xs rounded-lg"
                  style={{ filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.3))" }}
                >
                  <defs>
                    <linearGradient id="courtGradientA" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: "#f5f0dc", stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: "#e8e0c0", stopOpacity: 1 }} />
                    </linearGradient>
                    <filter id="shadow3D" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="3" dy="3" stdDeviation="2" floodOpacity="0.3" />
                    </filter>
                  </defs>

                  <rect x="5" y="5" width="190" height="210" fill="url(#courtGradientA)" stroke="#1e3a5f" strokeWidth="3" rx="2" />
                  <rect x="5" y="20" width="190" height="10" fill="#1e3a5f" />
                  <line x1="5" y1="25" x2="195" y2="25" stroke="#fff" strokeWidth="1" strokeDasharray="2,2" />
                  <text x="100" y="15" textAnchor="middle" fontSize="9" fill="#1e3a5f" fontWeight="bold">
                    REDE
                  </text>

                  <circle cx="20" cy="25" r="10" fill="#1e40af" filter="url(#shadow3D)" />
                  <text x="20" y="29" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="bold">
                    P2
                  </text>
                  <circle cx="100" cy="25" r="10" fill="#1e40af" filter="url(#shadow3D)" />
                  <text x="100" y="29" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="bold">
                    P3
                  </text>
                  <circle cx="180" cy="25" r="10" fill="#1e40af" filter="url(#shadow3D)" />
                  <text x="180" y="29" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="bold">
                    P4
                  </text>

                  <line x1="5" y1="75" x2="195" y2="75" stroke="#1e3a5f" strokeWidth="2" strokeDasharray="8,4" />
                  <text x="10" y="85" fontSize="6" fill="#64748b">
                    3m
                  </text>

                  <circle cx="20" cy="190" r="6" fill="#94a3b8" opacity="0.5" />
                  <text x="20" y="193" textAnchor="middle" fontSize="7" fill="#1e3a5f" fontWeight="bold">
                    P5
                  </text>
                  <circle cx="100" cy="190" r="6" fill="#94a3b8" opacity="0.5" />
                  <text x="100" y="193" textAnchor="middle" fontSize="7" fill="#1e3a5f" fontWeight="bold">
                    P6
                  </text>
                  <circle cx="180" cy="190" r="6" fill="#94a3b8" opacity="0.5" />
                  <text x="180" y="193" textAnchor="middle" fontSize="7" fill="#1e3a5f" fontWeight="bold">
                    P1
                  </text>

                  {courtLines.map((attack, i) => {
                    const midX = (attack.line.startX + attack.line.endX) / 2
                    const midY = (attack.line.startY + 20 + attack.line.endY) / 2
                    const color = attackLineColors[attack.attackType as AttackType]
                    return (
                      <g key={i}>
                        <line
                          x1={attack.line.startX}
                          y1={attack.line.startY + 20}
                          x2={attack.line.endX}
                          y2={attack.line.endY}
                          stroke={color}
                          strokeWidth={Math.max(3, attack.percentage / 8)}
                          opacity="0.85"
                          strokeLinecap="round"
                        />
                        <circle cx={midX} cy={midY} r="12" fill={color} filter="url(#shadow3D)" />
                        <text x={midX} y={midY + 4} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold">
                          {attack.percentage}%
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {courtLegend.map((item) => (
                <div key={item.attackType} className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: attackLineColors[item.attackType as AttackType] }}
                  />
                  <span className="text-slate-600">
                    {attackTypeLabels[item.attackType as AttackType] || item.attackType}:
                  </span>
                  <span className="font-semibold">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            {resultCards.map((card) => {
              const value = teamStats.results[team][card.key]
              const pct = teamStats.totals[team] > 0 ? ((value / teamStats.totals[team]) * 100).toFixed(0) : 0
              return (
                <div key={card.key} className={`${card.card} border rounded-lg p-3 text-center`}>
                  <div className={`w-8 h-8 rounded-full ${card.circle} flex items-center justify-center mx-auto mb-1`}>
                    {card.symbol}
                  </div>
                  <p className={`text-2xl font-bold ${card.value}`}>{value}</p>
                  <p className={`text-xs ${card.labelColor}`}>{card.label}</p>
                  <p className={`text-xs ${card.pctColor} mt-1`}>{pct}%</p>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-white border border-orange-100 rounded-lg p-4">
              <h3 className="font-semibold text-slate-700 mb-4">Distribuição de Levantamentos</h3>
              <div className="space-y-3">
                {setPositions.map((pos) => {
                  const count = teamStats.positions[team]?.[pos.value] || 0
                  const pct = teamStats.totals[team] > 0 ? (count / teamStats.totals[team]) * 100 : 0
                  const barColor = team === "A" ? "bg-blue-600" : "bg-red-500"
                  const boxColor = team === "A" ? "bg-blue-600" : "bg-red-500"
                  return (
                    <div key={pos.value} className="flex items-center gap-3">
                      <div className={`w-12 ${boxColor} text-white p-2 rounded font-bold text-center text-sm`}>
                        {count}
                      </div>
                      <div className="flex-1">
                        <div className="bg-orange-100 rounded-full p-1 flex items-center">
                          <div
                            className={`${barColor} rounded-full p-2 transition-all duration-500`}
                            style={{ width: `${pct}%`, minWidth: count > 0 ? "0.5rem" : "0" }}
                          />
                          <span className="text-slate-700 text-sm font-bold mx-2 whitespace-nowrap">{pos.label}</span>
                        </div>
                      </div>
                      <div className="w-12 text-right text-sm font-bold text-slate-600">{pct.toFixed(0)}%</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-white border border-orange-100 rounded-lg p-4">
              <h3 className="font-semibold text-slate-700 mb-4">Tipos de Ataque</h3>
              <div className="space-y-3">
                {[...attackTypes, ...specialAttackTypes]
                  .filter((a) => a.value !== "bloqueado")
                  .map((att) => {
                    const count = teamStats.attacks[team]?.[att.value] || 0
                    const pct = teamStats.totals[team] > 0 ? (count / teamStats.totals[team]) * 100 : 0
                    return (
                      <div key={att.value} className="flex items-center gap-3">
                        <div
                          className="w-12 text-white p-2 rounded font-bold text-center text-sm"
                          style={{ backgroundColor: attackLineColors[att.value] }}
                        >
                          {count}
                        </div>
                        <div className="flex-1">
                          <div className="bg-orange-100 rounded-full p-1 flex items-center">
                            <div
                              className="rounded-full p-2 transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                minWidth: count > 0 ? "0.5rem" : "0",
                                backgroundColor: attackLineColors[att.value],
                              }}
                            />
                            <span className="text-slate-700 text-sm font-bold mx-2 whitespace-nowrap">{att.label}</span>
                          </div>
                        </div>
                        <div className="w-12 text-right text-sm font-bold text-slate-600">{pct.toFixed(0)}%</div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
