"use client"

import { Button } from "@/components/scout/ui/button"

interface Face5PassQualityProps {
  onSelect: (value: string) => void
}

export default function Face5PassQuality({ onSelect }: Face5PassQualityProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Qualidade do Passe</h2>
      <div className="grid grid-cols-2 gap-4">
        <Button onClick={() => onSelect("A")} className="h-12 text-lg" variant="default">
          Bom
        </Button>
        <Button onClick={() => onSelect("B")} className="h-12 text-lg" variant="default">
          Regular
        </Button>
        <Button onClick={() => onSelect("C")} className="h-12 text-lg" variant="default">
          Irregular
        </Button>
        <Button onClick={() => onSelect("D")} className="h-12 text-lg" variant="default">
          Erro
        </Button>
      </div>
      <Button
        onClick={() => onSelect("R")}
        className="h-12 text-lg w-full mt-4 bg-amber-500 hover:bg-amber-600 text-white"
      >
        Rebote de Passe
      </Button>
    </div>
  )
}
