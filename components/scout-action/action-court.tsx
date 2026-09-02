"use client"

import { ROLE_LABEL } from "@/lib/video-scout/types"
import type { CourtCell } from "@/lib/scout-action/live"
import type { ActionSide } from "@/lib/scout-action/types"
import { BroadcastCourt, type BroadcastCourtCell } from "@/components/shared/broadcast-court"

interface ActionCourtProps {
  nameA: string
  nameB: string
  cellsA: CourtCell[]
  cellsB: CourtCell[]
  serving: ActionSide | null
  /** Toque num jogador em quadra (para substituição). */
  onPlayerTap?: (side: ActionSide, playerId: string) => void
}

// Converte a célula do Scout Action para o formato genérico da quadra
// compartilhada (traduzindo a função para o rótulo já legível).
function toBroadcastCell(cell: CourtCell): BroadcastCourtCell {
  return {
    posicao: cell.posicao,
    player: cell.player
      ? { id: cell.player.id, number: cell.player.number, name: cell.player.name }
      : null,
    roleLabel: cell.player?.role ? ROLE_LABEL[cell.player.role] : undefined,
    isLibero: cell.isLibero,
    isSetter: cell.isSetter,
  }
}

/** Quadra horizontal (estilo transmissão) com as duas equipes lado a lado. */
export function ActionCourt({ nameA, nameB, cellsA, cellsB, serving, onPlayerTap }: ActionCourtProps) {
  return (
    <BroadcastCourt
      nameA={nameA}
      nameB={nameB}
      cellsA={cellsA.map(toBroadcastCell)}
      cellsB={cellsB.map(toBroadcastCell)}
      serving={serving}
      onPlayerTap={onPlayerTap as ((side: "A" | "B", playerId: string) => void) | undefined}
    />
  )
}
