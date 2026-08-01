"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import {
  Upload,
  Users,
  Trophy,
  Activity,
  FolderOpen,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Shield,
} from "lucide-react"
import { listAthletes, listAllEntries, listImports } from "@/lib/hub/data"
import { buildChapters, overallTrend } from "@/lib/hub/aggregate"
import { computeIPTV } from "@/lib/hub/intelligence"
import { aggregateFundamentals } from "@/lib/hub/stats"
import { VOLLEY_MODULES } from "@/lib/hub/modules"
import { getStoredUser } from "@/lib/auth"
import { HubCard, EmptyState, TrendBadge } from "./ui"
import type { HubAthlete, HubHistoryEntry, HubImport } from "@/lib/hub/types"

async function loadDashboard() {
  const [athletes, entries, imports] = await Promise.all([
    listAthletes(),
    listAllEntries(),
    listImports(100),
  ])
  return { athletes, entries, imports }
}

const ALL = "__all__"

export function HubDashboard() {
  const router = useRouter()
  const { data, isLoading } = useSWR("hub-dashboard", loadDashboard)
  const [firstName, setFirstName] = useState("Treinador")
  const [season, setSeason] = useState<string>(ALL)
  const [team, setTeam] = useState<string>(ALL)

  useEffect(() => {
    const u = getStoredUser()
    const name = u?.name || u?.email?.split("@")[0]
    if (name) setFirstName(name.split(" ")[0])
  }, [])

  const athletes: HubAthlete[] = data?.athletes ?? []
  const entries: HubHistoryEntry[] = data?.entries ?? []
  const imports: HubImport[] = data?.imports ?? []

  const seasons = useMemo(
    () => Array.from(new Set(entries.map((e) => e.season).filter(Boolean))).sort().reverse() as string[],
    [entries],
  )
  const teams = useMemo(
    () => Array.from(new Set(entries.map((e) => e.team).filter(Boolean))).sort() as string[],
    [entries],
  )

  const filtered = useMemo(
    () =>
      entries.filter(
        (e) => (season === ALL || e.season === season) && (team === ALL || e.team === team),
      ),
    [entries, season, team],
  )

  // KPIs
  const competicoes = useMemo(
    () => new Set(filtered.map((e) => e.competition).filter(Boolean)).size,
    [filtered],
  )

  // IPTV médio da equipe (média do último capítulo de cada atleta no recorte).
  const athletesInScope = useMemo(() => {
    const ids = new Set(filtered.map((e) => e.athlete_id).filter(Boolean) as string[])
    return athletes.filter((a) => ids.has(a.id))
  }, [athletes, filtered])

  const iptvMedio = useMemo(() => {
    const vals: number[] = []
    for (const a of athletesInScope) {
      const chapters = buildChapters(filtered.filter((e) => e.athlete_id === a.id))
      if (chapters.length) vals.push(chapters[chapters.length - 1].iptv)
    }
    if (!vals.length) return 0
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
  }, [athletesInScope, filtered])

  // Atletas em destaque (por IPTV do último capítulo).
  const highlights = useMemo(() => {
    return athletesInScope
      .map((a) => {
        const chapters = buildChapters(filtered.filter((e) => e.athlete_id === a.id))
        const last = chapters[chapters.length - 1]
        const { trend } = overallTrend(chapters)
        return { athlete: a, iptv: last?.iptv ?? 0, trend }
      })
      .sort((x, y) => y.iptv - x.iptv)
      .slice(0, 3)
  }, [athletesInScope, filtered])

  // Linha do tempo: IPTV médio por temporada.
  const timeline = useMemo(() => {
    const bySeason = new Map<string, HubHistoryEntry[]>()
    for (const e of filtered) {
      const key = e.season || "—"
      if (!bySeason.has(key)) bySeason.set(key, [])
      bySeason.get(key)!.push(e)
    }
    return Array.from(bySeason.entries())
      .map(([s, list]) => ({ season: s, iptv: computeIPTV(aggregateFundamentals(list.map((e) => e.stats))) }))
      .sort((a, b) => a.season.localeCompare(b.season))
  }, [filtered])

  const recentImports = imports.slice(0, 3)

  const kpis = [
    { label: "Atletas", value: athletes.length, icon: Users },
    { label: "Competições", value: competicoes, icon: Trophy },
    { label: "Scouts registrados", value: filtered.length, icon: Activity },
    { label: "IPTV médio da equipe", value: iptvMedio, icon: ArrowUpRight, accent: true },
    { label: "Históricos importados", value: imports.length, icon: FolderOpen },
  ]

  return (
    <div>
      {/* Cabeçalho de boas-vindas + seletores */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Bem-vindo ao <span className="text-[var(--hub-accent)]">Volley Tech</span>, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-[var(--hub-muted)]">
            Sua central de inteligência e histórico no voleibol.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface)] px-3 py-2 text-sm">
            <Calendar className="h-4 w-4 text-[var(--hub-muted)]" />
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="bg-transparent text-[var(--hub-text)] outline-none"
              aria-label="Temporada"
            >
              <option value={ALL}>Todas as temporadas</option>
              {seasons.map((s) => (
                <option key={s} value={s}>
                  Temporada {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface)] px-3 py-2 text-sm">
            <Shield className="h-4 w-4 text-[var(--hub-muted)]" />
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="bg-transparent text-[var(--hub-text)] outline-none"
              aria-label="Equipe"
            >
              <option value={ALL}>Todas as equipes</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div
              key={k.label}
              className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface)] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    k.accent ? "bg-[var(--hub-accent)]/15" : "bg-[var(--hub-bg-deep)]"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${k.accent ? "text-[var(--hub-accent)]" : "text-[var(--hub-muted)]"}`} />
                </span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{k.value}</p>
              <p className="mt-0.5 text-xs text-[var(--hub-muted)]">{k.label}</p>
            </div>
          )
        })}
      </div>

      {/* Módulos Volley Tech */}
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-lg font-semibold tracking-tight">
          Módulos <span className="text-[var(--hub-accent)]">Volley Tech</span>
        </h2>
      </div>
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {VOLLEY_MODULES.map((m, i) => (
          <Link
            key={m.key}
            href={m.href}
            className="group overflow-hidden rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface)] transition-colors hover:border-[var(--hub-accent)]"
          >
            <div className="relative h-32 overflow-hidden">
              <img
                src={m.image || "/placeholder.svg"}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--hub-surface)] via-[var(--hub-surface)]/30 to-transparent" />
              <span className="absolute left-3 top-3 rounded-md bg-black/50 px-2 py-0.5 font-mono text-xs text-white backdrop-blur">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-emerald-300 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                On-line
              </span>
            </div>
            <div className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: m.accent }}>
                {m.tag}
              </p>
              <h3 className="mt-1 font-semibold tracking-tight">{m.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--hub-muted)]">
                {m.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.features.map((f) => (
                  <span
                    key={f}
                    className="rounded-md bg-[var(--hub-bg-deep)] px-2 py-0.5 text-[10px] text-[var(--hub-muted)]"
                  >
                    {f}
                  </span>
                ))}
              </div>
              <span className="mt-3 flex items-center gap-1 text-sm font-medium text-[var(--hub-accent)]">
                Abrir módulo
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Seções inferiores */}
      {isLoading ? (
        <p className="text-sm text-[var(--hub-muted)]">Carregando…</p>
      ) : entries.length === 0 ? (
        <EmptyState
          title="Nenhum histórico ainda"
          description="Importe scouts do Scout Volleyball, do Scout View IA ou um arquivo .vha para começar a construir a linha do tempo das atletas."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Últimas importações */}
          <HubCard onClick={() => router.push("/volley-hub/historico")}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-[var(--hub-accent)]" />
                <h3 className="font-semibold">Últimas importações</h3>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--hub-muted)]" />
            </div>
            {recentImports.length === 0 ? (
              <p className="text-sm text-[var(--hub-muted)]">Sem importações registradas.</p>
            ) : (
              <ul className="space-y-2">
                {recentImports.map((imp) => (
                  <li key={imp.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-[var(--hub-text)]">{imp.label || imp.kind}</span>
                    <span className="ml-2 shrink-0 text-xs text-[var(--hub-muted)]">
                      {imp.entries_count} reg.
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </HubCard>

          {/* Linha do tempo — visão geral */}
          <HubCard onClick={() => router.push("/volley-hub/linha-do-tempo")}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--hub-accent)]" />
                <h3 className="font-semibold">Linha do tempo</h3>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--hub-muted)]" />
            </div>
            {timeline.length === 0 ? (
              <p className="text-sm text-[var(--hub-muted)]">Sem temporadas no recorte.</p>
            ) : (
              <ul className="space-y-2.5">
                {timeline.map((t) => (
                  <li key={t.season} className="flex items-center gap-3 text-sm">
                    <span className="w-14 shrink-0 text-[var(--hub-muted)]">{t.season}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--hub-bg-deep)]">
                      <div
                        className="h-full rounded-full bg-[var(--hub-accent)]"
                        style={{ width: `${Math.min(100, t.iptv)}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right font-semibold tabular-nums">{t.iptv}</span>
                  </li>
                ))}
              </ul>
            )}
          </HubCard>

          {/* Atletas em destaque */}
          <HubCard onClick={() => router.push("/volley-hub/iptv-atleta")}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--hub-accent)]" />
                <h3 className="font-semibold">Atletas em destaque</h3>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--hub-muted)]" />
            </div>
            {highlights.length === 0 ? (
              <p className="text-sm text-[var(--hub-muted)]">Sem atletas no recorte selecionado.</p>
            ) : (
              <ul className="space-y-3">
                {highlights.map((h) => (
                  <li key={h.athlete.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--hub-text)]">
                        {h.athlete.full_name}
                      </p>
                      <p className="truncate text-xs text-[var(--hub-muted)]">
                        {[h.athlete.position, h.athlete.category].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold tabular-nums text-[var(--hub-accent)]">{h.iptv}</span>
                      <TrendBadge trend={h.trend} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </HubCard>
        </div>
      )}

      {/* Banner */}
      <div className="relative mt-8 overflow-hidden rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface)] p-6 sm:p-8">
        <img
          src="/images/hub-volley-hub.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-right opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--hub-surface)] via-[var(--hub-surface)]/85 to-transparent" />
        <div className="relative max-w-lg">
          <h3 className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">
            Dados que <span className="text-[var(--hub-accent)]">transformam</span> desempenho.
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--hub-muted)]">
            Acompanhe a evolução das atletas e equipes ao longo do tempo e tome decisões baseadas em dados
            reais e inteligentes.
          </p>
          <Link
            href="/volley-hub/relatorios"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--hub-accent)] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Ver relatórios completos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
