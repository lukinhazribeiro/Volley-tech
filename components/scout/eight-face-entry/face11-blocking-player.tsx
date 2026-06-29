"use client"

import { NumberButton, FaceHeading } from "./face-buttons"

interface Face11BlockingPlayerProps {
  onSelect: (value: number | string) => void
  team: { name: string; players: number[] }
  context: string
}

export default function Face11BlockingPlayer({ onSelect, team, context }: Face11BlockingPlayerProps) {
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
