"use client"

import { Button } from "@/components/scout/ui/button"

interface Face1TeamProps {
  onSelect: (value: string) => void
  teamNames: string[]
}

export default function Face1Team({ onSelect, teamNames }: Face1TeamProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Equipe Sacadora</h2>
      <div className="flex gap-4">
        {teamNames.map((team) => (
          <Button key={team} onClick={() => onSelect(team)} className="flex-1 h-12 text-lg">
            Equipe {team}
          </Button>
        ))}
      </div>
    </div>
  )
}
