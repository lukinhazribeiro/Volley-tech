"use client"

import { Button } from "@/components/scout/ui/button"

interface Face2PlayerProps {
  onSelect: (value: number) => void
  team: { name: string; players: number[] }
  context: string
}

export default function Face2Player({ onSelect, team, context }: Face2PlayerProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">{context}</h2>
      <p className="text-sm text-slate-600 mb-4">{team.name}</p>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {team.players.map((player) => (
          <Button
            key={player}
            onClick={() => onSelect(player)}
            variant="default"
            className="h-16 text-2xl font-bold rounded-xl shadow-sm transition-transform active:scale-95"
          >
            {player}
          </Button>
        ))}
      </div>
    </div>
  )
}
