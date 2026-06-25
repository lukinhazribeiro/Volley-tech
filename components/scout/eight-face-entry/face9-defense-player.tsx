"use client"

import { Button } from "@/components/scout/ui/button"

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
      <h2 className="text-lg font-semibold mb-4">{context}</h2>
      <div className="grid grid-cols-7 gap-2">
        {team.players.map((player) => (
          <Button key={player} onClick={() => onSelect(player)} className="h-10 text-base" variant="outline">
            {player}
          </Button>
        ))}
      </div>
    </div>
  )
}
