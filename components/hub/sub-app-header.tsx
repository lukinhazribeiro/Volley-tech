import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export function SubAppHeader({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Hub
      </Link>
      <span className="text-sm font-semibold text-foreground">{title}</span>
    </header>
  )
}
