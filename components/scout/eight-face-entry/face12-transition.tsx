"use client"

import { Button } from "@/components/scout/ui/button"

interface Face12TransitionProps {
  onSelect: (value: string) => void
}

export default function Face12Transition({ onSelect }: Face12TransitionProps) {
  const transitions = [
    { id: "K1", label: "K1 - Recepção", description: "Transição após recepção" },
    { id: "K2", label: "K2 - Defesa", description: "Transição após defesa" },
    { id: "K3", label: "K3 - Continuidade", description: "Continuidade do rally" },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Tipo de Transição</h2>
        <p className="text-sm text-slate-600 mb-4">Selecione o tipo de transição para encerrar a ação</p>
      </div>
      <div className="space-y-3">
        {transitions.map((transition) => (
          <Button
            key={transition.id}
            onClick={() => onSelect(transition.id)}
            variant="default"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 flex flex-col items-center justify-center gap-1"
          >
            <span className="text-lg">{transition.label}</span>
            <span className="text-xs font-normal">{transition.description}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
