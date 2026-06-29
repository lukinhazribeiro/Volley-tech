"use client"

import { OptionButton, FaceHeading } from "./face-buttons"

interface Face11TransitionProps {
  onSelect: (value: string) => void
}

export default function Face11Transition({ onSelect }: Face11TransitionProps) {
  return (
    <div>
      <FaceHeading title="Transição" subtitle="Tipo de transição do rally" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "K1", sub: "Side-out", value: "K1" },
          { label: "K2", sub: "Contra-ataque", value: "K2" },
          { label: "K3", sub: "Rally", value: "K3" },
        ].map(({ label, sub, value }) => (
          <OptionButton key={value} onClick={() => onSelect(value)} tone="primary" subLabel={sub}>
            {label}
          </OptionButton>
        ))}
      </div>
    </div>
  )
}
