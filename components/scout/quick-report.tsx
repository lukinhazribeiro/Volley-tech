"use client"

import { useMemo, useState } from "react"
import type { MatchAction } from "@/lib/scout/match-parser"
import { calculatePlayerStats } from "@/lib/scout/player-stats"

interface QuickReportProps {
  actions: MatchAction[]
  teamAName: string
  teamBName: string
}

export default function QuickReport({ actions, teamAName, teamBName }: QuickReportProps) {
  const [team, setTeam] = useState<"A" | "B">("A")

  const stats = useMemo(() => calculatePlayerStats(actions, team), [actions, team])

  const totals = useMemo(() => {
    return stats.reduce(
      (acc, s) => {
        acc.tp += s.tp
        acc.te += s.te
        acc.serve += s.serve.certo + s.serve.ace
        acc.attack += s.attack.ponto + s.attack.certo
        acc.block += s.block.O + s.block.P + s.block.M + s.block.FS
        acc.defense += s.defense.D + s.defense.V + s.defense.R
        acc.reception += s.reception.A + s.reception.B + s.reception.C
        return acc
      },
      { tp: 0, te: 0, serve: 0, attack: 0, block: 0, defense: 0, reception: 0 },
    )
  }, [stats])

  const teamName = team === "A" ? teamAName : teamBName

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Sub-abas de equipe */}
      <div className="mb-5 flex gap-2">
        {(["A", "B"] as const).map((t) => {
          const active = team === t
          const name = t === "A" ? teamAName : teamBName
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTeam(t)}
              aria-pressed={active}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors sm:text-base ${
                active
                  ? "border-orange-600 bg-orange-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-700"
              }`}
            >
              {name || `Equipe ${t}`}
            </button>
          )
        })}
      </div>

      {/* Cartões de resumo da equipe */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total Participações" value={totals.tp} accent="orange" />
        <SummaryCard label="Total Erros" value={totals.te} accent="red" />
        <SummaryCard label="Ataques certos" value={totals.attack} accent="blue" />
        <SummaryCard label="Bloqueios" value={totals.block} accent="indigo" />
      </div>

      {/* Tabela resumida por jogador */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">{`Resumo — ${teamName || `Equipe ${team}`}`}</h3>
          <span className="text-xs text-slate-500">{stats.length} jogadores com ações</span>
        </div>

        {stats.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Nenhuma ação registrada para esta equipe ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-semibold">Nº</th>
                  <th className="px-3 py-2 font-semibold">Recep.</th>
                  <th className="px-3 py-2 font-semibold">Saque</th>
                  <th className="px-3 py-2 font-semibold">Ataque</th>
                  <th className="px-3 py-2 font-semibold">Bloq.</th>
                  <th className="px-3 py-2 font-semibold">Defesa</th>
                  <th className="px-3 py-2 text-center font-semibold text-orange-700">TP</th>
                  <th className="px-3 py-2 text-center font-semibold text-red-600">TE</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-800">TGP%</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.number} className="border-b border-slate-50 last:border-0 hover:bg-orange-50/40">
                    <td className="px-3 py-2 font-bold text-slate-800">{s.number}</td>
                    <td className="px-3 py-2 text-slate-600">{s.reception.A + s.reception.B + s.reception.C}</td>
                    <td className="px-3 py-2 text-slate-600">{s.serve.certo + s.serve.ace}</td>
                    <td className="px-3 py-2 text-slate-600">{s.attack.ponto + s.attack.certo}</td>
                    <td className="px-3 py-2 text-slate-600">{s.block.O + s.block.P + s.block.M + s.block.FS}</td>
                    <td className="px-3 py-2 text-slate-600">{s.defense.D + s.defense.V + s.defense.R}</td>
                    <td className="px-3 py-2 text-center font-bold text-orange-700">{s.tp}</td>
                    <td className="px-3 py-2 text-center font-semibold text-red-600">{s.te}</td>
                    <td className="px-3 py-2 text-center font-bold text-slate-800">{s.tgp}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        <strong>TP</strong> = total de participações (todas as ações exceto erros). <strong>TE</strong> = total de
        erros. <strong>TGP%</strong> = participação do atleta em relação ao placar da própria equipe.
      </p>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: "orange" | "red" | "blue" | "indigo"
}) {
  const accentMap: Record<string, string> = {
    orange: "text-orange-700",
    red: "text-red-600",
    blue: "text-blue-700",
    indigo: "text-indigo-700",
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accentMap[accent]}`}>{value}</p>
    </div>
  )
}
