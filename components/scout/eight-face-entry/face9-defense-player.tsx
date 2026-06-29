"use client"

import { NumberButton, FaceHeading } from "./face-buttons"

interface Face9DefensePlayerProps {
  onSelect: (value: number) => void
  team: {
    name: string
    players: number[]
  }
  context: string
}

export default function Face9DefensePlayer({ onSelect, team, context }: Face9DefensePlayerProps) {
  return (
    <div>
      <FaceHeading title={context} subtitle={team.name} />
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 sm:gap-3">
        {team.players.map((player) => (
          <NumberButton key={player} value={player} onClick={() => onSelect(player)} />
        ))}
      </div>
    </div>
  )
}
