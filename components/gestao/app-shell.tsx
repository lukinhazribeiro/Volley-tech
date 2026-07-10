"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Volleyball, Menu, Search, Bell, ChevronDown, PanelLeftClose, PanelLeftOpen, X } from "lucide-react"
import { nav } from "@/lib/nav"
import { cn } from "@/lib/utils"

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href))

  const NavList = ({ compact }: { compact: boolean }) => (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
      {nav.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            title={compact ? item.label : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
              compact && "justify-center px-0",
              active
                ? "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/25"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!compact && (
              <>
                <span className="flex flex-col items-start leading-tight text-left">
                  {item.label}
                  {item.hint && (
                    <span className={cn("text-[10px]", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {item.hint}
                    </span>
                  )}
                </span>
                {item.badge && (
                  <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Link>
        )
      })}
    </nav>
  )

  const Brand = ({ compact }: { compact: boolean }) => (
    <div className={cn("flex items-center gap-3 px-6 py-6", compact && "justify-center px-0")}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
        <Volleyball className="h-6 w-6" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-lg font-extrabold tracking-tight text-sidebar-foreground">
            VOLLEY<span className="text-primary">TECH</span>
          </p>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Gestão de Clube</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar desktop (cortina recolhível) */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-in-out lg:flex",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <Brand compact={collapsed} />
        <NavList compact={collapsed} />
        {!collapsed && (
          <div className="m-3 overflow-hidden rounded-xl border border-sidebar-border bg-gradient-to-br from-sidebar-accent to-sidebar p-4">
            <p className="text-sm font-extrabold leading-tight text-sidebar-foreground">
              DOMINE O JOGO,
              <br />
              <span className="text-primary">GERENCIE O FUTURO!</span>
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">Plataforma completa para o seu clube crescer.</p>
          </div>
        )}
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex items-center justify-between pr-3">
              <Brand compact={false} />
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-card text-foreground"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList compact={false} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-col gap-4 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-card text-foreground lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden h-10 w-10 items-center justify-center rounded-lg bg-card text-foreground transition-colors hover:bg-secondary lg:flex"
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-balance">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar por atleta, turma, CPF..."
                className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground transition-colors hover:bg-secondary"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                8
              </span>
            </button>

            <button className="flex items-center gap-2 rounded-full bg-card px-2 py-1.5 pr-3 text-left transition-colors hover:bg-secondary">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                LM
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-sm font-semibold">Lucas Mendes</span>
                <span className="block text-xs text-muted-foreground">Administrador</span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {action}
          </div>
        </header>

        <main className="flex-1 space-y-6 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
