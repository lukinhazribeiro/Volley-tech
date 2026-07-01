"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowUpRight } from "lucide-react"

interface AppCardProps {
  index: number
  title: string
  subtitle: string
  description: string
  href: string
  icon: LucideIcon
  features: string[]
  status: string
}

export function AppCard({
  index,
  title,
  subtitle,
  description,
  href,
  icon: Icon,
  features,
  status,
}: AppCardProps) {
  return (
    <Link
      href={href}
      aria-label={`Abrir ${title}`}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface)] p-6 transition-all duration-300 hover:border-[var(--hub-accent)]/60 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[var(--hub-accent)]/10 active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--hub-bg)]"
    >
      {/* glow on hover */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[var(--hub-accent)] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20" />

      {/* top row: index + status */}
      <div className="mb-6 flex items-center justify-between">
        <span className="font-mono text-xs tracking-widest text-[var(--hub-muted)]">
          {String(index).padStart(2, "0")}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-[var(--hub-border)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--hub-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--hub-accent)] hub-pulse-glow" />
          {status}
        </span>
      </div>

      {/* icon */}
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--hub-accent)] to-[var(--hub-accent-strong,#c2410c)] text-[var(--hub-bg-deep)] shadow-lg shadow-[var(--hub-accent)]/30 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[var(--hub-accent)]/50">
        <Icon className="h-8 w-8" strokeWidth={2.25} />
        <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
      </div>

      {/* text */}
      <div className="mb-5">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-[var(--hub-accent)]">{subtitle}</p>
        <h3 className="text-xl font-semibold text-[var(--hub-text)]">{title}</h3>
        <p className="mt-2 min-h-[3.75rem] text-sm leading-relaxed text-[var(--hub-muted)] text-pretty">
          {description}
        </p>
      </div>

      {/* features */}
      <div className="mb-6 flex min-h-[2rem] flex-wrap content-start gap-2">
        {features.map((f) => (
          <span
            key={f}
            className="rounded-md border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] px-2 py-1 text-[11px] text-[var(--hub-muted)]"
          >
            {f}
          </span>
        ))}
      </div>

      {/* footer CTA */}
      <div className="mt-auto border-t border-[var(--hub-border)] pt-4">
        <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--hub-accent)] px-4 py-3 text-sm font-semibold text-[var(--hub-bg-deep)] shadow-lg shadow-[var(--hub-accent)]/20 transition-all duration-300 group-hover:shadow-[var(--hub-accent)]/40 group-hover:brightness-110 group-active:scale-[0.98]">
          Abrir aplicativo
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  )
}
