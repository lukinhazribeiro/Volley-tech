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
  image: string
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
  image,
}: AppCardProps) {
  return (
    <Link
      href={href}
      aria-label={`Abrir ${title}`}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface)] transition-all duration-300 hover:border-[var(--hub-accent)]/60 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[var(--hub-accent)]/10 active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--hub-bg)]"
    >
      {/* media header */}
      <div className="relative h-40 w-full overflow-hidden">
        <img
          src={image || "/placeholder.svg"}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--hub-surface)] via-[var(--hub-surface)]/40 to-transparent" />

        {/* index */}
        <span className="absolute left-4 top-4 font-mono text-sm font-semibold tracking-widest text-white/90">
          {String(index).padStart(2, "0")}
        </span>

        {/* status */}
        <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white/90 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 hub-pulse-glow" />
          {status}
        </span>

        {/* icon */}
        <div className="absolute -bottom-6 left-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--hub-accent)] to-[var(--hub-accent-strong,#c2410c)] text-[var(--hub-bg-deep)] shadow-lg shadow-[var(--hub-accent)]/30 transition-all duration-300 group-hover:scale-105">
          <Icon className="h-7 w-7" strokeWidth={2.25} />
          <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-6 pt-9">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-[var(--hub-accent)]">{subtitle}</p>
        <h3 className="text-xl font-semibold text-[var(--hub-text)]">{title}</h3>
        <p className="mt-2 min-h-[3.75rem] text-sm leading-relaxed text-[var(--hub-muted)] text-pretty">
          {description}
        </p>

        {/* features */}
        <div className="mb-6 mt-4 flex min-h-[2rem] flex-wrap content-start gap-2">
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
        <div className="mt-auto">
          <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--hub-accent)] px-4 py-3 text-sm font-semibold text-[var(--hub-bg-deep)] shadow-lg shadow-[var(--hub-accent)]/20 transition-all duration-300 group-hover:shadow-[var(--hub-accent)]/40 group-hover:brightness-110 group-active:scale-[0.98]">
            Abrir aplicativo
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
