"use client"

import { Info, Flag, Send, ShieldAlert, TriangleAlert } from "lucide-react"
import type { OpponentGeneralKind } from "@/lib/video-scout/match"

const BUTTONS: {
  kind: OpponentGeneralKind
  label: string
  icon: typeof Flag
  className: string
}[] = [
  {
    kind: "ponto",
    label: "Ponto adversário",
    icon: Flag,
    className: "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100",
  },
  {
    kind: "acao",
    label: "Ação adversário",
    icon: ShieldAlert,
    className: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  },
  {
    kind: "erro",
    label: "Erro adversário",
    icon: TriangleAlert,
    className: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  },
  {
    kind: "saque",
    label: "Saque adversário",
    icon: Send,
    className: "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100",
  },
]

interface PanelOpponentProps {
  teamName: string
  onRecord: (kind: OpponentGeneralKind) => void
}

/** Registro GERAL da equipe adversária (sem leitura por atleta). */
export function PanelOpponent({ teamName, onRecord }: PanelOpponentProps) {
  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">
        Registro da equipe adversária{" "}
        <span className="font-medium text-slate-400">(registro geral)</span>
      </h3>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {BUTTONS.map((b) => {
          const Icon = b.icon
          return (
            <button
              key={b.kind}
              type="button"
              onClick={() => onRecord(b.kind)}
              className={`flex min-h-20 touch-manipulation select-none flex-col items-center justify-center gap-1.5 rounded-xl border py-3 text-center transition-all active:scale-95 ${b.className}`}
            >
              <Icon className="size-6" aria-hidden="true" />
              <span className="px-1 text-[11px] font-bold uppercase leading-tight tracking-wide">
                {b.label}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
        <Info className="size-3.5 shrink-0" aria-hidden="true" />
        Registro geral de {teamName}. Não é feita leitura detalhada dos atletas.
      </p>
    </section>
  )
}
