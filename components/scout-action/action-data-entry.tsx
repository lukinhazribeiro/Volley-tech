"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Undo2, FlagTriangleRight, Check, Table2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ROLE_LABEL, formatTime, type Posicao } from "@/lib/video-scout/types"
import {
  createLiveMatch,
  courtCells,
  recordLive,
  closeSet,
  setsWon,
  toStoredTeam,
  type LiveState,
} from "@/lib/scout-action/live"
import type { ActionKind, ActionSide, ScoutActionMatch } from "@/lib/scout-action/types"
import { saveActionMatch, clearInProgressActionMatch } from "@/lib/scout-action/storage"
import { ActionCourt } from "./action-court"
import { ActionSpreadsheet } from "./action-spreadsheet"
import type { ActionMatchConfig } from "./action-setup"

// Ordem de exibição da grade de jogadores (igual à quadra).
const GRID_ORDER: Posicao[] = ["P4", "P3", "P2", "P5", "P6", "P1"]

const KIND_META: Record<ActionKind, { label: string; cls: string }> = {
  acao: { label: "AÇÃO", cls: "bg-amber-500 hover:bg-amber-400 text-slate-900" },
  ponto: { label: "PONTO", cls: "bg-emerald-500 hover:bg-emerald-400 text-white" },
  erro: { label: "ERRO", cls: "bg-red-500 hover:bg-red-400 text-white" },
}

interface ActionDataEntryProps {
  config: ActionMatchConfig
  onFinish: () => void
  onExit: () => void
}

export function ActionDataEntry({ config, onFinish, onExit }: ActionDataEntryProps) {
  const [state, setState] = useState<LiveState>(() =>
    createLiveMatch(config.teamA, config.teamB, config.firstServer),
  )
  const historyRef = useRef<LiveState[]>([])
  const [side, setSide] = useState<ActionSide>("A")
  const [armed, setArmed] = useState<ActionKind | null>(null)
  const [showSheet, setShowSheet] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const startRef = useRef(Date.now())
  useEffect(() => {
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)),
      1000,
    )
    return () => clearInterval(id)
  }, [])

  const nameA = state.teamA.name || "Equipe A"
  const nameB = state.teamB.name || "Equipe B"
  const cellsA = useMemo(() => courtCells(state, "A"), [state])
  const cellsB = useMemo(() => courtCells(state, "B"), [state])
  const gridCells = side === "A" ? cellsA : cellsB
  const sets = setsWon(state)

  const commit = useCallback((next: LiveState) => {
    historyRef.current.push(next)
    setState(next)
  }, [])

  function handlePlayer(pos: Posicao) {
    if (!armed) return
    historyRef.current.push(state)
    setState(recordLive(state, side, pos, armed))
    setArmed(null)
  }

  function handleUndo() {
    const hist = historyRef.current
    if (hist.length === 0) return
    const prev = hist.pop()!
    setState(prev)
  }

  function handleCloseSet() {
    if (state.scoreA === 0 && state.scoreB === 0) return
    if (!confirm(`Encerrar o set ${state.setIndex + 1} em ${state.scoreA} x ${state.scoreB}?`)) return
    // Próximo set: quem perdeu começa sacando (fallback A).
    const nextServer: ActionSide = state.scoreA > state.scoreB ? "B" : "A"
    commit(closeSet(state, nextServer))
    setArmed(null)
  }

  function handleFinish() {
    if (!confirm("Encerrar o scout e salvar? Isto conclui a coleta das duas equipes.")) return
    const finalScores = [...state.setScores]
    if (state.scoreA > 0 || state.scoreB > 0) {
      finalScores.push({ scoreA: state.scoreA, scoreB: state.scoreB })
    }
    let a = 0
    let b = 0
    for (const s of finalScores) {
      if (s.scoreA > s.scoreB) a++
      else if (s.scoreB > s.scoreA) b++
    }
    const match: Omit<ScoutActionMatch, "id"> = {
      category: config.category,
      competition: config.competition,
      teamA: toStoredTeam(state.teamA),
      teamB: toStoredTeam(state.teamB),
      events: state.events,
      setScores: finalScores,
      setsA: a,
      setsB: b,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      winner: a === b ? null : a > b ? "A" : "B",
    }
    saveActionMatch(match)
    clearInProgressActionMatch()
    onFinish()
  }

  const lastSet = state.setScores[state.setScores.length - 1]

  if (showSheet) {
    return (
      <ActionSpreadsheet
        live={state}
        category={config.category}
        competition={config.competition}
        onBack={() => setShowSheet(false)}
      />
    )
  }

  return (
    <div className="min-h-svh bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-3 py-4">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <button
            onClick={onExit}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="size-4" />
            Sair
          </button>
          <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-300">
            Scout Action · ao vivo
          </span>
        </div>

        {/* Placar */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold text-sky-300">{nameA}</p>
            <p className="text-5xl font-black tabular-nums text-white">{state.scoreA}</p>
            <SetDots count={sets.a} active={state.servingTeam === "A"} />
          </div>
          <div className="text-center text-slate-500">
            <p className="text-[10px] font-bold uppercase tracking-widest">Set {state.setIndex + 1}</p>
            <p className="text-2xl font-black">x</p>
          </div>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold text-orange-300">{nameB}</p>
            <p className="text-5xl font-black tabular-nums text-white">{state.scoreB}</p>
            <SetDots count={sets.b} active={state.servingTeam === "B"} />
          </div>
        </div>

        {/* Quadra */}
        <ActionCourt
          nameA={nameA}
          nameB={nameB}
          cellsA={cellsA}
          cellsB={cellsB}
          serving={state.servingTeam}
        />

        {/* Coletor: seletor A/B + 3 botões + grade de jogadores */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="mb-3 grid grid-cols-2 gap-2">
            {(["A", "B"] as ActionSide[]).map((s) => {
              const active = side === s
              const name = s === "A" ? nameA : nameB
              const activeCls =
                s === "A"
                  ? "border-sky-400 bg-sky-500/20 text-sky-200"
                  : "border-orange-400 bg-orange-500/20 text-orange-200"
              return (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={[
                    "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition",
                    active
                      ? activeCls
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200",
                  ].join(" ")}
                >
                  <span className="shrink-0">{s}</span>
                  <span className="truncate">{name}</span>
                </button>
              )
            })}
          </div>

          {/* Botões de ação */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            {(["acao", "ponto", "erro"] as ActionKind[]).map((k) => (
              <button
                key={k}
                onClick={() => setArmed((cur) => (cur === k ? null : k))}
                className={[
                  "rounded-xl px-2 py-3 text-sm font-black uppercase tracking-wide transition",
                  KIND_META[k].cls,
                  armed === k ? "ring-4 ring-white/60" : "opacity-90",
                ].join(" ")}
              >
                {KIND_META[k].label}
              </button>
            ))}
          </div>

          <p className="mb-2 text-center text-[11px] text-slate-400">
            {armed
              ? `Toque na atleta que fez a ${KIND_META[armed].label.toLowerCase()}`
              : "Selecione AÇÃO, PONTO ou ERRO e toque na atleta"}
          </p>

          {/* Grade de jogadores em quadra da equipe selecionada */}
          <div className="grid grid-cols-3 gap-2">
            {GRID_ORDER.map((pos) => {
              const cell = gridCells.find((c) => c.posicao === pos)!
              const p = cell.player
              return (
                <button
                  key={pos}
                  onClick={() => handlePlayer(pos)}
                  disabled={!armed || !p}
                  className={[
                    "flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition",
                    cell.isLibero
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-slate-700 bg-slate-800",
                    armed && p ? "hover:border-white/60 active:scale-95" : "opacity-60",
                  ].join(" ")}
                >
                  <span className="text-[9px] font-bold text-slate-500">{pos}</span>
                  <span className="text-xl font-black tabular-nums text-white">
                    {p ? p.number : "—"}
                  </span>
                  <span className="max-w-full truncate text-[9px] uppercase text-slate-400">
                    {cell.isLibero ? "Líbero" : p?.role ? ROLE_LABEL[p.role] : ""}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Ações do jogo */}
        <div className="grid grid-cols-4 gap-2">
          <Button
            onClick={handleUndo}
            variant="outline"
            className="gap-1.5 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <Undo2 className="size-4" />
            <span className="hidden sm:inline">Desfazer</span>
          </Button>
          <Button
            onClick={() => setShowSheet(true)}
            variant="outline"
            className="gap-1.5 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <Table2 className="size-4" />
            <span className="hidden sm:inline">Planilha</span>
          </Button>
          <Button
            onClick={handleCloseSet}
            variant="outline"
            className="gap-1.5 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <FlagTriangleRight className="size-4" />
            <span className="hidden sm:inline">Fechar set</span>
          </Button>
          <Button onClick={handleFinish} className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500">
            <Check className="size-4" />
            <span className="hidden sm:inline">Encerrar</span>
          </Button>
        </div>

        {/* Barra inferior */}
        <div className="grid grid-cols-4 gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3 text-center text-xs">
          <BottomStat label="Set" value={`${state.setIndex + 1}`} />
          <BottomStat label="Tempo" value={formatTime(elapsed)} />
          <BottomStat label="Competição" value={config.competition || "—"} />
          <BottomStat
            label="Placar do set"
            value={lastSet ? `${lastSet.scoreA}-${lastSet.scoreB}` : `${sets.a}-${sets.b} sets`}
          />
        </div>
      </div>
    </div>
  )
}

function SetDots({ count, active }: { count: number; active: boolean }) {
  return (
    <div className="mt-1 flex items-center justify-center gap-1">
      <span className="text-[10px] text-slate-500">{count} sets</span>
      {active && (
        <span className="rounded bg-emerald-500/20 px-1 text-[9px] font-bold uppercase text-emerald-300">
          saque
        </span>
      )}
    </div>
  )
}

function BottomStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="truncate text-sm font-semibold text-slate-200">{value}</p>
    </div>
  )
}
