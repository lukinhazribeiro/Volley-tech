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
      <div className="grid grid-cols-5 gap-2">
        {team.players.map((player) => (
          <Button key={player} onClick={() => onSelect(player)} variant="default" className="h-10">
            {player}
          </Button>
        ))}
      </div>
    </div>
  )
}
