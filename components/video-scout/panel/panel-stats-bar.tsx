"use client"

import { FileBarChart } from "lucide-react"

interface PanelStatsBarProps {
  pontosA: number
  pontosB: number
  saquesA: number
  saquesB: number
  errosA: number
  errosB: number
  transicoes: number
  onReport: () => void
}

function Stat({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex flex-col items-center justify-center px-2 text-center">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  )
}

export function PanelStatsBar({
  pontosA,
  pontosB,
  saquesA,
  saquesB,
  errosA,
  errosB,
  transicoes,
  onReport,
}: PanelStatsBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-orange-100 bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Stat label="Pontos A" value={pontosA} color="text-blue-600" />
        <Stat label="Pontos B" value={pontosB} color="text-pink-600" />
        <Stat label="Saques A" value={saquesA} color="text-sky-600" />
        <Stat label="Saques B" value={saquesB} color="text-fuchsia-600" />
        <Stat label="Erros A" value={errosA} color="text-teal-600" />
        <Stat label="Erros B" value={errosB} color="text-red-600" />
        <Stat label="Transições" value={transicoes} color="text-orange-600" />
      </div>
      <button
        type="button"
        onClick={onReport}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <FileBarChart className="h-4 w-4 text-orange-600" aria-hidden="true" />
        Relatório da Partida
      </button>
    </div>
  )
}
