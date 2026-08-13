"use client"

import { useMemo, useState } from "react"
import { Undo2, Flag, StopCircle, Volleyball, SlidersHorizontal, Table2, Grid3x3, Zap } from "lucide-react"
import {
  buildInitialLineup,
  courtSlots,
  opponent,
  rotate,
  setPlayerAtPosition,
  type TeamLineup,
} from "@/lib/scout-action/rotation"
import type { ActionEvent, ActionKind, ActionSetScore } from "@/lib/scout-action/types"
import { saveActionMatch } from "@/lib/scout-action/storage"
import type { ActionMatchConfig } from "./action-setup"
import { ActionSpreadsheet } from "./action-spreadsheet"

interface Snapshot {
  events: ActionEvent[]
  lineup: TeamLineup
  serving: "A" | "B"
  setScoreA: number
  setScoreB: number
  completedSets: ActionSetScore[]
  currentSet: number
}

let eventSeq = 0
function newEvent(e: Omit<ActionEvent, "id" | "createdAt">): ActionEvent {
  eventSeq += 1
  return { ...e, id: `sae_${Date.now()}_${eventSeq}`, createdAt: Date.now() }
}

export function ActionDataEntry({
  config,
  onFinish,
  onExit,
}: {
  config: ActionMatchConfig
  onFinish: () => void
  onExit: () => void
}) {
  const initialLineup = useMemo(() => buildInitialLineup(config.players), [config.players])
  const setterNumber = initialLineup.setterNumber

  const [tab, setTab] = useState<"coleta" | "planilha">("coleta")
  const [events, setEvents] = useState<ActionEvent[]>([])
  const [lineup, setLineup] = useState<TeamLineup>(initialLineup)
  const [serving, setServing] = useState<"A" | "B">(config.firstServer === "us" ? "A" : "B")
  const [setScoreA, setSetScoreA] = useState(0)
  const [setScoreB, setSetScoreB] = useState(0)
  const [completedSets, setCompletedSets] = useState<ActionSetScore[]>([])
  const [currentSet, setCurrentSet] = useState(0)
  const [autoSet, setAutoSet] = useState(true)
  const [adjust, setAdjust] = useState(false)
  const [undoStack, setUndoStack] = useState<Snapshot[]>([])

  function snapshot(): Snapshot {
    return {
      events: [...events],
      lineup: { ...lineup, positions: [...lineup.positions] },
      serving,
      setScoreA,
      setScoreB,
      completedSets: [...completedSets],
      currentSet,
    }
  }

  function pushUndo() {
    setUndoStack((prev) => [...prev.slice(-49), snapshot()])
  }

  function handleUndo() {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setEvents(last.events)
      setLineup(last.lineup)
      setServing(last.serving)
      setSetScoreA(last.setScoreA)
      setSetScoreB(last.setScoreB)
      setCompletedSets(last.completedSets)
      setCurrentSet(last.currentSet)
      return prev.slice(0, -1)
    })
  }

  /** Aplica o ponto: atualiza placar, rodízio (side-out) e quem saca. */
  function applyPoint(winner: "A" | "B") {
    if (winner === "A") setSetScoreA((s) => s + 1)
    else setSetScoreB((s) => s + 1)
    // Side-out: quem venceu sem estar sacando gira e passa a sacar.
    if (winner !== serving) {
      if (winner === "A") setLineup((l) => ({ ...l, positions: rotate(l.positions) }))
      setServing(winner)
    }
  }

  function registerPlayer(playerNumber: number, kind: ActionKind) {
    pushUndo()
    const additions: ActionEvent[] = [newEvent({ team: "A", playerNumber, kind, setIndex: currentSet })]
    // Levantamento automático: credita AÇÃO à levantadora em quadra numa jogada
    // positiva de outra atleta (participação no ponto/ataque).
    if (autoSet && setterNumber != null && setterNumber !== playerNumber && (kind === "acao" || kind === "ponto")) {
      additions.push(
        newEvent({ team: "A", playerNumber: setterNumber, kind: "acao", setIndex: currentSet, auto: true }),
      )
    }
    setEvents((prev) => [...prev, ...additions])
    if (kind === "ponto") applyPoint("A")
    else if (kind === "erro") applyPoint("B")
    // "acao" não pontua: rally segue.
  }

  function registerOpponentPoint() {
    pushUndo()
    setEvents((prev) => [...prev, newEvent({ team: "B", playerNumber: 0, kind: "ponto", setIndex: currentSet })])
    applyPoint("B")
  }

  function endSet() {
    if (setScoreA === 0 && setScoreB === 0) return
    pushUndo()
    setCompletedSets((prev) => [...prev, { scoreA: setScoreA, scoreB: setScoreB }])
    setCurrentSet((s) => s + 1)
    setSetScoreA(0)
    setSetScoreB(0)
    // Saque alterna a cada set.
    setServing((prev) => opponent(prev))
    setLineup(initialLineup)
  }

  function finishMatch() {
    const sets = [...completedSets]
    if (setScoreA > 0 || setScoreB > 0) sets.push({ scoreA: setScoreA, scoreB: setScoreB })
    const setsA = sets.filter((s) => s.scoreA > s.scoreB).length
    const setsB = sets.filter((s) => s.scoreB > s.scoreA).length
    const now = new Date()
    saveActionMatch({
      teamName: config.teamName,
      opponentName: config.opponentName,
      category: config.category,
      players: config.players,
      events,
      sets,
      teamSets: setsA,
      opponentSets: setsB,
      createdAt: now.toISOString(),
      completedAt: now.toISOString(),
      winner: setsA >= setsB ? "A" : "B",
    })
    onFinish()
  }

  const slots = courtSlots(lineup)
  const setsWonA = completedSets.filter((s) => s.scoreA > s.scoreB).length
  const setsWonB = completedSets.filter((s) => s.scoreB > s.scoreA).length

  return (
    <div className="mx-auto max-w-2xl px-3 py-4">
      {/* Placar */}
      <div className="mb-3 rounded-xl border border-slate-700 bg-slate-800/70 p-3">
        <div className="flex items-center justify-between">
          <TeamScore
            name={config.teamName}
            points={setScoreA}
            sets={setsWonA}
            serving={serving === "A"}
            align="left"
          />
          <div className="px-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Set {currentSet + 1}</p>
            <p className="text-xs font-semibold text-slate-400">{setsWonA} — {setsWonB}</p>
          </div>
          <TeamScore
            name={config.opponentName}
            points={setScoreB}
            sets={setsWonB}
            serving={serving === "B"}
            align="right"
          />
        </div>
      </div>

      {/* Abas */}
      <div className="mb-3 flex gap-2">
        <TabButton active={tab === "coleta"} onClick={() => setTab("coleta")} icon={<Grid3x3 className="h-4 w-4" />}>
          Coleta
        </TabButton>
        <TabButton active={tab === "planilha"} onClick={() => setTab("planilha")} icon={<Table2 className="h-4 w-4" />}>
          Planilha
        </TabButton>
      </div>

      {tab === "planilha" ? (
        <ActionSpreadsheet players={config.players} events={events} teamName={config.teamName} />
      ) : (
        <>
          {/* Rodízio */}
          <div className="mb-3 rounded-xl border border-slate-700 bg-slate-800/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Volleyball className="h-4 w-4 text-cyan-400" />
                Rodízio 5x1
              </span>
              <button
                onClick={() => setAdjust((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${
                  adjust ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {adjust ? "Concluir ajuste" : "Ajustar"}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <CourtCell
                  key={slot.position}
                  slot={slot}
                  adjust={adjust}
                  players={config.players}
                  onChange={(num) => setLineup((l) => setPlayerAtPosition(l, slot.position, num))}
                />
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={autoSet}
                onChange={(e) => setAutoSet(e.target.checked)}
                className="h-4 w-4 accent-cyan-500"
              />
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              Levantamento automático para a levantadora em quadra
            </label>
          </div>

          {/* Botões por atleta */}
          <div className="space-y-2">
            {config.players.map((p) => (
              <div
                key={p.number}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 p-2"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-sm font-bold text-white">
                    {p.number}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{p.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {p.role}
                      {p.number === setterNumber ? " · levanta" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <ActionBtn variant="acao" onClick={() => registerPlayer(p.number, "acao")}>
                    Ação
                  </ActionBtn>
                  <ActionBtn variant="ponto" onClick={() => registerPlayer(p.number, "ponto")}>
                    Ponto
                  </ActionBtn>
                  <ActionBtn variant="erro" onClick={() => registerPlayer(p.number, "erro")}>
                    Erro
                  </ActionBtn>
                </div>
              </div>
            ))}
          </div>

          {/* Ponto do adversário */}
          <button
            onClick={registerOpponentPoint}
            className="mt-3 w-full rounded-xl border border-slate-600 bg-slate-800/70 py-3 text-sm font-semibold text-slate-200 hover:border-red-500/60 hover:text-red-300"
          >
            +1 Ponto do adversário
          </button>
        </>
      )}

      {/* Controles */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-600 py-2.5 text-sm font-medium text-slate-200 disabled:opacity-40"
        >
          <Undo2 className="h-4 w-4" />
          Desfazer
        </button>
        <button
          onClick={endSet}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 py-2.5 text-sm font-medium text-amber-300"
        >
          <Flag className="h-4 w-4" />
          Encerrar set
        </button>
        <button
          onClick={finishMatch}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 py-2.5 text-sm font-bold text-white"
        >
          <StopCircle className="h-4 w-4" />
          Finalizar
        </button>
      </div>

      <button onClick={onExit} className="mt-3 w-full py-2 text-center text-xs text-slate-500 hover:text-slate-300">
        Descartar e sair sem salvar
      </button>
    </div>
  )
}

function TeamScore({
  name,
  points,
  serving,
  align,
}: {
  name: string
  points: number
  sets: number
  serving: boolean
  align: "left" | "right"
}) {
  return (
    <div className={`min-w-0 flex-1 ${align === "right" ? "text-right" : "text-left"}`}>
      <div className={`flex items-center gap-1.5 ${align === "right" ? "justify-end" : "justify-start"}`}>
        {serving && align === "left" && <Volleyball className="h-3.5 w-3.5 text-cyan-400" />}
        <p className="truncate text-xs font-medium text-slate-300">{name}</p>
        {serving && align === "right" && <Volleyball className="h-3.5 w-3.5 text-cyan-400" />}
      </div>
      <p className="text-3xl font-bold text-white">{points}</p>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium ${
        active ? "bg-cyan-600 text-white" : "border border-slate-700 bg-slate-800/50 text-slate-400"
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function CourtCell({
  slot,
  adjust,
  players,
  onChange,
}: {
  slot: ReturnType<typeof courtSlots>[number]
  adjust: boolean
  players: ActionMatchConfig["players"]
  onChange: (num: number) => void
}) {
  return (
    <div
      className={`relative rounded-lg border p-2 text-center ${
        slot.isServer ? "border-cyan-500 bg-cyan-500/10" : "border-slate-700 bg-slate-900/60"
      }`}
    >
      <span className="absolute left-1 top-1 text-[9px] font-medium text-slate-500">P{slot.position}</span>
      <div className="absolute right-1 top-1 flex gap-0.5">
        {slot.isSetter && (
          <span className="rounded bg-amber-500/20 px-1 text-[9px] font-bold text-amber-300">Lev</span>
        )}
        {slot.isLibero && <span className="rounded bg-fuchsia-500/20 px-1 text-[9px] font-bold text-fuchsia-300">Líb</span>}
      </div>
      {adjust ? (
        <select
          value={slot.number}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-3 w-full rounded bg-slate-800 text-center text-sm font-bold text-white"
        >
          {players.map((p) => (
            <option key={p.number} value={p.number}>
              {p.number}
            </option>
          ))}
        </select>
      ) : (
        <p className="mt-3 text-lg font-bold text-white">{slot.number || "—"}</p>
      )}
    </div>
  )
}

function ActionBtn({
  variant,
  onClick,
  children,
}: {
  variant: "acao" | "ponto" | "erro"
  onClick: () => void
  children: React.ReactNode
}) {
  const styles: Record<typeof variant, string> = {
    acao: "bg-slate-700 text-slate-100 hover:bg-slate-600",
    ponto: "bg-emerald-600 text-white hover:bg-emerald-500",
    erro: "bg-red-600 text-white hover:bg-red-500",
  }
  return (
    <button
      onClick={onClick}
      className={`h-10 w-14 rounded-lg text-xs font-bold transition-colors active:scale-95 ${styles[variant]}`}
    >
      {children}
    </button>
  )
}
