"use client"

import { OptionButton, FaceHeading } from "./face-buttons"

interface Face5PassQualityProps {
  onSelect: (value: string) => void
}

export default function Face5PassQuality({ onSelect }: Face5PassQualityProps) {
  return (
    <div>
      <FaceHeading title="Qualidade do Passe" subtitle="Avalie a recepção" />
      <div className="grid grid-cols-2 gap-3">
        <OptionButton onClick={() => onSelect("A")} tone="positive" subLabel="A">
          Bom
        </OptionButton>
        <OptionButton onClick={() => onSelect("B")} tone="info" subLabel="B">
          Regular
        </OptionButton>
        <OptionButton onClick={() => onSelect("C")} tone="warning" subLabel="C">
          Irregular
        </OptionButton>
        <OptionButton onClick={() => onSelect("D")} tone="negative" subLabel="D">
          Erro
        </OptionButton>
      </div>
      <OptionButton onClick={() => onSelect("R")} tone="warning" className="mt-3">
        Rebote de Passe
      </OptionButton>
    </div>
  )
}
