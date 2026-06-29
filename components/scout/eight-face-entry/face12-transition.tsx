"use client"

import { OptionButton, FaceHeading } from "./face-buttons"

interface Face12TransitionProps {
  onSelect: (value: string) => void
}

export default function Face12Transition({ onSelect }: Face12TransitionProps) {
  const transitions = [
    { id: "K1", label: "K1 - Recepção", description: "Transição após recepção" },
    { id: "K2", label: "K2 - Defesa", description: "Transição após defesa" },
    { id: "K3", label: "K3 - Continuidade", description: "Continuidade do rally" },
  ]

  return (
    <div>
      <FaceHeading title="Tipo de Transição" subtitle="Selecione o tipo de transição para encerrar a ação" />
      <div className="grid grid-cols-1 gap-3">
        {transitions.map((transition) => (
          <OptionButton
            key={transition.id}
            onClick={() => onSelect(transition.id)}
            tone="positive"
            subLabel={transition.description}
          >
            {transition.label}
          </OptionButton>
        ))}
      </div>
    </div>
  )
}
