"use client"

import { Button } from "@/components/scout/ui/button"

interface Face9ResultTypeProps {
  onSelect: (value: string) => void
}

export default function Face9ResultType({ onSelect }: Face9ResultTypeProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Resultado da Ação</h2>
      <div className="grid grid-cols-2 gap-4">
        <Button onClick={() => onSelect("#")} className="h-12 text-lg" variant="default">
          Ponto
        </Button>
        <Button onClick={() => onSelect("!")} className="h-12 text-lg" variant="default">
          Erro
        </Button>
        <Button onClick={() => onSelect("+")} className="h-12 text-lg" variant="default">
          Bloqueio
        </Button>
        <Button onClick={() => onSelect("D")} className="h-12 text-lg" variant="default">
          Defesa
        </Button>
        <Button
          onClick={() => onSelect("V")}
          className="h-12 text-lg bg-sky-600 hover:bg-sky-700 text-white"
        >
          Volume
        </Button>
        <Button
          onClick={() => onSelect("REC")}
          className="h-12 text-lg bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Recuperação
        </Button>
      </div>
    </div>
  )
}
