"use client"

import { Plus, Trash2, Users, X } from "lucide-react"
import type { Player, TeamSide } from "@/lib/video-scout/types"

interface RosterEditorProps {
  players: Player[]
  onUpdatePlayer: (player: Player) => void
  onAddPlayer: (team: TeamSide) => void
  onRemovePlayer: (id: string) => void
  onClose: () => void
}

const TEAM_LABEL: Record<TeamSide, string> = {
  casa: "Casa",
  adversario: "Adversário",
}

export function RosterEditor({
  players,
  onUpdatePlayer,
  onAddPlayer,
  onRemovePlayer,
  onClose,
}: RosterEditorProps) {
  const teams: TeamSide[] = ["casa", "adversario"]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Editar elenco"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-800 p-5">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" aria-hidden="true" />
            <div>
              <h3 className="text-base font-semibold text-slate-100">Editar elenco</h3>
              <p className="text-xs text-slate-400">
                Corrija os números e a equipe (Casa/Adversário) de cada atleta.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {teams.map((team) => {
            const list = players
              .filter((p) => p.team === team)
              .sort((a, b) => a.number - b.number)
            return (
              <div key={team}>
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      team === "casa"
                        ? "bg-blue-500/15 text-blue-300"
                        : "bg-orange-500/15 text-orange-300"
                    }`}
                  >
                    {TEAM_LABEL[team]} · {list.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAddPlayer(team)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Adicionar atleta
                  </button>
                </div>

                {list.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-800 py-4 text-center text-xs text-slate-500">
                    Nenhum atleta nesta equipe.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {list.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-800/40 p-2"
                      >
                        <div className="flex flex-col">
                          <label
                            htmlFor={`num-${p.id}`}
                            className="px-1 text-[10px] uppercase text-slate-500"
                          >
                            Nº
                          </label>
                          <input
                            id={`num-${p.id}`}
                            type="number"
                            min={0}
                            max={99}
                            value={p.number}
                            onChange={(e) =>
                              onUpdatePlayer({
                                ...p,
                                number: Math.max(0, Math.min(99, Number(e.target.value) || 0)),
                              })
                            }
                            className="w-16 rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-center text-sm font-bold tabular-nums text-slate-100 outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="flex flex-1 flex-col">
                          <label
                            htmlFor={`name-${p.id}`}
                            className="px-1 text-[10px] uppercase text-slate-500"
                          >
                            Nome
                          </label>
                          <input
                            id={`name-${p.id}`}
                            type="text"
                            value={p.name}
                            onChange={(e) => onUpdatePlayer({ ...p, name: e.target.value })}
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="flex flex-col">
                          <label
                            htmlFor={`team-${p.id}`}
                            className="px-1 text-[10px] uppercase text-slate-500"
                          >
                            Equipe
                          </label>
                          <select
                            id={`team-${p.id}`}
                            value={p.team}
                            onChange={(e) =>
                              onUpdatePlayer({ ...p, team: e.target.value as TeamSide })
                            }
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-blue-500"
                          >
                            <option value="casa">Casa</option>
                            <option value="adversario">Adversário</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemovePlayer(p.id)}
                          className="mt-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-500/15 hover:text-red-300"
                          aria-label={`Remover atleta ${p.number}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>

        <div className="border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  )
}
