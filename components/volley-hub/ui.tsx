"use client"

import type { ReactNode } from "react"
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react"
import type { Trend } from "@/lib/hub/stats"

export function HubCard({
  children,
  className = "",
  onClick,
  title,
  description,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  title?: ReactNode
  description?: string
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface)] p-5 ${
        onClick ? "cursor-pointer transition-colors hover:border-[var(--hub-accent)]" : ""
      } ${className}`}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-base font-semibold tracking-tight text-[var(--hub-text)]">{title}</h3>}
          {description && <p className="mt-0.5 text-sm text-[var(--hub-muted)]">{description}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

export function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mb-4">
      {eyebrow && (
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--hub-accent)]">{eyebrow}</p>
      )}
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--hub-text)]">{title}</h2>
    </div>
  )
}

const TREND_MAP = {
  up: { icon: ArrowUpRight, label: "Evoluiu", cls: "text-emerald-400 bg-emerald-400/10" },
  stable: { icon: ArrowRight, label: "Estável", cls: "text-amber-400 bg-amber-400/10" },
  down: { icon: ArrowDownRight, label: "Caiu", cls: "text-red-400 bg-red-400/10" },
}

export function TrendBadge({ trend }: { trend: Trend }) {
  const { icon: Icon, label, cls } = TREND_MAP[trend]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--hub-border)] bg-[var(--hub-surface)]/50 p-8 text-center">
      <p className="font-medium text-[var(--hub-text)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--hub-muted)]">{description}</p>
    </div>
  )
}

export function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-[var(--hub-muted)]">{label}</span>
        <span className="font-semibold text-[var(--hub-text)]">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--hub-bg-deep)]">
        <div
          className="h-full rounded-full bg-[var(--hub-accent)]"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}

/** Linha de indicador de evolução: fundamento, percentual, barra e tendência. */
export function EvolutionRow({
  label,
  percent,
  trend,
  hint,
}: {
  label: string
  percent: number
  trend: Trend
  hint?: string
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="w-28 shrink-0">
        <p className="text-sm font-medium text-[var(--hub-text)]">{label}</p>
        {hint && <p className="text-xs text-[var(--hub-muted)]">{hint}</p>}
      </div>
      <div className="flex-1">
        <div className="h-2 overflow-hidden rounded-full bg-[var(--hub-bg-deep)]">
          <div
            className="h-full rounded-full bg-[var(--hub-accent)]"
            style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
          />
        </div>
      </div>
      <span className="w-12 shrink-0 text-right text-sm font-semibold text-[var(--hub-text)]">{percent}%</span>
      <div className="w-24 shrink-0 text-right">
        <TrendBadge trend={trend} />
      </div>
    </div>
  )
}

/** Selo do índice IPTV (0-100) com rótulo e tendência opcional. */
export function IptvBadge({ value, trend, label = "IPTV" }: { value: number; trend?: Trend; label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] px-4 py-2">
      <div className="text-right">
        <p className="text-xs uppercase tracking-wide text-[var(--hub-muted)]">{label}</p>
        {trend && <TrendBadge trend={trend} />}
      </div>
      <span className="text-3xl font-bold tabular-nums text-[var(--hub-accent)]">{value}</span>
    </div>
  )
}
