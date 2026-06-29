"use client"

import { OptionButton, FaceHeading } from "./face-buttons"

interface Face1TeamProps {
  onSelect: (value: string) => void
  teamNames: string[]
}

export default function Face1Team({ onSelect, teamNames }: Face1TeamProps) {
  return (
    <div>
      <FaceHeading title="Equipe Sacadora" subtitle="Quem inicia o saque?" />
      <div className="grid grid-cols-2 gap-3">
        {teamNames.map((team) => (
          <OptionButton key={team} onClick={() => onSelect(team)} tone="primary">
            Equipe {team}
          </OptionButton>
        ))}
      </div>
    </div>
  )
}
