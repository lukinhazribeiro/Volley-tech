"use client"

import { Button } from "@/components/scout/ui/button"

interface Face5ReboundDecisionProps {
  onSelect: (value: string) => void
  teamAName: string
  teamBName: string
}

export default function Face5ReboundDecision({ onSelect, teamAName, teamBName }: Face5ReboundDecisionProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Resultado do Rebote</h2>
      <p className="text-sm text-muted-foreground mb-4">
        O rebote foi defendido ou resultou em ponto direto?
      </p>
      <div className="grid grid-cols-1 gap-4">
        <Button
          onClick={() => onSelect("DEF")}
          className="h-12 text-lg bg-amber-500 hover:bg-amber-600 text-white"
        >
          Defesa da equipe contrária
        </Button>
        <Button onClick={() => onSelect("A")} className="h-12 text-lg" variant="default">
          Ponto de {teamAName}
        </Button>
        <Button onClick={() => onSelect("B")} className="h-12 text-lg" variant="default">
          Ponto de {teamBName}
        </Button>
      </div>
    </div>
  )
}
