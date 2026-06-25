"use client"

import { useState } from "react"
import { LayoutGrid, Plus, Trash2, X } from "lucide-react"
import {
  POSICAO_INFO,
  TEAM_LABEL,
  TEAM_STYLE,
  type Player,
  type Posicao,
  type TeamSide,
} from "@/lib/video-scout/types"

interface CourtFormationProps {
  players: Player[]
  onUpdatePlayer: (player: Player) => void
  onAddPlayer: (team: TeamSide) => void
  onRemovePlayer: (id: string) => void
  onClose: () => void
}

// Disposição na quadra: rede em cima (P4, P3, P2), fundo embaixo (P5, P6, P1).
const LINHA_REDE: Posicao[] = ["P4", "P3", "P2"]
const LINHA_FUNDO: Posicao[] = ["P5", "P6", "P1"]

export function CourtFormation({
  players,
  onUpdatePlayer,
  onAddPlayer,
  onRemovePlayer,
  onClose,
}: CourtFormationProps) {
  const [team, setTeam] = useState<TeamSide>("casa")

  const teamPlayers = players.filter((p) => p.team === team)
  const reservas = teamPlayers.filter((p) => !p.posicao)
  const accent = TEAM_STYLE[team].hex

  function playerAt(pos: Posicao): Player | undefined {
    return teamPlayers.find((p) => p.posicao === pos)
  }

  /** Coloca um atleta numa posição, liberando quem estava lá. */
  function assign(pos: Posicao, playerId: string) {
    const occupant = teamPlayers.find((p) => p.posicao === pos)
    if (occupant && occupant.id !== playerId) {
      onUpdatePlayer({ ...occupant, posicao: null })
    }
    const target = players.find((p) => p.id === playerId)
    if (target) onUpdatePlayer({ ...target, posicao: pos })
  }

  function clearPos(pos: Posicao) {
    const occupant = teamPlayers.find((p) => p.posicao === pos)
    if (occupant) onUpdatePlayer({ ...occupant, posicao: null })
  }

  function setNumber(p: Player, value: string) {
    onUpdatePlayer({ ...p, number: Math.max(0, Math.min(99, Number(value) || 0)) })
  }

  function Slot({ pos }: { pos: Posicao }) {
    const occ = playerAt(pos)
    const info = POSICAO_INFO[pos]
    return (
      <div className="rounded-xl border-2 border-orange-100 bg-white p-2 shadow-sm">
        <div className="flex items-center justify-between">
          <span
            className="rounded px-1.5 py-0.5 text-[11px] font-bold text-white"
            style={{ background: accent }}
          >
            {pos}
            {pos === "P1" ? " • Saque" : ""}
          </span>
          {occ && (
            <button
              type="button"
              onClick={() => clearPos(pos)}
              className="text-slate-400 hover:text-red-500"
              aria-label={`Tirar atleta da posição ${pos}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <p className="mt-0.5 text-[10px] text-slate-400">{info.zona}</p>

        {occ ? (
          <div className="mt-1 flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={99}
              value={occ.number}
              onChange={(e) => setNumber(occ, e.target.value)}
              className="w-12 rounded-md border border-slate-300 px-1 py-1 text-center text-lg font-extrabold tabular-nums text-slate-800 outline-none focus:border-orange-400"
              aria-label={`Número do atleta em ${pos}`}
            />
            <span className="truncate text-xs font-medium text-slate-600">{occ.name}</span>
          </div>
        ) : (
          <p className="mt-2 text-center text-[11px] text-slate-400">Vazio</p>
        )}

        {/* Seleção / substituição */}
        <select
          value={occ?.id ?? ""}
          onChange={(e) => (e.target.value ? assign(pos, e.target.value) : clearPos(pos))}
          className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-1 py-1 text-[11px] text-slate-700 outline-none focus:border-orange-400"
          aria-label={`Definir atleta na posição ${pos}`}
        >
          <option value="">— escolher —</option>
          {teamPlayers.map((p) => (
            <option key={p.id} value={p.id}>
              #{p.number} {p.name}
              {p.posicao && p.posicao !== pos ? ` (${p.posicao})` : ""}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Formação em quadra"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-orange-100 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-orange-100 p-5">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-orange-600" aria-hidden="true" />
            <div>
              <h3 className="text-base font-semibold text-slate-800">Formação em quadra</h3>
              <p className="text-xs text-slate-500">
                Posicione os atletas por número. P1 é o saque; P4/P3/P2 na rede; P5/P6/P1 no fundo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Alternar equipe */}
          <div className="flex gap-2">
            {(["casa", "adversario"] as TeamSide[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTeam(t)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  team === t
                    ? "border-orange-400 bg-orange-50 text-orange-700"
                    : "border-slate-200 text-slate-500 hover:text-slate-700"
                }`}
              >
                {TEAM_LABEL[t]}
              </button>
            ))}
          </div>

          {/* Quadra */}
          <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
            {/* Rede */}
            <div className="mb-1 flex items-center gap-2">
              <div className="h-1 flex-1 rounded bg-orange-300" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
                Rede
              </span>
              <div className="h-1 flex-1 rounded bg-orange-300" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LINHA_REDE.map((pos) => (
                <Slot key={pos} pos={pos} />
              ))}
            </div>
            <div className="my-2 border-t border-dashed border-orange-200" />
            <div className="grid grid-cols-3 gap-2">
              {LINHA_FUNDO.map((pos) => (
                <Slot key={pos} pos={pos} />
              ))}
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              Linha de fundo (saque em P1)
            </p>
          </div>

          {/* Reservas / banco */}
          <div className="rounded-xl border border-orange-100 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ background: `${accent}22`, color: accent }}
              >
                Reservas ({reservas.length})
              </span>
              <button
                type="button"
                onClick={() => onAddPlayer(team)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Adicionar atleta
              </button>
            </div>

            {reservas.length === 0 ? (
              <p className="py-2 text-center text-xs text-slate-400">
                Todos os atletas desta equipe estão em quadra.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {reservas.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5"
                  >
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={p.number}
                      onChange={(e) => setNumber(p, e.target.value)}
                      className="w-12 rounded-md border border-slate-300 px-1 py-1 text-center text-sm font-bold tabular-nums text-slate-800 outline-none focus:border-orange-400"
                      aria-label={`Número de ${p.name}`}
                    />
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => onUpdatePlayer({ ...p, name: e.target.value })}
                      className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 outline-none focus:border-orange-400"
                      aria-label={`Nome de ${p.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => onRemovePlayer(p.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
                      aria-label={`Remover ${p.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] text-slate-400">
              Para substituir, escolha o reserva no menu da posição desejada na quadra.
            </p>
          </div>
        </div>

        <div className="border-t border-orange-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  )
}
