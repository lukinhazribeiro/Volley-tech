"use client"

import { useMemo } from "react"
import { computePlayerMetrics, type ActionEvent, type ActionPlayer } from "@/lib/scout-action/types"

/**
 * Planilha do Scout Action: por atleta, apenas TG, TP, TE e TGP — sem
 * detalhamento por fundamento (o IPTV bruto acompanha como referência).
 */
export function ActionSpreadsheet({
  players,
  events,
  teamName,
}: {
  players: ActionPlayer[]
  events: ActionEvent[]
  teamName: string
}) {
  const rows = useMemo(
    () =>
      players
        .map((p) => ({ player: p, m: computePlayerMetrics(events, "A", p.number) }))
        .sort((a, b) => b.m.tgp - a.m.tgp),
    [players, events],
  )

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.tg += r.m.tg
        acc.tp += r.m.tp
        acc.te += r.m.te
        return acc
      },
      { tg: 0, tp: 0, te: 0 },
    )
  }, [rows])

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/70">
      <div className="border-b border-slate-700 px-3 py-2">
        <p className="text-xs font-semibold text-white">{teamName}</p>
        <p className="text-[11px] text-slate-400">Planilha simplificada — TG, TP, TE e TGP</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900/60 text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2 text-left font-medium">Atleta</th>
              <th className="px-2 py-2 text-center font-medium" title="Total Great (pontos)">TG</th>
              <th className="px-2 py-2 text-center font-medium" title="Total de ações positivas (participação)">TP</th>
              <th className="px-2 py-2 text-center font-medium" title="Total de erros">TE</th>
              <th className="px-2 py-2 text-center font-medium" title="Total Great Percentage">TGP</th>
              <th className="px-2 py-2 text-center font-medium" title="Índice bruto TP/(TP+TE)">IPTV</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ player, m }) => (
              <tr key={player.number} className="border-t border-slate-700/60">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-700 text-[11px] font-bold text-white">
                      {player.number}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-white">{player.name}</span>
                      <span className="block text-[10px] text-slate-500">{player.role}</span>
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2 text-center font-semibold text-emerald-400">{m.tg}</td>
                <td className="px-2 py-2 text-center text-slate-200">{m.tp}</td>
                <td className="px-2 py-2 text-center text-red-400">{m.te}</td>
                <td className="px-2 py-2 text-center font-bold text-cyan-300">{m.tgp}</td>
                <td className="px-2 py-2 text-center text-slate-300">{m.iptv}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                  Nenhuma ação registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-600 bg-slate-900/60 text-xs">
                <td className="px-3 py-2 font-medium text-slate-300">Total</td>
                <td className="px-2 py-2 text-center font-semibold text-emerald-400">{totals.tg}</td>
                <td className="px-2 py-2 text-center text-slate-200">{totals.tp}</td>
                <td className="px-2 py-2 text-center text-red-400">{totals.te}</td>
                <td className="px-2 py-2 text-center text-slate-500">—</td>
                <td className="px-2 py-2 text-center text-slate-500">—</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
