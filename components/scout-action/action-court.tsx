"use client"

import { ROLE_LABEL } from "@/lib/video-scout/types"
import type { CourtCell } from "@/lib/scout-action/live"
import type { ActionSide } from "@/lib/scout-action/types"

// Disposição na meia-quadra: coluna da rede (frente) e coluna de fundo.
// Frente: P4 (fundo do campo visual, cima), P3, P2. Fundo: P5, P6, P1.
const NET_COL = ["P4", "P3", "P2"] as const
const BACK_COL = ["P5", "P6", "P1"] as const

interface ActionCourtProps {
  nameA: string
  nameB: string
  cellsA: CourtCell[]
  cellsB: CourtCell[]
  serving: ActionSide | null
  /** Toque num jogador em quadra (para substituição). */
  onPlayerTap?: (side: ActionSide, playerId: string) => void
}

function PlayerToken({
  cell,
  side,
  onTap,
}: {
  cell: CourtCell
  side: ActionSide
  onTap?: () => void
}) {
  const base =
    side === "A"
      ? "border-sky-300 bg-sky-700"
      : "border-orange-300 bg-orange-600"
  const label = cell.isLibero ? "Líbero" : cell.player?.role ? ROLE_LABEL[cell.player.role] : ""

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!onTap}
      aria-label={`${cell.posicao} · ${cell.player ? `número ${cell.player.number} ${cell.player.name}` : "vazio"}${onTap ? " · tocar para substituir" : ""}`}
      className="group flex select-none flex-col items-center gap-0.5 outline-none disabled:cursor-default"
    >
      <span className="relative flex flex-col items-center">
        <span
          className={[
            "relative flex size-10 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums text-white shadow-lg transition sm:size-12",
            cell.isLibero ? "border-amber-300 bg-amber-500" : base,
            cell.isSetter ? "ring-2 ring-emerald-300 ring-offset-2 ring-offset-orange-700" : "",
            onTap ? "group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-white" : "",
          ].join(" ")}
        >
          <span className="absolute -top-2 -left-2 rounded bg-slate-950/90 px-1 text-[9px] font-bold text-slate-200">
            {cell.posicao}
          </span>
          {cell.player ? cell.player.number : "—"}
          {cell.isSetter && !cell.isLibero && (
            <span className="absolute -bottom-2 rounded bg-emerald-500 px-1 text-[8px] font-bold text-white">
              LEV
            </span>
          )}
        </span>
      </span>
      <span className="max-w-[64px] truncate text-center text-[9px] font-medium uppercase tracking-wide text-white/90">
        {label}
      </span>
    </button>
  )
}

function CourtHalf({
  side,
  cells,
  mirrored,
  onPlayerTap,
}: {
  side: ActionSide
  cells: CourtCell[]
  mirrored?: boolean
  onPlayerTap?: (side: ActionSide, playerId: string) => void
}) {
  const byPos = (pos: string) => cells.find((c) => c.posicao === pos)!
  // Coluna mais próxima da rede fica no lado interno (perto do centro).
  const cols = mirrored ? [BACK_COL, NET_COL] : [NET_COL, BACK_COL]

  return (
    <div className="flex flex-1 gap-2 sm:gap-4">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-1 flex-col justify-around gap-2 py-1">
          {col.map((pos) => {
            const cell = byPos(pos)
            return (
              <div key={pos} className="flex justify-center">
                <PlayerToken
                  cell={cell}
                  side={side}
                  onTap={
                    onPlayerTap && cell.player
                      ? () => onPlayerTap(side, cell.player!.id)
                      : undefined
                  }
                />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** Quadra horizontal (estilo transmissão) com as duas equipes lado a lado. */
export function ActionCourt({ nameA, nameB, cellsA, cellsB, serving, onPlayerTap }: ActionCourtProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/60 p-2 sm:p-3">
      {/* Faixas com nome das equipes */}
      <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest">
        <span className="flex items-center gap-1 truncate rounded bg-sky-500/15 px-2 py-1 text-sky-300">
          {serving === "A" && <span className="size-1.5 rounded-full bg-sky-400" aria-hidden />}
          <span className="truncate">{nameA}</span>
        </span>
        <span className="flex items-center gap-1 truncate rounded bg-orange-500/15 px-2 py-1 text-orange-300">
          <span className="truncate">{nameB}</span>
          {serving === "B" && <span className="size-1.5 rounded-full bg-orange-400" aria-hidden />}
        </span>
      </div>

      {/* Quadra em perspectiva */}
      <div className="[perspective:900px]">
        <div className="[transform:rotateX(14deg)] rounded-lg">
          <div className="relative flex rounded-lg bg-gradient-to-b from-orange-500 to-orange-700 p-2 shadow-inner ring-1 ring-orange-900/40 sm:p-3">
            {/* Linhas de fundo/laterais */}
            <div className="pointer-events-none absolute inset-2 rounded border border-white/40 sm:inset-3" aria-hidden />
            <CourtHalf side="A" cells={cellsA} onPlayerTap={onPlayerTap} />

            {/* Rede vertical ao centro */}
            <div className="relative z-10 mx-1 flex flex-col items-center justify-center">
              <div className="h-full w-1 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.9)_0_4px,transparent_4px_8px)]" />
            </div>

            <CourtHalf side="B" cells={cellsB} mirrored onPlayerTap={onPlayerTap} />
          </div>
        </div>
      </div>
    </div>
  )
}
