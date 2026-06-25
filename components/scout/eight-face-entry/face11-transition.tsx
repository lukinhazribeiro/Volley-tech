"use client"

import { Button } from "@/components/scout/ui/button"

interface Face11TransitionProps {
  onSelect: (value: string) => void
}

export default function Face11Transition({ onSelect }: Face11TransitionProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Transição</h2>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "K1 (Side-out)", value: "K1" },
          { label: "K2 (Contra-ataque)", value: "K2" },
          { label: "K3 (Rally)", value: "K3" },
        ].map(({ label, value }) => (
          <Button key={value} onClick={() => onSelect(value)} className="h-12" variant="default">
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
