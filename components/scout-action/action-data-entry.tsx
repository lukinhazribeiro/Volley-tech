"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Undo2,
  FlagTriangleRight,
  Check,
  Table2,
  Settings2,
  Clock,
  Trophy,
  FileDown,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ROLE_LABEL, formatTime, type Posicao } from "@/lib/video-scout/types"
import type { TeamConfig } from "@/lib/video-scout/match"
import {
  createLiveMatch,
  courtCells,
  recordLive,
  closeSet,
  setsWon,
  substitutePlayer,
  updateLiveTeam,
  toStoredTeam,
  setterAssistPlan,
  type SetterAssistPlan,
  type LiveState,
} from "@/lib/scout-action/live"
import type { ActionKind, ActionSide, ScoutActionMatch } from "@/lib/scout-action/types"
import { matchTotals } from "@/lib/scout-action/types"
import type { ActionMatchConfig } from "@/lib/scout-action/config"
import { saveActionMatch, clearInProgressActionMatch, type ActionMatch } from "@/lib/scout-action/storage"
import { ActionCourt } from "./action-court"
import { ActionSpreadsheet } from "./action-spreadsheet"
import { ActionMatchMenu } from "./action-match-menu"

// Ordem de exibição da grade de jogadores (igual à quadra).
const GRID_ORDER: Posicao[] = ["P4", "P3", "P2", "P5", "P6", "P1"]

const KIND_META: Record<ActionKind, { label: string; cls: string }> = {
  acao: { label: "AÇÃO", cls: "bg-amber-500 hover:bg-amber-400 text-slate-900" },
  ponto: { label: "PONTO", cls: "bg-emerald-500 hover:bg-emerald-400 text-white" },
  erro: { label: "ERRO", cls: "bg-red-500 hover:bg-red-400 text-white" },
}

interface ActionDataEntryProps {
  config: ActionMatchConfig
  /** Scouts já salvos, exibidos no histórico do cabeçalho. */
  savedMatches: ActionMatch[]
  onExportPdf: (m: ActionMatch) => void
  onDeleteMatch: (id: string) => void
  onFinish: () => void
  onExit: () => void
}

export function ActionDataEntry({
  config,
  savedMatches,
  onExportPdf,
  onDeleteMatch,
  onFinish,
  onExit,
}: ActionDataEntryProps) {
  const [state, setState] = useState<LiveState>(() =>
    createLiveMatch(config.teamA, config.teamB, config.firstServer),
  )
  const historyRef = useRef<LiveState[]>([])
  const [side, setSide] = useState<ActionSide>("A")
  /** Fluxo jogador → resultado: posição da atleta escolhida, aguardando o resultado. */
  const [selected, setSelected] = useState<Posicao | null>(null)
  /** Aguardando indicar quem levantou no lugar da levantadora. */
  const [pendingAssist, setPendingAssist] = useState<{
    posicao: Posicao
    kind: ActionKind
    plan: SetterAssistPlan
  } | null>(null)
  const [showSheet, setShowSheet] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  // Dados da partida editáveis a qualquer momento pelo menu do topo.
  const [competition, setCompetition] = useState(config.competition)
  const [category, setCategory] = useState(config.category)
  const [firstServer, setFirstServer] = useState<ActionSide>(config.firstServer)
  /** Substituição em andamento: quem sai (posição da quadra) e a equipe. */
  const [subTarget, setSubTarget] = useState<{ side: ActionSide; outId: string } | null>(null)

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

  /** Passo 1 — escolher a atleta que tocou na bola (alterna a seleção). */
  function handleSelectPlayer(pos: Posicao) {
    setSelected((cur) => (cur === pos ? null : pos))
  }

  /** Grava a ação; o motor credita o levantamento correspondente. */
  function commitAction(pos: Posicao, kind: ActionKind, setterOverrideId: string | null) {
    historyRef.current.push(state)
    setState(recordLive(state, side, pos, kind, setterOverrideId))
    setSelected(null)
    setPendingAssist(null)
  }

  /**
   * Passo 2 — dizer o resultado do toque. Quando a própria levantadora fez o
   * primeiro toque do rally, pergunta quem levantou no lugar dela.
   */
  function handleKind(kind: ActionKind) {
    if (!selected) return
    const plan = setterAssistPlan(state, side, selected)
    if (plan.mode === "override" && plan.candidateIds.length > 0) {
      setPendingAssist({ posicao: selected, kind, plan })
      return
    }
    commitAction(selected, kind, null)
  }

  /** Toque num jogador em quadra: abre a substituição por um reserva. */
  function handleCourtTap(tappedSide: ActionSide, playerId: string) {
    setSubTarget({ side: tappedSide, outId: playerId })
  }

  const activeTeam = side === "A" ? state.teamA : state.teamB
  const playerById = useCallback(
    (id: string) => activeTeam.players.find((p) => p.id === id) ?? null,
    [activeTeam],
  )

  /** Reservas disponíveis da equipe alvo (elenco menos quem está em quadra). */
  const subReserves = useMemo(() => {
    if (!subTarget) return []
    const team = subTarget.side === "A" ? state.teamA : state.teamB
    const cells = subTarget.side === "A" ? cellsA : cellsB
    const onCourt = new Set(cells.map((c) => c.player?.id).filter(Boolean))
    return team.players.filter((p) => p.name?.trim() && !onCourt.has(p.id))
  }, [subTarget, state, cellsA, cellsB])

  function handleSubstitute(inId: string) {
    if (!subTarget) return
    historyRef.current.push(state)
    setState(substitutePlayer(state, subTarget.side, subTarget.outId, inId))
    setSubTarget(null)
  }

  /** Troca a config de uma equipe pelo menu (preserva placar/eventos). */
  function handleChangeTeam(teamSide: ActionSide, team: TeamConfig) {
    setState((s) => updateLiveTeam(s, teamSide, team))
  }

  /** Edição dos dados da partida. O primeiro saque só muda antes do 1º lance. */
  function handleChangeMeta(patch: { competition?: string; category?: string; firstServer?: ActionSide }) {
    if (patch.competition !== undefined) setCompetition(patch.competition)
    if (patch.category !== undefined) setCategory(patch.category)
    if (patch.firstServer !== undefined && state.events.length === 0) {
      setFirstServer(patch.firstServer)
      setState((s) => ({ ...s, servingTeam: patch.firstServer! }))
    }
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
    setSelected(null)
    setPendingAssist(null)
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
      category,
      competition,
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
        category={category}
        competition={competition}
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
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-300">
              Scout Action · ao vivo
            </span>
            <button
              onClick={() => setShowSaved(true)}
              aria-label="Ver scouts salvos"
              className="relative inline-flex size-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Clock className="size-4" />
              {savedMatches.length > 0 && (
                <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">
                  {savedMatches.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowMenu(true)}
              aria-label="Editar equipes e dados da partida"
              className="inline-flex size-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Settings2 className="size-4" />
            </button>
          </div>
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
          onPlayerTap={handleCourtTap}
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
                  onClick={() => {
                    setSide(s)
                    setSelected(null)
                  }}
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

          {/* Passo 1 — quem tocou na bola */}
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            1 · Atleta
          </p>
          <div className="grid grid-cols-3 gap-2">
            {GRID_ORDER.map((pos) => {
              const cell = gridCells.find((c) => c.posicao === pos)!
              const p = cell.player
              const active = selected === pos
              return (
                <button
                  key={pos}
                  onClick={() => handleSelectPlayer(pos)}
                  disabled={!p}
                  aria-pressed={active}
                  className={[
                    "flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition",
                    active
                      ? "border-white bg-slate-700 ring-2 ring-white/70"
                      : cell.isLibero
                        ? "border-amber-500/40 bg-amber-500/10"
                        : "border-slate-700 bg-slate-800",
                    p ? "hover:border-white/60 active:scale-95" : "opacity-60",
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

          {/* Passo 2 — qual foi o resultado do toque dessa atleta */}
          <p className="mb-2 mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            2 · Resultado
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["acao", "ponto", "erro"] as ActionKind[]).map((k) => (
              <button
                key={k}
                onClick={() => handleKind(k)}
                disabled={!selected}
                className={[
                  "rounded-xl px-2 py-3 text-sm font-black uppercase tracking-wide transition",
                  KIND_META[k].cls,
                  selected ? "active:scale-95" : "opacity-40",
                ].join(" ")}
              >
                {KIND_META[k].label}
              </button>
            ))}
          </div>

          <p className="mt-2 text-center text-[11px] text-slate-400">
            {(() => {
              if (!selected) return "Toque na atleta que tocou na bola"
              const cell = gridCells.find((c) => c.posicao === selected)
              const p = cell?.player
              return `#${p?.number} ${p?.name || ""} — foi ação, ponto ou erro?`
            })()}
          </p>
        </div>

        {/* Ações do jogo */}
        <div className="grid grid-cols-4 gap-2">
          <Button
            onClick={handleUndo}
            variant="outline"
            aria-label="Desfazer última ação"
            className="gap-1.5 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <Undo2 className="size-4" />
            <span className="hidden sm:inline">Desfazer</span>
          </Button>
          <Button
            onClick={() => setShowSheet(true)}
            variant="outline"
            aria-label="Abrir planilha"
            className="gap-1.5 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <Table2 className="size-4" />
            <span className="hidden sm:inline">Planilha</span>
          </Button>
          <Button
            onClick={handleCloseSet}
            variant="outline"
            aria-label="Fechar set atual"
            className="gap-1.5 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <FlagTriangleRight className="size-4" />
            <span className="hidden sm:inline">Fechar set</span>
          </Button>
          <Button
            onClick={handleFinish}
            aria-label="Encerrar e salvar partida"
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <Check className="size-4" />
            <span className="hidden sm:inline">Encerrar</span>
          </Button>
        </div>

        {/* Barra inferior */}
        <div className="grid grid-cols-4 gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3 text-center text-xs">
          <BottomStat label="Set" value={`${state.setIndex + 1}`} />
          <BottomStat label="Tempo" value={formatTime(elapsed)} />
          <BottomStat label="Competição" value={competition || "—"} />
          <BottomStat
            label="Placar do set"
            value={lastSet ? `${lastSet.scoreA}-${lastSet.scoreB}` : `${sets.a}-${sets.b} sets`}
          />
        </div>
      </div>

      {/* A levantadora fez o 1º toque: indicar quem levantou no lugar dela */}
      {pendingAssist && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Indicar quem levantou"
          onClick={() => setPendingAssist(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-emerald-500/40 bg-slate-900 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-white">Quem levantou?</h3>
            <p className="mt-1 text-xs text-slate-400">
              {(() => {
                const setter = pendingAssist.plan.setterId
                  ? playerById(pendingAssist.plan.setterId)
                  : null
                return `A levantadora #${setter?.number ?? "?"} fez o primeiro toque, então outra atleta levantou. Indique quem foi para creditar o TP correto.`
              })()}
            </p>

            <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto">
              {pendingAssist.plan.candidateIds.map((id) => {
                const p = playerById(id)
                if (!p) return null
                const suggested = pendingAssist.plan.suggestedId === id
                return (
                  <li key={id}>
                    <button
                      onClick={() => commitAction(pendingAssist.posicao, pendingAssist.kind, id)}
                      className="flex w-full items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-left hover:border-emerald-400 hover:bg-slate-700"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">
                        {p.number}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-100">
                          {p.name}
                        </span>
                        {p.role && (
                          <span className="block text-[10px] uppercase text-slate-400">
                            {ROLE_LABEL[p.role]}
                          </span>
                        )}
                      </span>
                      {suggested && (
                        <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
                          sugerida
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                onClick={() => commitAction(pendingAssist.posicao, pendingAssist.kind, "")}
                variant="outline"
                className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                Sem levantamento
              </Button>
              <Button
                onClick={() => setPendingAssist(null)}
                variant="ghost"
                className="text-slate-400 hover:text-slate-200"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de substituição: trocar o atleta tocado por um reserva do banco */}
      {subTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Substituir atleta"
          onClick={() => setSubTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Substituir · {subTarget.side === "A" ? nameA : nameB}
              </h3>
              <button
                onClick={() => setSubTarget(null)}
                className="text-slate-400 hover:text-slate-200"
                aria-label="Cancelar substituição"
              >
                <ArrowLeft className="size-4" />
              </button>
            </div>
            {(() => {
              const team = subTarget.side === "A" ? state.teamA : state.teamB
              const out = team.players.find((p) => p.id === subTarget.outId)
              return (
                <p className="mb-3 text-xs text-slate-400">
                  Sai <span className="font-semibold text-slate-200">#{out?.number} {out?.name}</span>. Escolha quem
                  entra:
                </p>
              )
            })()}
            {subReserves.length === 0 ? (
              <p className="rounded-lg bg-slate-800 p-4 text-center text-sm text-slate-400">
                Nenhum reserva com nome disponível no elenco.
              </p>
            ) : (
              <ul className="max-h-72 space-y-1.5 overflow-y-auto">
                {subReserves.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => handleSubstitute(p.id)}
                      className="flex w-full items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-left hover:border-orange-400 hover:bg-slate-700"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">
                        {p.number}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-100">{p.name}</span>
                        {p.role && (
                          <span className="block text-[10px] uppercase text-slate-400">{p.role}</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Menu de edição de equipes e dados da partida */}
      {showMenu && (
        <ActionMatchMenu
          competition={competition}
          category={category}
          firstServer={firstServer}
          teamA={state.teamA}
          teamB={state.teamB}
          lockServer={state.events.length > 0}
          onChangeMeta={handleChangeMeta}
          onChangeTeam={handleChangeTeam}
          onClose={() => setShowMenu(false)}
        />
      )}

      {/* Histórico de scouts salvos */}
      {showSaved && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Scouts salvos"
          onClick={() => setShowSaved(false)}
        >
          <div
            className="flex max-h-[85svh] w-full max-w-lg flex-col rounded-2xl border border-slate-700 bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Clock className="size-4 text-orange-400" />
                Scouts salvos
              </h3>
              <button
                onClick={() => setShowSaved(false)}
                className="text-slate-400 hover:text-slate-200"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>

            {savedMatches.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-400">
                  Nenhum scout salvo ainda. Encerre uma coleta para vê-la aqui.
                </p>
              </div>
            ) : (
              <ul className="flex-1 space-y-2 overflow-y-auto p-4">
                {savedMatches.map((m) => {
                  const nA = m.teamA.name || "Equipe A"
                  const nB = m.teamB.name || "Equipe B"
                  const tA = matchTotals(m, "A")
                  const tB = matchTotals(m, "B")
                  return (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-800/50 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-medium text-slate-100">
                          <Trophy className="size-4 shrink-0 text-orange-400" />
                          <span className="truncate">
                            {nA} <span className="text-slate-500">x</span> {nB}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {new Date(m.createdAt).toLocaleDateString("pt-BR")} · Sets {m.setsA}-{m.setsB} · TGP{" "}
                          {nA} {tA.tgp}% / {nB} {tB.tgp}%
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          onClick={() => onExportPdf(m)}
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
                        >
                          <FileDown className="size-4" />
                          PDF
                        </Button>
                        <Button
                          onClick={() => onDeleteMatch(m.id)}
                          size="icon"
                          variant="ghost"
                          className="text-slate-400 hover:text-red-400"
                          aria-label="Excluir scout"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
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
