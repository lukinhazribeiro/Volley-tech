"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users2,
  User,
  GitBranch,
  History,
  FileText,
  BarChart3,
  Menu,
  X,
  Home,
  Activity,
  Target,
  ClipboardCheck,
  Video,
  Users,
} from "lucide-react"

// Módulos externos da Volley Tech (o Hub apenas aponta para eles; cada um opera
// de forma independente).
const modules = [
  { href: "/scout-volleyball", label: "Scout Volleyball", icon: Activity },
  { href: "/attack-position", label: "Attack Position", icon: Target },
  { href: "/summary-game", label: "Summary Game", icon: ClipboardCheck },
  { href: "/scout-video", label: "Scout View IA", icon: Video },
  { href: "/gestao", label: "Gestão de Clube", icon: Users },
]

// Páginas internas do Volley Hub.
const hubItems = [
  { href: "/volley-hub", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/volley-hub/linha-do-tempo", label: "Linha do Tempo", icon: GitBranch },
  { href: "/volley-hub/historico", label: "Históricos", icon: History },
  { href: "/volley-hub/iptv-atleta", label: "IPTV Atleta", icon: User },
  { href: "/volley-hub/iptv-equipe", label: "IPTV Equipe", icon: Users2 },
  { href: "/volley-hub/relatorios", label: "Relatórios", icon: FileText },
]

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {/* HUB */}
      <div>
        <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-widest text-[var(--hub-muted)]">Hub</p>
        <ul className="space-y-1">
          {hubItems.map((item) => {
            const active = isActive(item.href, item.exact)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[var(--hub-accent)] text-black"
                      : "text-[var(--hub-muted)] hover:bg-[var(--hub-surface)] hover:text-[var(--hub-text)]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* MÓDULOS */}
      <div>
        <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-widest text-[var(--hub-muted)]">
          Módulos
        </p>
        <ul className="space-y-1">
          {modules.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--hub-muted)] transition-colors hover:bg-[var(--hub-surface)] hover:text-[var(--hub-text)]"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* CONFIGURAÇÕES */}
      <div className="mt-auto">
        <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-widest text-[var(--hub-muted)]">
          Configurações
        </p>
        <ul className="space-y-1">
          <li>
            <Link
              href="/"
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--hub-muted)] transition-colors hover:bg-[var(--hub-surface)] hover:text-[var(--hub-text)]"
            >
              <Home className="h-4 w-4 shrink-0" />
              Voltar ao Hub principal
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}

function SidebarBrand() {
  return (
    <Link href="/volley-hub" className="flex items-center gap-2.5 px-5 py-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--hub-accent)] text-black">
        <BarChart3 className="h-5 w-5" />
      </span>
      <span className="leading-none">
        <span className="block text-base font-bold tracking-tight">
          VOLLEY <span className="text-[var(--hub-accent)]">HUB</span>
        </span>
        <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--hub-muted)]">
          Centro de inteligência
        </span>
      </span>
    </Link>
  )
}

export function HubShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen lg:flex">
      {/* ===== Sidebar fixa no desktop ===== */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--hub-border)] bg-[var(--hub-bg-deep)] lg:flex lg:h-screen lg:sticky lg:top-0">
        <SidebarBrand />
        <NavList />
      </aside>

      {/* ===== Drawer / cortina no mobile ===== */}
      {/* overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      {/* painel deslizante */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85%] flex-col border-r border-[var(--hub-border)] bg-[var(--hub-bg-deep)] shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between pr-3">
          <SidebarBrand />
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-[var(--hub-muted)] transition-colors hover:bg-[var(--hub-surface)] hover:text-[var(--hub-text)]"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <NavList onNavigate={() => setOpen(false)} />
      </aside>

      {/* ===== Conteúdo ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* topbar mobile com botão da cortina */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--hub-border)] bg-[var(--hub-bg)]/85 px-4 py-3 backdrop-blur-md lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg border border-[var(--hub-border)] p-2 text-[var(--hub-text)] transition-colors hover:border-[var(--hub-accent)]"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold tracking-tight">
            VOLLEY <span className="text-[var(--hub-accent)]">HUB</span>
          </span>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
