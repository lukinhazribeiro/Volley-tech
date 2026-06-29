"use client"

import { Button } from "@/components/scout/ui/button"

interface Face3ServeProps {
  onSelect: (value: string) => void
}

export default function Face3Serve({ onSelect }: Face3ServeProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Saque</h2>
      <div className="grid grid-cols-3 gap-4">
        <Button onClick={() => onSelect("+")} className="h-12 text-lg" variant="default">
          Certo
        </Button>
        <Button onClick={() => onSelect("ka")} className="h-12 text-lg" variant="default">
          ACE
        </Button>
        <Button onClick={() => onSelect("-")} className="h-12 text-lg" variant="default">
          Erro
        </Button>
      </div>
    </div>
  )
}
