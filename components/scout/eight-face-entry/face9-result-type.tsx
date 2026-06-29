"use client"

import { OptionButton, FaceHeading } from "./face-buttons"

interface Face9ResultTypeProps {
  onSelect: (value: string) => void
}

export default function Face9ResultType({ onSelect }: Face9ResultTypeProps) {
  return (
    <div>
      <FaceHeading title="Resultado da Ação" subtitle="Como terminou o ataque" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <OptionButton onClick={() => onSelect("#")} tone="positive">
          Ponto
        </OptionButton>
        <OptionButton onClick={() => onSelect("!")} tone="negative">
          Erro
        </OptionButton>
        <OptionButton onClick={() => onSelect("+")} tone="primary">
          Bloqueio
        </OptionButton>
        <OptionButton onClick={() => onSelect("D")} tone="neutral">
          Defesa
        </OptionButton>
        <OptionButton onClick={() => onSelect("V")} tone="info">
          Volume
        </OptionButton>
        <OptionButton onClick={() => onSelect("REC")} tone="warning">
          Recuperação
        </OptionButton>
      </div>
    </div>
  )
}
