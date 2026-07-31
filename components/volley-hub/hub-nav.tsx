"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users2,
  User,
  GitBranch,
  History,
  FileText,
  ArrowLeft,
  BrainCircuit,
} from "lucide-react"

const items = [
  { href: "/volley-hub", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/volley-hub/iptv-equipe", label: "IPTV Equipe", icon: Users2 },
  { href: "/volley-hub/iptv-atleta", label: "IPTV Atleta", icon: User },
  { href: "/volley-hub/linha-do-tempo", label: "Linha do Tempo", icon: GitBranch },
  { href: "/volley-hub/historico", label: "Histórico", icon: History },
  { href: "/volley-hub/relatorios", label: "Relatórios", icon: FileText },
]

export function HubNav() {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--hub-border)] bg-[var(--hub-bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full border border-[var(--hub-border)] px-3 py-1.5 text-xs text-[var(--hub-muted)] transition-colors hover:border-[var(--hub-accent)] hover:text-[var(--hub-text)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Hub
        </Link>

        <div className="mr-2 flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-[var(--hub-accent)]" />
          <span className="font-semibold tracking-tight">Volley Hub</span>
        </div>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {items.map((item) => {
            const active = isActive(item.href, item.exact)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-[var(--hub-accent)] text-black"
                    : "text-[var(--hub-muted)] hover:bg-[var(--hub-surface)] hover:text-[var(--hub-text)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
