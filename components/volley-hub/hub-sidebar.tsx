"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Activity,
  Target,
  ClipboardCheck,
  Video,
  Users,
  GitBranch,
  History,
  User,
  Users2,
  FileText,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  ExternalLink,
  type LucideIcon,
} from "lucide-react"
import { VolleyTechLogo } from "@/components/hub/volley-tech-logo"
import { VOLLEY_MODULES } from "@/lib/hub/modules"
import { clearStoredUser, getStoredUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/client"
import { isAdminEmail } from "@/lib/subscription"

const MODULE_ICONS: Record<string, LucideIcon> = {
  "scout-volleyball": Activity,
  "attack-position": Target,
  "summary-game": ClipboardCheck,
  "scout-video": Video,
  gestao: Users,
}

const hubItems: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/volley-hub/linha-do-tempo", label: "Linha do Tempo", icon: GitBranch },
  { href: "/volley-hub/historico", label: "Históricos", icon: History },
  { href: "/volley-hub/iptv-atleta", label: "IPTV Atleta", icon: User },
  { href: "/volley-hub/iptv-equipe", label: "IPTV Equipe", icon: Users2 },
  { href: "/volley-hub/relatorios", label: "Relatórios", icon: FileText },
]

export function HubSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState("Treinador")
  const [isAdmin, setIsAdmin] = useState(false)

  // Fecha a cortina ao navegar (mobile).
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    const u = getStoredUser()
    setDisplayName(u?.name || u?.email?.split("@")[0] || "Treinador")
    setIsAdmin(isAdminEmail(u?.email))
  }, [])

  async function handleSignOut() {
    try {
      await createClient().auth.signOut()
    } catch {
      // ignora erro de signOut
    }
    clearStoredUser()
    window.location.assign("/")
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")

  return (
    <>
      {/* Barra superior (apenas mobile): abre a cortina */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--hub-border)] bg-[var(--hub-bg)]/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg border border-[var(--hub-border)] p-2 text-[var(--hub-text)] hover:border-[var(--hub-accent)]"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <VolleyTechLogo className="h-6 w-6" />
          <span className="font-semibold tracking-tight">
            Volley <span className="text-[var(--hub-accent)]">Tech</span>
          </span>
        </div>
      </header>

      {/* Overlay da cortina (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Cortina / barra lateral */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[var(--hub-border)] bg-[var(--hub-bg-deep)] transition-transform duration-300 lg:w-64 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo + fechar (mobile) */}
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <Link href="/" className="flex items-center gap-2.5">
            <VolleyTechLogo className="h-10 w-10" />
            <span className="leading-tight">
              <span className="block font-bold tracking-tight">
                VOLLEY <span className="text-[var(--hub-accent)]">TECH</span>
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-[var(--hub-muted)]">
                Centro de inteligência
              </span>
            </span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-[var(--hub-muted)] hover:text-[var(--hub-text)] lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {/* Dashboard (página inicial do Hub) */}
          <Link
            href="/"
            className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive("/", true)
                ? "bg-[var(--hub-accent)] text-black"
                : "text-[var(--hub-muted)] hover:bg-[var(--hub-surface)] hover:text-[var(--hub-text)]"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

          {/* Módulos Volley Tech (aponta para os módulos existentes) */}
          <p className="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-widest text-[var(--hub-muted)]">
            Módulos
          </p>
          {VOLLEY_MODULES.map((m) => {
            const Icon = MODULE_ICONS[m.key] ?? Activity
            return (
              <Link
                key={m.key}
                href={m.href}
                className="group mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--hub-muted)] transition-colors hover:bg-[var(--hub-surface)] hover:text-[var(--hub-text)]"
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 truncate">{m.title}</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
              </Link>
            )
          })}

          {/* Funções do Hub */}
          <p className="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-widest text-[var(--hub-muted)]">
            Hub
          </p>
          {hubItems.map((item) => {
            const active = isActive(item.href, item.exact)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-[var(--hub-accent)] text-black font-medium"
                    : "text-[var(--hub-muted)] hover:bg-[var(--hub-surface)] hover:text-[var(--hub-text)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}

          {/* Conta */}
          <p className="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-widest text-[var(--hub-muted)]">
            Conta
          </p>
          {isAdmin && (
            <Link
              href="/admin"
              className="mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--hub-muted)] transition-colors hover:bg-[var(--hub-surface)] hover:text-[var(--hub-text)]"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[var(--hub-muted)] transition-colors hover:bg-[var(--hub-surface)] hover:text-[var(--hub-text)]"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </nav>

        {/* Identidade do usuário */}
        <div className="border-t border-[var(--hub-border)] p-4">
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--hub-accent)]/15 text-sm font-semibold text-[var(--hub-accent)]">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--hub-text)]">{displayName}</p>
              <p className="text-xs text-[var(--hub-muted)]">Treinador</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
