"use client"

import { Users, UserCheck, UserX, CircleDollarSign, AlertCircle } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer } from "recharts"

const icons = {
  Users,
  UserCheck,
  UserX,
  CircleDollarSign,
  AlertCircle,
} as const

export type StatIcon = keyof typeof icons

type Tone = "primary" | "success" | "destructive" | "info" | "chart-5"

const toneMap: Record<Tone, string> = {
  primary: "var(--color-primary)",
  success: "var(--color-success)",
  destructive: "var(--color-destructive)",
  info: "var(--color-info)",
  "chart-5": "var(--color-chart-5)",
}

function Ring({ percent, color }: { percent: number; color: string }) {
  const r = 22
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(percent, 100) / 100) * c
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{percent}%</span>
    </div>
  )
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  tone = "primary",
  percent,
  data,
  variant = "area",
}: {
  title: string
  value: string
  subtitle?: string
  icon: StatIcon
  tone?: Tone
  percent?: number
  data: number[]
  variant?: "area" | "bar"
}) {
  const Icon = icons[icon]
  const color = toneMap[tone]
  const chartData = data.map((v, i) => ({ i, v }))

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/20 transition-all hover:border-primary/40 hover:shadow-primary/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: `color-mix(in oklch, ${color} 18%, transparent)`, color }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {percent !== undefined && <Ring percent={percent} color={color} />}
      </div>

      <div className="mt-3 h-12 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {variant === "area" ? (
            <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#grad-${title})`} />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <Bar dataKey="v" fill={color} radius={[2, 2, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
