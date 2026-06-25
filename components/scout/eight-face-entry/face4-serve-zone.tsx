"use client"

import { Button } from "@/components/scout/ui/button"

interface Face4ServeZoneProps {
  onSelect: (value: string) => void
}

export default function Face4ServeZone({ onSelect }: Face4ServeZoneProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Zona de Recepção</h2>
      <div className="flex gap-4">
        {["7.5", "8.6", "9.1"].map((zone) => (
          <Button key={zone} onClick={() => onSelect(zone)} className="flex-1 h-12 text-lg" variant="default">
            {zone}
          </Button>
        ))}
      </div>
    </div>
  )
}
