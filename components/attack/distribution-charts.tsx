"use client"

import { useEffect, useState } from "react"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts"
import {
  setPositions,
  attackTypeLabels,
  attackLineColors,
  positionLabels,
  type SetPosition,
  type AttackType,
} from "@/lib/attack/volley-stats"

function ChartTooltip({
  active,
  payload,
  suffix = "",
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; payload?: { name?: string; fill?: string } }>
  suffix?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0]
  const label = item.payload?.name ?? item.name
  return (
    <div className="rounded-lg border border-orange-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-slate-800">{label}</p>
      <p className="text-xs text-orange-600 font-semibold">
        {item.value} {suffix}
      </p>
    </div>
  )
}

/** Radar com o perfil de distribuição de levantamentos por posição. */
export function PositionRadarChart({
  positions,
  color = "#f97316",
}: {
  positions: Record<string, number>
  color?: string
}) {
  const data = setPositions.map((p) => ({
    position: p.label,
    value: positions[p.value] || 0,
  }))
  const hasData = data.some((d) => d.value > 0)
  if (!hasData) return <p className="text-sm text-slate-400 text-center py-8">Sem dados de levantamento</p>

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="#fed7aa" />
          <PolarAngleAxis dataKey="position" tick={{ fontSize: 12, fill: "#475569", fontWeight: 600 }} />
          <Radar
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.35}
            isAnimationActive
            dot={{ r: 3, fill: color }}
          />
          <Tooltip content={<ChartTooltip suffix="levantamentos" />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Donut com a proporção dos tipos de ataque. */
export function AttackDonutChart({ attacks }: { attacks: Record<string, number> }) {
  const data = Object.entries(attacks)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      name: attackTypeLabels[k as AttackType] ?? k,
      value: v,
      fill: attackLineColors[k as AttackType] ?? "#f59e0b",
    }))
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) return <p className="text-sm text-slate-400 text-center py-8">Sem dados de ataque</p>

  const total = data.reduce((acc, d) => acc + d.value, 0)

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
              isAnimationActive
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip suffix="ataques" />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-xs text-slate-500">ataques</span>
        </div>
      </div>
      <div className="flex-1 w-full space-y-2">
        {data.map((entry) => {
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0
          return (
            <div key={entry.name} className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: entry.fill }} />
              <span className="flex-1 text-sm text-slate-700 truncate">{entry.name}</span>
              <span className="text-sm font-semibold text-slate-900">{entry.value}</span>
              <span className="w-10 text-right text-xs text-slate-400">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Barras verticais com a incidência de levantamentos por posição (visão agregada). */
export function PositionBarChart({ positions }: { positions: Record<string, number> }) {
  const data = setPositions
    .map((p) => ({ name: p.label, value: positions[p.value as SetPosition] || 0 }))
    .filter((d) => d.value > 0)

  if (data.length === 0) return <p className="text-sm text-slate-400 text-center py-8">Sem dados de levantamento</p>

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={32} />
          <Tooltip cursor={{ fill: "#fff7ed" }} content={<ChartTooltip suffix="levantamentos" />} />
          <Bar dataKey="value" fill="#f97316" radius={[6, 6, 0, 0]} isAnimationActive>
            <LabelList dataKey="value" position="top" className="fill-slate-600" fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Barras horizontais agrupadas comparando a distribuição de dois levantadores por posição. */
export function SetterComparisonChart({
  l1Name,
  l2Name,
  l1Positions,
  l2Positions,
  l1Total,
  l2Total,
}: {
  l1Name: string
  l2Name: string
  l1Positions: Record<string, number>
  l2Positions: Record<string, number>
  l1Total: number
  l2Total: number
}) {
  const L1_COLOR = "#3b82f6"
  const L2_COLOR = "#f59e0b"

  // Garante que o ResponsiveContainer só monte após o layout estar pronto.
  // Evita o bug de medição (width -1) quando a aba da equipe é exibida.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const data = setPositions
    .map((p) => {
      const c1 = l1Positions[p.value] || 0
      const c2 = l2Positions[p.value] || 0
      return {
        name: p.label,
        l1: l1Total > 0 ? Math.round((c1 / l1Total) * 100) : 0,
        l2: l2Total > 0 ? Math.round((c2 / l2Total) * 100) : 0,
        c1,
        c2,
      }
    })
    .filter((d) => d.c1 > 0 || d.c2 > 0)

  if (data.length === 0) return <p className="text-sm text-slate-400 text-center py-6">Sem dados para comparar</p>

  return (
    <div>
      <div className="mb-2 flex items-center justify-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: L1_COLOR }} />
          <span className="font-medium text-slate-600">{l1Name}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: L2_COLOR }} />
          <span className="font-medium text-slate-600">{l2Name}</span>
        </span>
      </div>
      <div style={{ height: data.length * 56 + 24 }} className="w-full">
        {ready && (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 36, left: 8, bottom: 4 }}
            barCategoryGap="22%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              unit="%"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: "#475569", fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              width={70}
            />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null
                const row = payload[0].payload as { name: string; l1: number; l2: number; c1: number; c2: number }
                return (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
                    <p className="mb-1 text-xs font-bold text-slate-800">{row.name}</p>
                    <p className="text-xs font-semibold" style={{ color: L1_COLOR }}>
                      {l1Name}: {row.l1}% ({row.c1})
                    </p>
                    <p className="text-xs font-semibold" style={{ color: L2_COLOR }}>
                      {l2Name}: {row.l2}% ({row.c2})
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="l1" name={l1Name} fill={L1_COLOR} radius={[0, 4, 4, 0]} isAnimationActive>
              <LabelList dataKey="l1" position="right" formatter={(v) => `${v}%`} className="fill-slate-500" fontSize={10} />
            </Bar>
            <Bar dataKey="l2" name={l2Name} fill={L2_COLOR} radius={[0, 4, 4, 0]} isAnimationActive>
              <LabelList dataKey="l2" position="right" formatter={(v) => `${v}%`} className="fill-slate-500" fontSize={10} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export { positionLabels }
