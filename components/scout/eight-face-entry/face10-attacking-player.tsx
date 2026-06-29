"use client"

import { NumberButton, FaceHeading } from "./face-buttons"

interface Face10AttackingPlayerProps {
  onSelect: (value: number) => void
  team: { name: string; players: number[] }
  context: string
}

export default function Face10AttackingPlayer({ onSelect, team, context }: Face10AttackingPlayerProps) {
  return (
    <div>
      <FaceHeading title={context} subtitle={`Time ${team.name}`} />
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 sm:gap-3">
        {team.players.map((player) => (
          <NumberButton key={player} value={player} onClick={() => onSelect(player)} />
        ))}
      </div>
    </div>
  )
}
