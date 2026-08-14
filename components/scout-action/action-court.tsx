"use client"

import { ROLE_LABEL } from "@/lib/video-scout/types"
import type { CourtCell } from "@/lib/scout-action/live"
import type { ActionSide } from "@/lib/scout-action/types"

// Disposição na meia-quadra: linha da rede (P4/P3/P2) e linha de fundo (P5/P6/P1).
const NET_ROW = ["P4", "P3", "P2"] as const
const BACK_ROW = ["P5", "P6", "P1"] as const

interface CourtHalfProps {
  side: ActionSide
  name: string
  cells: CourtCell[]
  /** Meia-quadra espelhada (rede à esquerda) para a equipe da direita. */
  mirrored?: boolean
}

function Circle({ cell }: { cell: CourtCell }) {
  const isBlue = !cell.isLibero
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={[
          "relative flex size-11 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums shadow-md sm:size-12",
          cell.isLibero
            ? "border-amber-300 bg-amber-500 text-white"
            : "border-sky-300 bg-sky-700 text-white",
          cell.isSetter ? "ring-2 ring-emerald-300 ring-offset-2 ring-offset-slate-900" : "",
        ].join(" ")}
        title={`${cell.posicao} · ${cell.player ? `#${cell.player.number} ${cell.player.name}` : "—"}`}
      >
        <span className="absolute -top-1.5 -left-1.5 rounded bg-slate-900 px-1 text-[9px] font-bold text-sky-200">
          {cell.posicao}
        </span>
        {cell.player ? cell.player.number : "—"}
        {isBlue && cell.isSetter && (
          <span className="absolute -bottom-1.5 rounded bg-emerald-500 px-1 text-[8px] font-bold text-white">
            LEV
          </span>
        )}
      </div>
      <span className="max-w-[60px] truncate text-center text-[9px] uppercase tracking-wide text-slate-400">
        {cell.isLibero ? "Líbero" : cell.player?.role ? ROLE_LABEL[cell.player.role] : ""}
      </span>
    </div>
  )
}

function CourtHalf({ side, name, cells, mirrored }: CourtHalfProps) {
  const byPos = (pos: string) => cells.find((c) => c.posicao === pos)!
  const rows = mirrored ? [BACK_ROW, NET_ROW] : [NET_ROW, BACK_ROW]
  const accent = side === "A" ? "text-sky-300" : "text-orange-300"

  return (
    <div className="flex-1">
      <p className={`mb-1 text-center text-[10px] font-bold uppercase tracking-widest ${accent}`}>
        {name}
      </p>
      <div className="rounded-lg bg-gradient-to-b from-orange-500/80 to-orange-600/70 p-2 shadow-inner">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-3 place-items-center gap-1 py-1.5">
            {row.map((pos) => (
              <Circle key={pos} cell={byPos(pos)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

interface ActionCourtProps {
  nameA: string
  nameB: string
  cellsA: CourtCell[]
  cellsB: CourtCell[]
  serving: ActionSide | null
}

/** Quadra em visão superior com as duas equipes (P1–P6 + funções). */
export function ActionCourt({ nameA, nameB, cellsA, cellsB, serving }: ActionCourtProps) {
  return (
    <div className="flex items-stretch gap-1 rounded-xl border border-slate-700 bg-slate-900/60 p-2">
      <CourtHalf side="A" name={nameA} cells={cellsA} />
      {/* Rede */}
      <div className="flex flex-col items-center justify-center px-1">
        <div className="h-full w-0.5 bg-slate-500" />
        <span className="my-1 rotate-0 text-[8px] font-bold uppercase text-slate-500">rede</span>
        <div className="h-full w-0.5 bg-slate-500" />
      </div>
      <CourtHalf side="B" name={nameB} cells={cellsB} mirrored />
      {serving && (
        <span className="sr-only">{serving === "A" ? nameA : nameB} sacando</span>
      )}
    </div>
  )
}
