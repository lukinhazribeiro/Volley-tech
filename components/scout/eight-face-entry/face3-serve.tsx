"use client"

import { OptionButton, FaceHeading } from "./face-buttons"

interface Face3ServeProps {
  onSelect: (value: string) => void
}

export default function Face3Serve({ onSelect }: Face3ServeProps) {
  return (
    <div>
      <FaceHeading title="Saque" subtitle="Qual foi o resultado do saque?" />
      <div className="grid grid-cols-3 gap-3">
        <OptionButton onClick={() => onSelect("+")} tone="neutral">
          Certo
        </OptionButton>
        <OptionButton onClick={() => onSelect("ka")} tone="positive">
          ACE
        </OptionButton>
        <OptionButton onClick={() => onSelect("-")} tone="negative">
          Erro
        </OptionButton>
      </div>
    </div>
  )
}
