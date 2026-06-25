"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Activity, Target, ClipboardCheck, Zap, LogOut, ShieldCheck } from "lucide-react"
import { AppCard } from "@/components/hub/app-card"
import { TrialBanner } from "@/components/hub/trial-banner"
import { VolleyTechLogo } from "@/components/hub/volley-tech-logo"
import { clearStoredUser, getStoredUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/client"
import { isAdminEmail } from "@/lib/subscription"

const apps = [
  {
    title: "Scout Volleyball",
    subtitle: "Análise de desempenho",
    description: "Registro e análise de scout das partidas e fundamentos do time em tempo real.",
    href: "/scout-volleyball",
    icon: Activity,
    status: "Online",
    features: ["Tempo real", "Por fundamento", "Sincronização"],
  },
  {
    title: "Attack Position",
    subtitle: "Inteligência tática",
    description: "Mapeamento de posições e zonas de ataque na quadra com coletor por fases.",
    href: "/attack-position",
    icon: Target,
    status: "Online",
    features: ["Quadra interativa", "Coletor por fases", "Exportar PDF"],
  },
  {
    title: "Summary Game",
    subtitle: "Súmula digital",
    description: "Resumo e estatísticas consolidadas de cada jogo em uma súmula profissional.",
    href: "/summary-game",
    icon: ClipboardCheck,
    status: "Online",
    features: ["Súmula digital", "Estatísticas", "Relatório"],
  },
]

const ticker = [
  "Scout em tempo real",
  "Mapas de calor de ataque",
  "Súmula digital",
  "Exportação em PDF",
  "Análise por fundamento",
  "Coletor por fases",
  "Sincronização entre telas",
]

export default function HubPage() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsAdmin(isAdminEmail(getStoredUser()?.email))
  }, [])

  return (
    <main className="hub-theme relative min-h-screen overflow-hidden bg-[var(--hub-bg)] text-[var(--hub-text)]">
      {/* background grid + glow */}
      <div className="pointer-events-none absolute inset-0 hub-grid" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-[-10rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[var(--hub-accent)] opacity-25 blur-[120px] hub-pulse-glow"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-6xl px-6">
        {/* top bar */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <VolleyTechLogo className="h-9 w-9 text-[var(--hub-accent)]" />
            <span className="text-sm font-semibold tracking-tight">VOLLEY TECH</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-full border border-[var(--hub-border)] px-3 py-1.5 text-xs text-[var(--hub-muted)] transition-colors hover:border-[var(--hub-border-strong)] hover:text-[var(--hub-text)]"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin
              </Link>
            )}
            <button
              onClick={async () => {
                try {
                  await createClient().auth.signOut()
                } catch {
                  // ignora erro de signOut
                }
                clearStoredUser()
                window.location.reload()
              }}
              className="flex items-center gap-2 rounded-full border border-[var(--hub-border)] px-3 py-1.5 text-xs text-[var(--hub-muted)] transition-colors hover:border-[var(--hub-border-strong)] hover:text-[var(--hub-text)]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </header>

        {/* hero */}
        <section className="flex flex-col items-center py-16 text-center sm:py-24">
          <VolleyTechLogo className="mb-5 h-24 w-24 text-[var(--hub-accent)] drop-shadow-[0_0_24px_var(--hub-accent-soft)] hub-float sm:h-28 sm:w-28" />
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--hub-border)] bg-[var(--hub-surface)] px-4 py-1.5 text-xs font-medium text-[var(--hub-muted)]">
            <Zap className="h-3.5 w-3.5 text-[var(--hub-accent)]" />
            Plataforma de tecnologia para voleibol
          </span>
          <h1 className="max-w-4xl text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Sua central de <span className="text-[var(--hub-accent)]">performance</span> no voleibol
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-[var(--hub-muted)] sm:text-lg">
            A plataforma que conecta e transforma dados em decisões vencedoras.
          </p>
        </section>

        {/* ticker */}
        <div className="relative mb-16 overflow-hidden rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface)]/60 py-3">
          <div className="flex w-max hub-ticker gap-10 whitespace-nowrap">
            {[...ticker, ...ticker].map((item, i) => (
              <span key={i} className="flex items-center gap-2 text-sm text-[var(--hub-muted)]">
                <span className="h-1 w-1 rounded-full bg-[var(--hub-accent)]" />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* convite de assinatura durante o trial */}
        <TrialBanner />

        {/* apps grid */}
        <section className="pb-20">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[var(--hub-accent)]">Aplicativos</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Selecione um módulo</h2>
            </div>
            <span className="hidden text-sm text-[var(--hub-muted)] sm:block">{apps.length} disponíveis</span>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {apps.map((app, i) => (
              <AppCard key={app.href} index={i + 1} {...app} />
            ))}
          </div>
        </section>

        {/* footer */}
        <footer className="border-t border-[var(--hub-border)] py-8 text-center text-xs text-[var(--hub-muted)]">
          Volleyball Tech — cada aplicativo opera de forma independente
        </footer>
      </div>
    </main>
  )
}
