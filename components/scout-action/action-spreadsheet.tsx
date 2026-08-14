"use client"

import { useMemo, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toStoredTeam, type LiveState } from "@/lib/scout-action/live"
import {
  computeMatchStats,
  matchTotals,
  type ActionMatch,
  type ActionSide,
} from "@/lib/scout-action/types"

interface ActionSpreadsheetProps {
  live: LiveState
  category: string
  competition: string
  onBack: () => void
}

/** Planilha por equipe (A/B): TG, TP, TE, T, TGP%, IPTV%. */
export function ActionSpreadsheet({ live, category, competition, onBack }: ActionSpreadsheetProps) {
  const [side, setSide] = useState<ActionSide>("A")

  const match = useMemo<ActionMatch>(
    () =>
      ({
        id: "live",
        category,
        competition,
        teamA: toStoredTeam(live.teamA),
        teamB: toStoredTeam(live.teamB),
        events: live.events,
        setScores: live.setScores,
        setsA: 0,
        setsB: 0,
        createdAt: new Date().toISOString(),
        completedAt: null,
        winner: null,
      }) as ActionMatch,
    [live, category, competition],
  )

  const rows = computeMatchStats(match, side).sort((a, b) => b.tp - a.tp)
  const totals = matchTotals(match, side)
  const nameA = live.teamA.name || "Equipe A"
  const nameB = live.teamB.name || "Equipe B"

  return (
    <div className="min-h-svh bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-3 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="size-4" />
            Voltar ao painel
          </button>
          <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-300">
            Planilha
          </span>
        </div>

        {/* Seletor de equipe */}
        <div className="grid grid-cols-2 gap-2">
          {(["A", "B"] as ActionSide[]).map((s) => {
            const active = side === s
            const name = s === "A" ? nameA : nameB
            const activeCls =
              s === "A"
                ? "border-sky-400 bg-sky-500/20 text-sky-200"
                : "border-orange-400 bg-orange-500/20 text-orange-200"
            return (
              <Button
                key={s}
                onClick={() => setSide(s)}
                variant="outline"
                className={[
                  "gap-1.5 border font-bold",
                  active
                    ? activeCls
                    : "border-slate-700 bg-slate-900 text-slate-400 hover:text-white",
                ].join(" ")}
              >
                {s} · <span className="truncate">{name}</span>
              </Button>
            )
          })}
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Atleta</th>
                <th className="px-2 py-2 text-left">Função</th>
                <th className="px-2 py-2 text-center" title="Total Great (pontos)">
                  TG
                </th>
                <th className="px-2 py-2 text-center" title="Participações (ações + pontos)">
                  TP
                </th>
                <th className="px-2 py-2 text-center" title="Erros">
                  TE
                </th>
                <th className="px-2 py-2 text-center" title="Total = TP + TE">
                  T
                </th>
                <th className="px-2 py-2 text-center">TGP%</th>
                <th className="px-2 py-2 text-center" title="Índice bruto TP/(TP+TE)">
                  IPTV%
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-800/60">
                  <td className="px-3 py-2 font-bold tabular-nums text-white">{r.number}</td>
                  <td className="max-w-[140px] truncate px-3 py-2 text-slate-200">
                    {r.name || <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-2 py-2 text-[11px] uppercase text-slate-400">{r.position}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-emerald-300">{r.tg}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-sky-300">{r.tp}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-red-300">{r.te}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-slate-300">{r.t}</td>
                  <td className="px-2 py-2 text-center font-bold tabular-nums text-amber-300">
                    {r.tgp}
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums text-slate-300">{r.iptv}</td>
                </tr>
              ))}
              {rows.every((r) => r.t === 0) && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-sm text-slate-500">
                    Nenhuma ação registrada nesta equipe ainda.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-800/60 font-bold text-white">
                <td className="px-3 py-2" colSpan={3}>
                  Total da equipe
                </td>
                <td className="px-2 py-2 text-center tabular-nums text-emerald-300">{totals.tg}</td>
                <td className="px-2 py-2 text-center tabular-nums text-sky-300">{totals.tp}</td>
                <td className="px-2 py-2 text-center tabular-nums text-red-300">{totals.te}</td>
                <td className="px-2 py-2 text-center tabular-nums">{totals.t}</td>
                <td className="px-2 py-2 text-center tabular-nums text-amber-300">{totals.tgp}</td>
                <td className="px-2 py-2 text-center tabular-nums">{totals.iptv}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="text-center text-[11px] text-slate-500">
          TG = pontos · TP = participações (ações + pontos) · TE = erros · T = TP + TE · TGP e IPTV
          usam o mesmo cálculo do sistema.
        </p>
      </div>
    </div>
  )
}
