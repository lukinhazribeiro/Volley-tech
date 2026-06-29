"use client"

import { OptionButton, FaceHeading } from "./face-buttons"

interface Face7AttackingTeamProps {
  onSelect: (value: string) => void
  teamNames: string[]
}

export default function Face7AttackingTeam({ onSelect, teamNames }: Face7AttackingTeamProps) {
  return (
    <div>
      <FaceHeading title="Equipe Atacante" subtitle="Quem realizou o ataque?" />
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
