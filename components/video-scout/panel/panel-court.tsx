"use client"

import { ROLE_LABEL, type Posicao } from "@/lib/video-scout/types"
import { effectiveFormation, findPlayer, type TeamConfig } from "@/lib/video-scout/match"

// Disposição das posições (visão de transmissão), igual ao Scout Action.
// Equipe A (metade esquerda): fundo P5/P6/P1 (externa) · rede P4/P3/P2 (centro).
const A_COLS: Posicao[][] = [
  ["P5", "P6", "P1"],
  ["P4", "P3", "P2"],
]
// Equipe B espelhada por rotação de 180°: rede P2/P3/P4 (centro) · fundo P1/P6/P5.
const B_COLS: Posicao[][] = [
  ["P2", "P3", "P4"],
  ["P1", "P6", "P5"],
]

interface CourtCell {
  posicao: Posicao
  number: number | null
  name: string
  role: string
  isLibero: boolean
  isSetter: boolean
}

/** Constrói as 6 células da equipe a partir da formação efetiva (com líbero). */
function buildCells(team: TeamConfig, isServing: boolean): Record<Posicao, CourtCell> {
  const eff = effectiveFormation(team, isServing)
  const out = {} as Record<Posicao, CourtCell>
  for (const pos of Object.keys(eff) as Posicao[]) {
    const info = eff[pos]
    const player = findPlayer(team, info.playerId)
    out[pos] = {
      posicao: pos,
      number: player?.number ?? null,
      name: player?.name ?? "",
      role: info.isLibero ? "Líbero" : player?.role ? ROLE_LABEL[player.role] : "",
      isLibero: info.isLibero,
      isSetter: !info.isLibero && player?.role === "levantador",
    }
  }
  return out
}

function PlayerToken({ cell, side }: { cell: CourtCell; side: "A" | "B" }) {
  const base = side === "A" ? "border-sky-300 bg-sky-700" : "border-orange-300 bg-orange-600"
  return (
    <span className="flex select-none flex-col items-center gap-0.5">
      <span
        className={[
          "relative flex size-10 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums text-white shadow-lg sm:size-12",
          cell.isLibero ? "border-amber-300 bg-amber-500" : base,
          cell.isSetter ? "ring-2 ring-emerald-300 ring-offset-2 ring-offset-orange-700" : "",
        ].join(" ")}
      >
        <span className="absolute -left-2 -top-2 rounded bg-slate-950/90 px-1 text-[9px] font-bold text-slate-200">
          {cell.posicao}
        </span>
        {cell.number ?? "—"}
        {cell.isSetter && (
          <span className="absolute -bottom-2 rounded bg-emerald-500 px-1 text-[8px] font-bold text-white">
            LEV
          </span>
        )}
      </span>
      <span className="max-w-[64px] truncate text-center text-[9px] font-medium uppercase tracking-wide text-white/90">
        {cell.role}
      </span>
    </span>
  )
}

function CourtHalf({
  side,
  cells,
  cols,
}: {
  side: "A" | "B"
  cells: Record<Posicao, CourtCell>
  cols: Posicao[][]
}) {
  return (
    <div className="flex flex-1 gap-2 sm:gap-4">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-1 flex-col justify-around gap-2 py-1">
          {col.map((pos) => (
            <div key={pos} className="flex justify-center">
              <PlayerToken cell={cells[pos]} side={side} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

interface PanelCourtProps {
  teamA: TeamConfig
  teamB: TeamConfig
  /** Equipe que detém o saque ("casa" = A, "adversario" = B, null = A por padrão). */
  servingTeam: "casa" | "adversario" | null
}

/** Quadra horizontal (estilo transmissão) com as duas equipes lado a lado. */
export function PanelCourt({ teamA, teamB, servingTeam }: PanelCourtProps) {
  const aServing = servingTeam === null ? true : servingTeam === "casa"
  const bServing = servingTeam === "adversario"
  const cellsA = buildCells(teamA, aServing)
  const cellsB = buildCells(teamB, bServing)

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-200 bg-white p-3 shadow-sm">
      {/* Faixas com nome das equipes */}
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-widest">
        <span className="flex items-center gap-1.5 truncate rounded-full bg-blue-50 px-3 py-1 text-blue-700">
          {aServing && <span className="size-2 rounded-full bg-blue-500" aria-hidden />}
          <span className="truncate">{teamA.name}</span>
        </span>
        <span className="flex items-center gap-1.5 truncate rounded-full bg-orange-50 px-3 py-1 text-orange-700">
          <span className="truncate">{teamB.name}</span>
          {bServing && <span className="size-2 rounded-full bg-orange-500" aria-hidden />}
        </span>
      </div>

      {/* Quadra em perspectiva */}
      <div className="[perspective:900px]">
        <div className="rounded-lg [transform:rotateX(14deg)]">
          <div className="relative flex rounded-lg bg-gradient-to-b from-orange-500 to-orange-700 p-2 shadow-inner ring-1 ring-orange-900/40 sm:p-3">
            <div
              className="pointer-events-none absolute inset-2 rounded border border-white/40 sm:inset-3"
              aria-hidden
            />
            <CourtHalf side="A" cells={cellsA} cols={A_COLS} />

            {/* Rede vertical ao centro */}
            <div className="relative z-10 mx-1 flex flex-col items-center justify-center">
              <div className="h-full w-1 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.9)_0_4px,transparent_4px_8px)]" />
            </div>

            <CourtHalf side="B" cells={cellsB} cols={B_COLS} />
          </div>
        </div>
      </div>
    </div>
  )
}
