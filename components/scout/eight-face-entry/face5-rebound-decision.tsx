"use client"

import { OptionButton, FaceHeading } from "./face-buttons"

interface Face5ReboundDecisionProps {
  onSelect: (value: string) => void
  teamAName: string
  teamBName: string
}

export default function Face5ReboundDecision({ onSelect, teamAName, teamBName }: Face5ReboundDecisionProps) {
  return (
    <div>
      <FaceHeading title="Resultado do Rebote" subtitle="O rebote foi defendido ou resultou em ponto direto?" />
      <div className="grid grid-cols-1 gap-3">
        <OptionButton onClick={() => onSelect("DEF")} tone="warning">
          Defesa da equipe contrária
        </OptionButton>
        <OptionButton onClick={() => onSelect("A")} tone="primary">
          Ponto de {teamAName}
        </OptionButton>
        <OptionButton onClick={() => onSelect("B")} tone="primary">
          Ponto de {teamBName}
        </OptionButton>
      </div>
    </div>
  )
}
