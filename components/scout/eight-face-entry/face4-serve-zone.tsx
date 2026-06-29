"use client"

import { OptionButton, FaceHeading } from "./face-buttons"

interface Face4ServeZoneProps {
  onSelect: (value: string) => void
}

export default function Face4ServeZone({ onSelect }: Face4ServeZoneProps) {
  return (
    <div>
      <FaceHeading title="Zona de Recepção" subtitle="Onde a bola foi recebida" />
      <div className="grid grid-cols-3 gap-3">
        {["7.5", "8.6", "9.1"].map((zone) => (
          <OptionButton key={zone} onClick={() => onSelect(zone)} tone="info">
            {zone}
          </OptionButton>
        ))}
      </div>
    </div>
  )
}
