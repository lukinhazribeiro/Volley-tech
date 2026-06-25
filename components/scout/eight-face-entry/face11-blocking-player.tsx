"use client"

import { Button } from "@/components/scout/ui/button"

interface Face11BlockingPlayerProps {
  onSelect: (value: number | string) => void
  team: { name: string; players: number[] }
  context: string
}

export default function Face11BlockingPlayer({ onSelect, team, context }: Face11BlockingPlayerProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{context}</h2>
        <p className="text-sm text-slate-600 mb-4">Time {team.name}</p>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {team.players.map((player) => (
          <Button
            key={player}
            onClick={() => onSelect(player)}
            variant="default"
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
          >
            {player}
          </Button>
        ))}
      </div>
    </div>
  )
}
