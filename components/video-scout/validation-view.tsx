"use client"

import { useMemo, useRef, useState } from "react"
import {
  BadgeCheck,
  CheckCircle2,
  LayoutGrid,
  Pencil,
  Plus,
  Sparkles,
  Users,
} from "lucide-react"
import {
  DETALHE_OPCOES,
  FUNDAMENTO_LABEL,
  FUNDAMENTO_ORDER,
  FUNDAMENTO_STYLE,
  RESULTADO_LABEL,
  RESULTADO_STYLE,
  formatTime,
  type Fundamento,
  type Player,
  type Rally,
  type ScoutAction,
  type TeamSide,
} from "@/lib/video-scout/types"
import { VideoPlayer, type VideoPlayerHandle } from "./video-player"
import { ActionEditor } from "./action-editor"
import { RosterEditor } from "./roster-editor"
import { CourtFormation } from "./court-formation"

interface ValidationViewProps {
  videoUrl: string
  videoDuration: number
  rallies: Rally[]
  actions: ScoutAction[]
  players: Player[]
  onUpdateAction: (action: ScoutAction) => void
  onDeleteAction: (id: string) => void
  onAddAction: (timestamp: number) => void
  onUpdatePlayer: (player: Player) => void
  onAddPlayer: (team: TeamSide) => void
  onRemovePlayer: (id: string) => void
  onGenerateScout: () => void
}

export function ValidationView({
  videoUrl,
  videoDuration,
  rallies,
  actions,
  players,
  onUpdateAction,
  onDeleteAction,
  onAddAction,
  onUpdatePlayer,
  onAddPlayer,
  onRemovePlayer,
  onGenerateScout,
}: ValidationViewProps) {
  const playerRef = useRef<VideoPlayerHandle>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [editing, setEditing] = useState<ScoutAction | null>(null)
  const [showRoster, setShowRoster] = useState(false)
  const [showFormation, setShowFormation] = useState(false)
  const [fundamentoFilter, setFundamentoFilter] = useState<Fundamento | "todos">("todos")
  const [athleteFilter, setAthleteFilter] = useState<string>("todos")

  const duration = videoDuration || 1
  const playerById = useMemo(() => {
    const map = new Map<string, Player>()
    players.forEach((p) => map.set(p.id, p))
    return map
  }, [players])

  const validatedCount = actions.filter((a) => a.validated).length

  const filteredActions = useMemo(() => {
    return actions.filter((a) => {
      if (fundamentoFilter !== "todos" && a.fundamento !== fundamentoFilter) return false
      if (athleteFilter !== "todos" && a.playerId !== athleteFilter) return false
      return true
    })
  }, [actions, fundamentoFilter, athleteFilter])

  // Ação mais próxima do tempo atual (para destaque).
  const activeActionId = useMemo(() => {
    let best: string | null = null
    let bestDelta = 1.2
    for (const a of actions) {
      const d = Math.abs(a.timestamp - currentTime)
      if (d < bestDelta) {
        bestDelta = d
        best = a.id
      }
    }
    return best
  }, [actions, currentTime])

  function seekTo(time: number) {
    playerRef.current?.seek(Math.max(0, time - 0.4))
    playerRef.current?.play()
  }

  function labelPlayer(action: ScoutAction) {
    if (!action.playerId) return "Sem atleta"
    const p = playerById.get(action.playerId)
    return p ? `#${p.number} ${p.name}` : "Sem atleta"
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      {/* Coluna do vídeo + timeline */}
      <div className="space-y-4">
        <VideoPlayer
          ref={playerRef}
          src={videoUrl}
          onTimeUpdate={setCurrentTime}
        />

        {/* Timeline horizontal com rallies e marcadores */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Linha do tempo</h3>
            <span className="text-xs text-slate-400">{rallies.length} rallies detectados</span>
          </div>
          <div className="relative h-12 w-full rounded-lg bg-slate-800/70">
            {/* Segmentos de rally */}
            {rallies.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => seekTo(r.startTime)}
                title={`Rally ${r.index + 1}`}
                className="absolute top-1 bottom-1 rounded bg-slate-700/70 transition-colors hover:bg-slate-600"
                style={{
                  left: `${(r.startTime / duration) * 100}%`,
                  width: `${Math.max(1, ((r.endTime - r.startTime) / duration) * 100)}%`,
                }}
              />
            ))}
            {/* Marcadores de ação */}
            {actions.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => seekTo(a.timestamp)}
                title={`${FUNDAMENTO_LABEL[a.fundamento]} - ${formatTime(a.timestamp)}`}
                className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-slate-900 ${FUNDAMENTO_STYLE[a.fundamento].dot}`}
                style={{ left: `${(a.timestamp / duration) * 100}%` }}
              />
            ))}
            {/* Cursor de reprodução */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          {/* Legenda */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {FUNDAMENTO_ORDER.map((f) => (
              <span key={f} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className={`h-2 w-2 rounded-full ${FUNDAMENTO_STYLE[f].dot}`} />
                {FUNDAMENTO_LABEL[f]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Coluna de validação */}
      <div className="flex min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-blue-400" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-200">Validar ações</h3>
            </div>
            <span className="text-xs text-slate-400">
              {validatedCount}/{actions.length} confirmadas
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowRoster(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              <Users className="h-4 w-4 text-blue-400" aria-hidden="true" />
              Editar elenco
            </button>
            <button
              type="button"
              onClick={() => setShowFormation(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              <LayoutGrid className="h-4 w-4 text-blue-400" aria-hidden="true" />
              Formação em quadra
            </button>
          </div>

          {/* Filtros */}
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFundamentoFilter("todos")}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  fundamentoFilter === "todos"
                    ? "border-blue-500 bg-blue-500/15 text-blue-200"
                    : "border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                Todos
              </button>
              {FUNDAMENTO_ORDER.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFundamentoFilter(f)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    fundamentoFilter === f
                      ? "border-blue-500 bg-blue-500/15 text-blue-200"
                      : "border-slate-700 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {FUNDAMENTO_LABEL[f]}
                </button>
              ))}
            </div>
            <select
              value={athleteFilter}
              onChange={(e) => setAthleteFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-blue-500"
              aria-label="Filtrar por atleta"
            >
              <option value="todos">Todos os atletas</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.number} - {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de ações */}
        <div className="max-h-[420px] flex-1 overflow-y-auto p-3">
          {filteredActions.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Nenhuma ação para os filtros selecionados.
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredActions.map((a) => {
                const isActive = a.id === activeActionId
                const style = FUNDAMENTO_STYLE[a.fundamento]
                return (
                  <li key={a.id}>
                    <div
                      className={`rounded-lg border p-2.5 transition-colors ${
                        isActive
                          ? "border-blue-500/60 bg-blue-500/10"
                          : "border-slate-800 bg-slate-800/40 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => seekTo(a.timestamp)}
                          className="font-mono text-xs text-slate-400 hover:text-blue-300"
                        >
                          {formatTime(a.timestamp)}
                        </button>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-xs font-medium ${style.chip}`}
                        >
                          {FUNDAMENTO_LABEL[a.fundamento]}
                        </span>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-xs ${RESULTADO_STYLE[a.resultado]}`}
                        >
                          {RESULTADO_LABEL[a.resultado]}
                        </span>
                        {a.detalhe && (
                          <span className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">
                            {DETALHE_OPCOES[a.fundamento]?.find((o) => o.value === a.detalhe)?.label ??
                              a.detalhe}
                          </span>
                        )}
                        {a.validated && (
                          <CheckCircle2
                            className="ml-auto h-4 w-4 text-emerald-400"
                            aria-label="Confirmada"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => setEditing(a)}
                          className={`flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-700 hover:text-slate-100 ${a.validated ? "" : "ml-auto"}`}
                          aria-label="Editar ação"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span className="text-slate-300">{labelPlayer(a)}</span>
                        <span className="text-slate-500">
                          IA {Math.round(a.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-800 p-3">
          <button
            type="button"
            onClick={() => onAddAction(currentTime)}
            className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar ação em {formatTime(currentTime)}
          </button>
          <button
            type="button"
            onClick={onGenerateScout}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Gerar scout da partida
          </button>
        </div>
      </div>

      {editing && (
        <ActionEditor
          action={editing}
          players={players}
          onSave={(updated) => {
            onUpdateAction(updated)
            setEditing(null)
          }}
          onDelete={(id) => {
            onDeleteAction(id)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {showRoster && (
        <RosterEditor
          players={players}
          onUpdatePlayer={onUpdatePlayer}
          onAddPlayer={onAddPlayer}
          onRemovePlayer={onRemovePlayer}
          onClose={() => setShowRoster(false)}
        />
      )}

      {showFormation && (
        <CourtFormation
          players={players}
          onUpdatePlayer={onUpdatePlayer}
          onAddPlayer={onAddPlayer}
          onRemovePlayer={onRemovePlayer}
          onClose={() => setShowFormation(false)}
        />
      )}
    </div>
  )
}
