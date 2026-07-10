import type { ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/20",
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-bold tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function VerTodos({ href = "#", label = "Ver todos" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="text-xs font-semibold text-primary hover:underline">
      {label}
    </Link>
  )
}
