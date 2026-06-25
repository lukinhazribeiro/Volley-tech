"use client"

import { FUNDAMENTO_LABEL } from "@/lib/video-scout/types"
import type { FundamentoBreakdown } from "@/lib/video-scout/stats"

interface ScoutChartsProps {
  breakdowns: FundamentoBreakdown[]
}

function pctOf(value: number, total: number) {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
}

function FundamentoCard({ data }: { data: FundamentoBreakdown }) {
  const total = data.total
  const visible = data.segments.filter((s) => s.value > 0)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-center text-sm font-bold uppercase tracking-wide text-slate-700">
        {FUNDAMENTO_LABEL[data.fundamento]}
      </h4>

      {/* Barra segmentada colorida */}
      <div className="flex h-11 w-full gap-1">
        {total === 0 ? (
          <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-100 text-xs font-medium text-slate-400">
            Sem ações
          </div>
        ) : (
          visible.map((s) => {
            const pct = pctOf(s.value, total)
            return (
              <div
                key={s.key}
                className="flex h-full items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
                title={`${s.label}: ${s.value} (${pct}%)`}
              >
                {pct >= 12 ? `${pct}%` : ""}
              </div>
            )
          })
        )}
      </div>

      {/* Caixinhas (uma por categoria do fundamento) */}
      <div
        className="mt-4 grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.min(data.segments.length, 3)}, minmax(0, 1fr))`,
        }}
      >
        {data.segments.map((s) => {
          const pct = pctOf(s.value, total)
          return (
            <div
              key={s.key}
              className="flex flex-col items-center rounded-xl border px-2 py-3"
              style={{ borderColor: `${s.color}55`, background: `${s.color}12` }}
            >
              <span className="text-center text-[11px] font-semibold uppercase leading-tight tracking-wide text-slate-500">
                {s.label}
              </span>
              <span className="mt-1 text-2xl font-extrabold tabular-nums" style={{ color: s.color }}>
                {s.value}
              </span>
              <span className="text-xs font-semibold tabular-nums" style={{ color: s.color }}>
                {pct}%
              </span>
            </div>
          )
        })}
      </div>

      {/* Total */}
      <div className="mt-4 border-t border-slate-100 pt-3 text-center text-sm text-slate-500">
        Total: <span className="font-bold text-slate-700">{total} ações</span>
      </div>
    </div>
  )
}

export function ScoutCharts({ breakdowns }: ScoutChartsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {breakdowns.map((data) => (
        <FundamentoCard key={data.fundamento} data={data} />
      ))}
    </div>
  )
}
