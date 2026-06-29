"use client"

import { OptionButton, FaceHeading } from "./face-buttons"

interface Face8AttackPositionProps {
  onSelect: (value: string) => void
}

export default function Face8AttackPosition({ onSelect }: Face8AttackPositionProps) {
  return (
    <div>
      <FaceHeading title="Posição de Ataque" subtitle="De onde veio o ataque" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Ponta", value: "P" },
          { label: "Meio", value: "M" },
          { label: "Oposto", value: "O" },
          { label: "Fundo", value: "F" },
          { label: "Segunda", value: "S" },
        ].map(({ label, value }) => (
          <OptionButton key={value} onClick={() => onSelect(value)} tone="primary">
            {label}
          </OptionButton>
        ))}
      </div>
      <OptionButton onClick={() => onSelect("ERR_LEV")} tone="negative" className="mt-3">
        Erro de Levantamento
      </OptionButton>
    </div>
  )
}
